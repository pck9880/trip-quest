const PROFILE_KEY='tq_profile_v1';
const AVATAR_DB='trip_quest_user_v1';
const AVATAR_STORE='profile_assets';
const AVATAR_KEY='avatar';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}

function defaultStorage(){
  try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}
}

function defaultRandomBytes(size=6){
  const out=new Uint8Array(size);
  if(globalThis.crypto?.getRandomValues)return globalThis.crypto.getRandomValues(out);
  for(let i=0;i<size;i++)out[i]=Math.floor(Math.random()*256);
  return out;
}

export function generateTemporaryId(randomBytes=defaultRandomBytes){
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes=randomBytes(6);
  let suffix='';
  for(let i=0;i<6;i++)suffix+=alphabet[bytes[i]%alphabet.length];
  return 'TQ-'+suffix;
}

export function createProfileService(storage=defaultStorage(),randomBytes=defaultRandomBytes){
  function readRaw(){
    try{return JSON.parse(storage.getItem(PROFILE_KEY)||'null')}catch{return null}
  }
  function write(profile){
    try{storage.setItem(PROFILE_KEY,JSON.stringify(profile))}catch{}
    return profile;
  }
  function ensure(){
    const current=readRaw();
    if(current?.temporaryId)return current;
    return write({
      version:1,
      nickname:'여행자',
      temporaryId:generateTemporaryId(randomBytes),
      accountId:null,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString()
    });
  }
  function update(patch={}){
    const current=ensure();
    const next={
      ...current,
      ...patch,
      temporaryId:current.temporaryId,
      accountId:current.accountId||null,
      updatedAt:new Date().toISOString()
    };
    if(typeof next.nickname!=='string'||!next.nickname.trim())next.nickname='여행자';
    next.nickname=next.nickname.trim().slice(0,20);
    write(next);
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'){
      window.dispatchEvent(new CustomEvent('tripquest:profile-change',{detail:{profile:next}}));
    }
    return next;
  }
  return {get:ensure,update,key:PROFILE_KEY};
}

function openAvatarDb(){
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB){reject(new Error('이 브라우저에서는 프로필 이미지 저장을 지원하지 않습니다.'));return}
    const request=indexedDB.open(AVATAR_DB,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(AVATAR_STORE))db.createObjectStore(AVATAR_STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('프로필 이미지 저장소를 열지 못했습니다.'));
  });
}

async function avatarTransaction(mode,action){
  const db=await openAvatarDb();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(AVATAR_STORE,mode);
      const store=tx.objectStore(AVATAR_STORE);
      const request=action(store);
      request.onsuccess=()=>resolve(request.result||null);
      request.onerror=()=>reject(request.error||new Error('프로필 이미지 처리에 실패했습니다.'));
    });
  }finally{db.close()}
}

export async function saveProfileAvatar(file){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('이미지 파일을 선택해주세요.');
  if(Number(file.size)>12*1024*1024)throw new Error('프로필 이미지는 12MB 이하로 선택해주세요.');
  await avatarTransaction('readwrite',store=>store.put(file,AVATAR_KEY));
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:profile-avatar-change'));
  return true;
}

export async function getProfileAvatar(){
  try{return await avatarTransaction('readonly',store=>store.get(AVATAR_KEY))}catch{return null}
}

export async function removeProfileAvatar(){
  try{await avatarTransaction('readwrite',store=>store.delete(AVATAR_KEY))}catch{}
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:profile-avatar-change'));
}

export const profileService=createProfileService();

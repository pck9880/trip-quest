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
  function importData(data={}){
    const current=ensure();
    const next={
      version:1,
      nickname:String(data.nickname||'여행자').trim().slice(0,20)||'여행자',
      temporaryId:String(data.temporaryId||current.temporaryId),
      accountId:data.accountId||null,
      createdAt:data.createdAt||current.createdAt||new Date().toISOString(),
      updatedAt:new Date().toISOString()
    };
    write(next);
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function')window.dispatchEvent(new CustomEvent('tripquest:profile-change',{detail:{profile:next}}));
    return next;
  }
  function clear(){try{storage.removeItem(PROFILE_KEY)}catch{}return ensure()}
  return {get:ensure,update,importData,clear,exportData:()=>ensure(),key:PROFILE_KEY};
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

export async function compressProfileAvatar(file,{size=512,quality=.84}={}){
  if(!file||!String(file.type||'').startsWith('image/'))throw new Error('이미지 파일을 선택해주세요.');
  if(Number(file.size)>12*1024*1024)throw new Error('프로필 이미지는 12MB 이하로 선택해주세요.');
  if(typeof document==='undefined')return file;
  let source=null,revoke='';
  try{
    if(typeof createImageBitmap==='function')source=await createImageBitmap(file);
    else source=await new Promise((resolve,reject)=>{
      const img=new Image();revoke=URL.createObjectURL(file);
      img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('프로필 이미지를 읽지 못했습니다.'));img.src=revoke;
    });
    const width=Number(source.width||source.naturalWidth)||1,height=Number(source.height||source.naturalHeight)||1,side=Math.min(width,height);
    const canvas=document.createElement('canvas');canvas.width=size;canvas.height=size;
    const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('프로필 이미지 처리에 실패했습니다.');
    ctx.drawImage(source,(width-side)/2,(height-side)/2,side,side,0,0,size,size);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
    return blob||file;
  }finally{
    if(typeof source?.close==='function')source.close();
    if(revoke)URL.revokeObjectURL(revoke);
  }
}

export async function saveProfileAvatar(file){
  const compressed=await compressProfileAvatar(file);
  await avatarTransaction('readwrite',store=>store.put(compressed,AVATAR_KEY));
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:profile-avatar-change'));
  return compressed;
}

export async function getProfileAvatar(){
  try{return await avatarTransaction('readonly',store=>store.get(AVATAR_KEY))}catch{return null}
}

export async function removeProfileAvatar(){
  try{await avatarTransaction('readwrite',store=>store.delete(AVATAR_KEY))}catch{}
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:profile-avatar-change'));
}

export const profileService=createProfileService();

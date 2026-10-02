const CONSENT_KEY='tq_location_consent_v1';
export const LOCATION_CONSENT_VERSION='2026-10-02';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function defaultStorage(){try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}}

export function createLocationConsentService(storage=defaultStorage(),clock=()=>new Date()){
  function read(){
    try{return JSON.parse(storage.getItem(CONSENT_KEY)||'null')}catch{return null}
  }
  function status(){
    const item=read();
    const agreed=!!(item?.agreed&&item.version===LOCATION_CONSENT_VERSION);
    return {agreed,version:item?.version||null,agreedAt:item?.agreedAt||null,revokedAt:item?.revokedAt||null,purpose:item?.purpose||null};
  }
  function agree(){
    const value={agreed:true,version:LOCATION_CONSENT_VERSION,purpose:'quest-gps-checkpoint-verification',agreedAt:clock().toISOString(),revokedAt:null};
    try{storage.setItem(CONSENT_KEY,JSON.stringify(value))}catch{}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:location-consent-change',{detail:value}));
    return status();
  }
  function revoke(){
    const current=read()||{};
    const value={...current,agreed:false,version:LOCATION_CONSENT_VERSION,revokedAt:clock().toISOString()};
    try{storage.setItem(CONSENT_KEY,JSON.stringify(value))}catch{}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:location-consent-change',{detail:value}));
    return status();
  }
  return {status,agree,revoke,isAgreed:()=>status().agreed,key:CONSENT_KEY,version:LOCATION_CONSENT_VERSION};
}

export const locationConsentService=createLocationConsentService();

const CONSENT_KEY='tq_location_consent_v1';
export const LOCATION_CONSENT_VERSION='2026-10-02-course-quest-v2';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function defaultStorage(){try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}}

export function createLocationConsentService(storage=defaultStorage(),clock=()=>new Date()){
  function read(){try{return JSON.parse(storage.getItem(CONSENT_KEY)||'null')}catch{return null}}
  function status(){
    const item=read();
    const agreed=!!(item?.agreed&&item.version===LOCATION_CONSENT_VERSION);
    const enabled=!!(agreed&&item?.enabled);
    return {agreed,enabled,version:item?.version||null,agreedAt:item?.agreedAt||null,disabledAt:item?.disabledAt||null,purpose:item?.purpose||null};
  }
  function enable(){
    const now=clock().toISOString();
    const value={agreed:true,enabled:true,version:LOCATION_CONSENT_VERSION,purpose:'trip-location-and-course-quest-verification',agreedAt:read()?.agreedAt||now,enabledAt:now,disabledAt:null};
    try{storage.setItem(CONSENT_KEY,JSON.stringify(value))}catch{}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:location-consent-change',{detail:status()}));
    return status();
  }
  function disable(){
    const current=read()||{};
    const value={...current,agreed:!!current.agreed,enabled:false,version:LOCATION_CONSENT_VERSION,disabledAt:clock().toISOString()};
    try{storage.setItem(CONSENT_KEY,JSON.stringify(value))}catch{}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:location-consent-change',{detail:status()}));
    return status();
  }
  function revoke(){
    const value={agreed:false,enabled:false,version:LOCATION_CONSENT_VERSION,purpose:'trip-location-and-course-quest-verification',disabledAt:clock().toISOString()};
    try{storage.setItem(CONSENT_KEY,JSON.stringify(value))}catch{}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:location-consent-change',{detail:status()}));
    return status();
  }
  return {
    status,enable,disable,revoke,
    agree:enable,
    isAgreed:()=>status().agreed,
    isEnabled:()=>status().enabled,
    key:CONSENT_KEY,version:LOCATION_CONSENT_VERSION
  };
}

export const locationConsentService=createLocationConsentService();

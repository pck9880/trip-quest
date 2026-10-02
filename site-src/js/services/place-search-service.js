import { localGeocode } from './geocoding.js';
import { geoKm } from '../domain/geo.js';

export const SEARCH_MODE_CONFIGS={
  travel:{id:'travel',label:'여행지',categoryCode:'AT4',placeholder:'예: 조용한 바다, 힙한 동네, 전시 보러 가고 싶어',button:'여행지 찾기',radiusKm:null},
  cafe:{id:'cafe',label:'카페',categoryCode:'CE7',placeholder:'예: 조용한 카페, 로스터리, 디저트 카페',button:'카페 찾기',radiusKm:2},
  food:{id:'food',label:'맛집',categoryCode:'FD6',placeholder:'예: 돼지국밥, 혼밥, 고기집, 점심',button:'맛집 찾기',radiusKm:2}
};

function safeMode(mode){return SEARCH_MODE_CONFIGS[mode]?mode:'travel'}
function cleanText(value){return String(value||'').replace(/\s+/g,' ').trim()}
function approxViewbox(center,radiusKm){
  const lat=Number(center?.lat),lng=Number(center?.lng),km=Math.max(.3,Math.min(20,Number(radiusKm)||2));
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
  const latDelta=km/111;
  const lngDelta=km/(111*Math.max(.25,Math.cos(lat*Math.PI/180)));
  return [lng-lngDelta,lat+latDelta,lng+lngDelta,lat-latDelta].join(',');
}
function dedupe(items=[]){
  const seen=new Set();
  return items.filter(item=>{
    const key=`${String(item.name||'').toLowerCase()}|${Number(item.lat).toFixed(5)}|${Number(item.lng).toFixed(5)}`;
    if(seen.has(key))return false;
    seen.add(key);return true;
  });
}
function normalizePlace(item,mode,center,source='OpenStreetMap / Nominatim'){
  const lat=Number(item.lat),lng=Number(item.lng);
  const validCenter=Number.isFinite(Number(center?.lat))&&Number.isFinite(Number(center?.lng));
  return {
    id:item.place_id?String(item.place_id):`osm-${lat}-${lng}`,
    provider:'osm',
    source,
    name:cleanText(item.display_name||item.name||'장소').split(',')[0],
    type:mode,
    category:SEARCH_MODE_CONFIGS[safeMode(mode)].label,
    address:cleanText(item.display_name||item.address||''),
    roadAddress:'',
    lat,lng,
    distanceKm:validCenter&&Number.isFinite(lat)&&Number.isFinite(lng)?geoKm(center,{lat,lng}):null,
    phone:'',
    detailUrl:Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`:'',
    rawType:item.type||item.addresstype||'',
    importance:Number(item.importance)||0
  };
}

export function createPlaceSearchService({fetchRef=globalThis.fetch}={}){
  function modeConfig(mode){return SEARCH_MODE_CONFIGS[safeMode(mode)]}
  function providerPlan(mode){
    const selected=safeMode(mode);
    return {
      mode:selected,
      primary:selected==='travel'?'TourAPI + Kakao Local secure proxy':'Kakao Local secure proxy',
      secondary:selected==='travel'?'TRIP QUEST local data':'Naver Local optional',
      fallback:'OpenStreetMap / Nominatim',
      secureProxyConnected:false
    };
  }

  async function resolveRegion(query){
    const q=cleanText(query);
    if(!q)return [];
    const items=await localGeocode(q);
    return items.map((item,index)=>({
      id:`region-${index}-${Number(item.lat).toFixed(5)}-${Number(item.lng).toFixed(5)}`,
      name:cleanText(item.name||q),
      address:cleanText(item.address||item.name||q),
      lat:Number(item.lat),
      lng:Number(item.lng),
      provider:item.provider||'osm'
    })).filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lng));
  }

  async function searchPlaces({mode='travel',query='',region=null,radiusKm=2}={}){
    const selected=safeMode(mode);
    if(selected==='travel')return {items:[],source:'TRIP QUEST recommendation engine',providerPlan:providerPlan(selected)};
    const cfg=modeConfig(selected),center=region;
    if(!center||!Number.isFinite(Number(center.lat))||!Number.isFinite(Number(center.lng)))throw new Error('검색할 지역 또는 현재 위치를 먼저 선택해주세요.');

    const userQuery=cleanText(query);
    const keyword=userQuery||cfg.label;
    const regionText=cleanText(center.address||center.name||'');
    const params=new URLSearchParams({
      q:cleanText([keyword,regionText].filter(Boolean).join(' ')),
      format:'jsonv2',
      limit:'15',
      countrycodes:'kr',
      'accept-language':'ko'
    });
    const viewbox=approxViewbox(center,radiusKm);
    if(viewbox){params.set('viewbox',viewbox);params.set('bounded','1')}

    let rows=[];
    try{
      const response=await fetchRef(`https://nominatim.openstreetmap.org/search?${params.toString()}`,{headers:{Accept:'application/json'}});
      if(response.ok)rows=await response.json();
    }catch{}

    if(!rows.length&&userQuery){
      const retry=new URLSearchParams(params);
      retry.set('q',cleanText([cfg.label,regionText].filter(Boolean).join(' ')));
      try{
        const response=await fetchRef(`https://nominatim.openstreetmap.org/search?${retry.toString()}`,{headers:{Accept:'application/json'}});
        if(response.ok)rows=await response.json();
      }catch{}
    }

    const items=dedupe((rows||[]).map(row=>normalizePlace(row,selected,center)))
      .filter(item=>Number.isFinite(item.lat)&&Number.isFinite(item.lng))
      .filter(item=>!Number.isFinite(item.distanceKm)||item.distanceKm<=Math.max(1,Number(radiusKm)||2)*1.35)
      .sort((a,b)=>(a.distanceKm??999)-(b.distanceKm??999)||b.importance-a.importance)
      .slice(0,12);

    return {
      items,
      source:'OpenStreetMap fallback · Kakao Local secure proxy 연결 전',
      providerPlan:providerPlan(selected),
      fallback:true
    };
  }

  return {modeConfig,providerPlan,resolveRegion,searchPlaces};
}

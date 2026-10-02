import { localGeocode } from './geocoding.js';
import { geoKm } from '../domain/geo.js';

export const SEARCH_MODE_CONFIGS={
  travel:{id:'travel',code:'TRIP',label:'여행지',categoryCode:'AT4',placeholder:'예: 부산에서 바다 보이는 카페, 조용한 바다, 힙한 동네',button:'TRIP SEARCH',distance:{min:0,max:400,step:50,defaultMin:0,defaultMax:100}},
  cafe:{id:'cafe',code:'CAFE',label:'카페',categoryCode:'CE7',placeholder:'예: 로스터리, 디저트 카페, 작업하기 좋은 카페',button:'CAFE SEARCH',distance:{min:0,max:20,step:.5,defaultMin:0,defaultMax:2}},
  food:{id:'food',code:'FOOD',label:'맛집',categoryCode:'FD6',placeholder:'예: 돼지국밥, 파스타, 혼밥, 고기집',button:'FOOD SEARCH',distance:{min:0,max:20,step:.5,defaultMin:0,defaultMax:2}}
};

export const MOOD_OPTIONS={
  cafe:['조용한','감성','디저트','뷰','로스터리','작업','데이트','대형'],
  food:['로컬','혼밥','가성비','분위기','데이트','가족','야식','웨이팅']
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
  const lat=Number(item.lat),lng=Number(item.lng??item.lon);
  const validCenter=Number.isFinite(Number(center?.lat))&&Number.isFinite(Number(center?.lng));
  return {
    id:item.place_id?String(item.place_id):`osm-${lat}-${lng}`,
    provider:item.provider||'osm',
    source,
    name:cleanText(item.display_name||item.name||'장소').split(',')[0],
    type:mode,
    category:item.categoryLabel||SEARCH_MODE_CONFIGS[safeMode(mode)].label,
    address:cleanText(item.display_name||item.address||''),
    roadAddress:cleanText(item.roadAddress||''),
    lat,lng,
    distanceKm:validCenter&&Number.isFinite(lat)&&Number.isFinite(lng)?geoKm(center,{lat,lng}):null,
    phone:item.phone||'',
    detailUrl:item.detailUrl||(Number.isFinite(lat)&&Number.isFinite(lng)?`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`:''),
    rawType:item.type||item.addresstype||'',
    importance:Number(item.importance)||0,
    rating:Number.isFinite(Number(item.rating))?Number(item.rating):null,
    reviewCount:Number.isFinite(Number(item.reviewCount))?Number(item.reviewCount):null,
    reviewSource:item.reviewSource||null
  };
}
function termMatchScore(text,terms=[]){
  const hay=cleanText(text).toLowerCase();
  return terms.reduce((score,term)=>score+(term&&hay.includes(String(term).toLowerCase())?1:0),0);
}
function rankPlace(item,{query='',moods=[],radiusKm=2}={}){
  const text=[item.name,item.address,item.category,item.rawType].filter(Boolean).join(' ');
  const moodMatches=moods.filter(m=>termMatchScore(text,[m])>0);
  const keywordTerms=cleanText(query).split(' ').filter(x=>x.length>1);
  const keywordMatches=termMatchScore(text,keywordTerms);
  const radius=Math.max(.5,Number(radiusKm)||2);
  const distance=Number(item.distanceKm);
  const distanceScore=Number.isFinite(distance)?Math.max(0,28*(1-Math.min(distance,radius)/radius)):0;
  const keywordScore=Math.min(18,keywordMatches*6);
  const moodScore=Math.min(18,moodMatches.length*9);
  const sourceScore=Math.min(12,Math.max(0,Number(item.importance)||0)*12);
  const reviews=Number(item.reviewCount);
  const rating=Number(item.rating);
  const reviewScore=Number.isFinite(reviews)&&reviews>0?Math.min(16,Math.log10(reviews+1)*6):0;
  const ratingScore=Number.isFinite(rating)&&rating>0?Math.min(8,rating/5*8):0;
  const score=Math.round((distanceScore+keywordScore+moodScore+sourceScore+reviewScore+ratingScore)*10)/10;
  return {
    ...item,
    moodMatches,
    popularityScore:score,
    rankingBasis:Number.isFinite(reviews)&&reviews>0?'review+rating+distance+keyword+mood':'distance+keyword+mood+source'
  };
}

export function createPlaceSearchService({fetchRef=globalThis.fetch}={}){
  function modeConfig(mode){return SEARCH_MODE_CONFIGS[safeMode(mode)]}
  function providerPlan(mode){
    const selected=safeMode(mode);
    return {
      mode:selected,
      primary:selected==='travel'?'TourAPI + Kakao Local secure proxy':'Kakao Local secure proxy',
      reviewRanking:selected==='travel'?null:'rating/review provider secure proxy',
      fallback:'OpenStreetMap / Nominatim',
      secureProxyConnected:false,
      ratingReviewConnected:false
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

  async function searchPlaces({mode='travel',query='',region=null,radiusMinKm=0,radiusKm=2,moods=[]}={}){
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
      limit:'20',
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
      .filter(item=>{
        if(!Number.isFinite(item.distanceKm))return true;
        const min=Math.max(0,Number(radiusMinKm)||0),max=Math.max(.5,Number(radiusKm)||2);
        return item.distanceKm>=Math.max(0,min*.9)&&item.distanceKm<=max*1.35;
      })
      .map(item=>rankPlace(item,{query:userQuery,moods,radiusKm}))
      .sort((a,b)=>b.popularityScore-a.popularityScore||(a.distanceKm??999)-(b.distanceKm??999))
      .slice(0,15);

    return {
      items,
      source:'OpenStreetMap fallback · review/rating provider 연결 전',
      providerPlan:providerPlan(selected),
      fallback:true,
      rankingBasis:'현재는 거리·키워드·무드·OSM 중요도 기반 / 리뷰·평점 연결 시 자동 반영'
    };
  }

  return {modeConfig,providerPlan,resolveRegion,searchPlaces};
}

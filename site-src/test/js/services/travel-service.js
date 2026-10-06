import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { resolveRegion, searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';
import { searchOfficialPlaces, nearbyOfficialPlaces, officialCategories, nationalDatasetStatus, preloadNationalDataset } from './national-place-store.js';
import { buildSelectedCourse } from '../domain/course-planner.js';
import { geoKm } from '../domain/geo.js';

function dedupePlaces(items=[]){
  const seen=new Set(),out=[];
  for(const x of items){
    const key=(x.name||'')+'|'+Number(x.lat).toFixed(4)+'|'+Number(x.lng).toFixed(4);
    if(seen.has(key))continue;seen.add(key);out.push(x);
  }
  return out;
}
function softDeadline(promise,ms,fallback){
  return Promise.race([promise,new Promise(resolve=>setTimeout(()=>resolve(fallback),ms))]);
}
export function createTravelService(){
  const liveBoundaryCache=new Map();
  async function preload(){return preloadNationalDataset()}
  async function ensureLiveBoundary(criteria){
    const b=criteria.regionBoundary;
    if(b?.osmType==='relation'&&Number.isFinite(Number(b.osmId)))return b;
    const path=(criteria.regionPath||[]).filter(Boolean);
    if(!path.length)return null;
    const key=path.join('|');
    if(liveBoundaryCache.has(key))return liveBoundaryCache.get(key);
    const query=path.join(' ');
    try{
      const resolved=await resolveRegion(query);
      const value={...resolved,name:path.at(-1),displayName:path.join(' ')};
      liveBoundaryCache.set(key,value);
      return value;
    }catch(e){
      console.warn('live boundary fallback unavailable',query,e?.message||e);
      return null;
    }
  }
  async function getConfig(){
    let national=null;try{national=await nationalDatasetStatus()}catch{}
    return {providers:{officialNational:!!national,livePlaces:true,openai:false},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:'',national};
  }
  async function selectionSearch(criteria){
    const categories=[...new Set(criteria.categories||[])];
    const officialSet=officialCategories();
    const facilities=criteria.facilities||[];
    let official={items:[]},officialReady=true;

    // Phase A: bundled/official data always runs first and never needs geocoding.
    try{
      official=await searchOfficialPlaces({
        regionPath:criteria.regionPath||[],
        categories,
        facilities
      });
    }catch(e){
      officialReady=false;
      console.warn('official DB fallback',e?.message||e);
    }

    const liveCats=categories.filter(x=>!officialSet.has(x));
    const missingOfficial=categories.filter(x=>officialSet.has(x)&&!(official.items||[]).some(p=>p.category===x));
    const neededLive=[...new Set([...liveCats,...missingOfficial])];

    // Phase B: live map is supplemental only. Resolve an OSM boundary lazily here,
    // never while the user is choosing a region.
    let live={items:[],source:''};
    if(neededLive.length){
      const boundary=await softDeadline(ensureLiveBoundary(criteria),5200,null);
      if(boundary){
        live=await softDeadline(
          searchRegionPlaces({boundary,categories:neededLive,facilities}),
          9000,
          {items:[],source:'지도 보조 시간 제한'}
        ).catch(e=>{console.warn('live place fallback',e?.message||e);return {items:[],source:'지도 보조 오류'}});
      }
    }

    const items=dedupePlaces([...(official.items||[]),...(live.items||[])]);
    items.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
    const source=official.items?.length&&live.items?.length
      ?'TRIP QUEST 공식 DB + 지도 보조'
      :official.items?.length?'TRIP QUEST 공식 여행지 DB'
      :live.items?.length?'선별 지도 보조'
      :officialReady?'검색 결과 없음':'공식 DB 확인 실패';
    return {items,source,liveSupplemented:neededLive.length>0};
  }
  async function nearbyCandidates({destination,radiusKm=5}){
    let official=[];
    try{official=await nearbyOfficialPlaces(destination,radiusKm,70)}catch(e){console.warn('nearby official DB fallback',e?.message||e)}
    if(official.length>=12){
      return {items:official.slice(0,40),source:'TRIP QUEST 공식 여행지 DB'};
    }
    const live=await softDeadline(searchNearbyPlaces(destination,Math.round(radiusKm*1000)),4500,[]);
    const items=dedupePlaces([...official,...live]).map(x=>({...x,distanceKm:Number(x.distanceKm)||geoKm(destination,x)}))
      .filter(x=>x.distanceKm>=0.05&&x.distanceKm<=radiusKm)
      .sort((a,b)=>(b.score||0)-(a.score||0)||a.distanceKm-b.distanceKm);
    return {items:items.slice(0,40),source:official.length?'공식 여행지 DB + 선별 지도 보조':'선별 지도 보조'};
  }
  async function buildCourse(body){return buildSelectedCourse(body)}
  async function tripSummary(body){
    if(!body.origin)throw new Error('출발 위치가 필요합니다.');
    const [outbound,inbound]=await Promise.all([roadRoute(body.origin,body.destination),roadRoute(body.destination,body.origin)]);
    const distanceKm=outbound.distanceKm+inbound.distanceKm,drivingMin=outbound.timeMin+inbound.timeMin,vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency,energyCost=Math.round(energyAmount*vehicle.energyPrice),toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);
    return {outbound,inbound,total:{distanceKm,drivingMin,toll,tripCost:energyCost+toll,fuelLiters:energyAmount,fuelCost:energyCost,energyAmount,energyCost,energyUnit:vehicle.energyUnit,energyPrice:vehicle.energyPrice,vehicleLabel:vehicle.vehicleLabel,fuelLabel:vehicle.fuelLabel,efficiency:vehicle.efficiency,efficiencyUnit:vehicle.efficiencyUnit,energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',costLabel:vehicle.fuel==='electric'?'충전비':'연료비'},fuelEconomyKmL:vehicle.efficiency};
  }
  return {preload,getConfig,selectionSearch,nearbyCandidates,buildCourse,tripSummary};
}

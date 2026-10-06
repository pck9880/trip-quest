import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';
import { searchOfficialPlaces, nearbyOfficialPlaces, officialCategories, nationalDatasetStatus } from './national-place-store.js';
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
export function createTravelService(){
  async function getConfig(){
    let national=null;try{national=await nationalDatasetStatus()}catch{}
    return {providers:{officialNational:!!national,livePlaces:true,openai:false},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:'',national};
  }
  async function selectionSearch(criteria){
    const officialSet=officialCategories();
    let official={items:[]},officialReady=true;
    try{
      official=await searchOfficialPlaces({regionPath:criteria.regionPath||[],categories:criteria.categories||[],facilities:criteria.facilities||[]});
    }catch(e){
      officialReady=false;
      console.warn('official national DB fallback',e?.message||e);
    }
    const fallbackCats=officialReady
      ?(criteria.categories||[]).filter(x=>!officialSet.has(x))
      :(criteria.categories||[]);
    let live={items:[]};
    if(fallbackCats.length)live=await searchRegionPlaces({boundary:criteria.regionBoundary,categories:fallbackCats,facilities:criteria.facilities||[]});
    const items=dedupePlaces([...(official.items||[]),...(live.items||[])]);
    items.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
    const source=official.items?.length&&live.items?.length?'TRIP QUEST 전국 DB + 지도 보조':official.items?.length?'TRIP QUEST 전국 공식 DB':officialReady?'지도 보조 데이터':'공식 DB 준비 중 · 지도 보조';
    return {items,source};
  }
  async function nearbyCandidates({destination,radiusKm=5}){
    let official=[];
    try{official=await nearbyOfficialPlaces(destination,radiusKm,70)}catch(e){console.warn('nearby official DB fallback',e?.message||e)}
    let live=[];
    if(official.length<24)live=await searchNearbyPlaces(destination,Math.round(radiusKm*1000));
    const items=dedupePlaces([...official,...live]).map(x=>({...x,distanceKm:Number(x.distanceKm)||geoKm(destination,x)}))
      .filter(x=>x.distanceKm>=0.05&&x.distanceKm<=radiusKm)
      .sort((a,b)=>a.distanceKm-b.distanceKm||a.name.localeCompare(b.name,'ko'));
    return {items:items.slice(0,40),source:official.length?'TRIP QUEST 전국 DB + 지도 보조':'지도 보조 데이터'};
  }
  async function buildCourse(body){return buildSelectedCourse(body)}
  async function tripSummary(body){
    if(!body.origin)throw new Error('출발 위치가 필요합니다.');
    const [outbound,inbound]=await Promise.all([roadRoute(body.origin,body.destination),roadRoute(body.destination,body.origin)]);
    const distanceKm=outbound.distanceKm+inbound.distanceKm,drivingMin=outbound.timeMin+inbound.timeMin,vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency,energyCost=Math.round(energyAmount*vehicle.energyPrice),toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);
    return {outbound,inbound,total:{distanceKm,drivingMin,toll,tripCost:energyCost+toll,fuelLiters:energyAmount,fuelCost:energyCost,energyAmount,energyCost,energyUnit:vehicle.energyUnit,energyPrice:vehicle.energyPrice,vehicleLabel:vehicle.vehicleLabel,fuelLabel:vehicle.fuelLabel,efficiency:vehicle.efficiency,efficiencyUnit:vehicle.efficiencyUnit,energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',costLabel:vehicle.fuel==='electric'?'충전비':'연료비'},fuelEconomyKmL:vehicle.efficiency};
  }
  return {getConfig,selectionSearch,nearbyCandidates,buildCourse,tripSummary};
}

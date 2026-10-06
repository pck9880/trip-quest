import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';
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
  async function preload(){return preloadNationalDataset()}
  async function getConfig(){
    let national=null;try{national=await nationalDatasetStatus()}catch{}
    return {providers:{officialNational:!!national,livePlaces:true,openai:false},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:'',national};
  }
  async function selectionSearch(criteria){
    const categories=criteria.categories||[],officialSet=officialCategories();
    let officialReady=true;
    const officialPromise=searchOfficialPlaces({regionPath:criteria.regionPath||[],categories,facilities:criteria.facilities||[]})
      .catch(e=>{officialReady=false;console.warn('official DB fallback',e?.message||e);return {items:[]}});
    const liveCats=categories.filter(x=>!officialSet.has(x));
    const livePromise=liveCats.length
      ?softDeadline(searchRegionPlaces({boundary:criteria.regionBoundary,categories:liveCats,facilities:criteria.facilities||[]}),6200,{items:[],source:'지도 보조 시간 제한'})
      :Promise.resolve({items:[],source:''});
    let [official,live]=await Promise.all([officialPromise,livePromise]);
    if(!officialReady&&categories.some(x=>officialSet.has(x))){
      const recovery=await softDeadline(searchRegionPlaces({boundary:criteria.regionBoundary,categories,facilities:criteria.facilities||[]}),3200,{items:[]});
      live={...live,items:[...(live.items||[]),...(recovery.items||[])]};
    }
    const items=dedupePlaces([...(official.items||[]),...(live.items||[])]);
    items.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
    const source=official.items?.length&&live.items?.length?'공식 여행지 DB + 선별 지도 보조':official.items?.length?'TRIP QUEST 공식 여행지 DB':live.items?.length?'선별 지도 보조':'검색 결과 없음';
    return {items,source};
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

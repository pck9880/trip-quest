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
  const regionPrepCache=new Map();
  const regionPrepKey=criteria=>[
    ...(criteria.regionPath||[]),
    criteria.regionBoundary?.osmType||'',
    criteria.regionBoundary?.osmId||''
  ].join('|');
  async function preload(){return preloadNationalDataset()}
  async function prepareRegion(criteria,{onProgress}={}){
    const categories=[...new Set(criteria.categories||[])];
    const key=regionPrepKey(criteria);
    const hit=regionPrepCache.get(key);
    if(hit&&Date.now()-hit.at<15*60*1000){
      onProgress?.({value:100,stage:'ready',text:'기존 분석 데이터를 불러왔습니다.',count:hit.items.length,cached:true});
      return hit;
    }
    const officialSet=officialCategories();
    const officialCats=categories.filter(x=>officialSet.has(x));
    const liveCats=categories.filter(x=>!officialSet.has(x));
    onProgress?.({value:8,stage:'dataset',text:'전국 여행지 DB를 준비하고 있습니다.'});
    try{await preloadNationalDataset()}catch(e){console.warn('region preload DB fallback',e?.message||e)}
    onProgress?.({value:22,stage:'official',text:'선택 지역의 공식 장소 데이터를 분석하고 있습니다.'});

    let official={items:[]};
    if(officialCats.length){
      try{
        official=await searchOfficialPlaces({regionPath:criteria.regionPath||[],categories:officialCats,facilities:criteria.facilities||[]});
      }catch(e){console.warn('region official prepare fallback',e?.message||e)}
    }
    onProgress?.({value:42,stage:'live',text:'관광·자연·문화 장소를 추가 검색하고 있습니다.',count:official.items?.length||0});

    let live={items:[],source:''};
    if(liveCats.length){
      live=await searchRegionPlaces({
        boundary:criteria.regionBoundary,
        categories:liveCats,
        facilities:criteria.facilities||[],
        onProgress:({ratio,category})=>{
          const value=42+Math.round(Math.max(0,Math.min(1,ratio))*50);
          onProgress?.({value,stage:'live',text:category+' 데이터를 확인하고 있습니다.',count:(official.items?.length||0)});
        }
      }).catch(e=>{console.warn('region live prepare fallback',e?.message||e);return {items:[],source:'지도 보조'}});
    }
    const items=dedupePlaces([...(official.items||[]),...(live.items||[])]);
    items.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
    const prepared={at:Date.now(),key,items,source:official.items?.length&&live.items?.length?'공식 여행지 DB + 선별 지도 보조':official.items?.length?'TRIP QUEST 공식 여행지 DB':live.items?.length?'선별 지도 보조':'검색 결과 없음'};
    regionPrepCache.set(key,prepared);
    onProgress?.({value:100,stage:'ready',text:'장소 분석이 완료되었습니다.',count:items.length});
    return prepared;
  }
  async function getConfig(){
    let national=null;try{national=await nationalDatasetStatus()}catch{}
    return {providers:{officialNational:!!national,livePlaces:true,openai:false},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:'',national};
  }
  async function selectionSearch(criteria){
    const categories=criteria.categories||[],officialSet=officialCategories();
    const prepared=regionPrepCache.get(regionPrepKey(criteria));
    if(prepared&&Date.now()-prepared.at<15*60*1000){
      const wanted=new Set(categories);
      const items=prepared.items.filter(x=>wanted.has(x.category));
      if(items.length||prepared.items.length){
        return {items,source:prepared.source+' · 사전 분석'};
      }
    }
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
  return {preload,getConfig,prepareRegion,selectionSearch,nearbyCandidates,buildCourse,tripSummary};
}

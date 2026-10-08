import { activeVehicleProfile } from './vehicle-settings.js';
import { estimateRoundTripToll } from '../domain/trip-cost.js';
import { roadRoute } from './routing.js';
import { resolveRegion, searchRegionPlaces, searchNearbyPlaces } from './live-place-search.js';
import { searchOfficialPlaces, nearbyOfficialPlaces, officialCategories, nationalDatasetStatus, preloadNationalDataset } from './national-place-store.js';
import { buildSelectedCourse } from '../domain/course-planner.js';
import { geoKm } from '../domain/geo.js';
import { mergePlaces } from './search-normalization.js';

// A search needs enough choices, not just a single matching row.
const MIN_CATEGORY_RESULTS=3;
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
    let official={items:[]},officialReady=true,officialError='';

    // Phase A: bundled/official data always runs first and never needs geocoding.
    try{
      official=await searchOfficialPlaces({
        regionPath:criteria.regionPath||[],
        categories,
        facilities
      });
    }catch(e){
      officialReady=false;
      officialError=e?.message||'전국 DB 확인 실패';
      console.warn('official DB fallback',officialError);
    }

    const officialCounts=new Map();
    for(const row of official.items||[])officialCounts.set(row.category,(officialCounts.get(row.category)||0)+1);
    const neededLive=categories.filter(category=>!officialSet.has(category)||(officialCounts.get(category)||0)<MIN_CATEGORY_RESULTS);

    // Phase B: live map is supplemental only. Resolve an OSM boundary lazily here,
    // never while the user is choosing a region.
    let live={items:[],source:''},liveError='',liveAttempted=neededLive.length>0;
    if(liveAttempted){
      const boundary=await softDeadline(ensureLiveBoundary(criteria),5200,null);
      if(!boundary){
        liveError='외부 지도에서 지역 경계를 확인하지 못했습니다.';
      }else{
        live=await softDeadline(
          searchRegionPlaces({boundary,categories:neededLive,facilities}),
          9000,
          {items:[],source:'지도 보조 시간 제한',failed:neededLive.map(category=>({category,error:'시간 초과'}))}
        ).catch(e=>{
          liveError=e?.message||'외부 지도 오류';
          console.warn('live place fallback',liveError);
          return {items:[],source:'지도 보조 오류',failed:neededLive.map(category=>({category,error:liveError}))};
        });
        if(live.failed?.length){
          liveError='외부 지도에서 일부 장소를 가져오지 못했습니다.';
        }
      }
    }

    const items=mergePlaces(official.items||[],live.items||[]);
    items.sort((a,b)=>(b.score||0)-(a.score||0)||a.name.localeCompare(b.name,'ko'));
    const failures=[];
    if(!officialReady)failures.push({provider:'national',reason:officialError});
    if(liveAttempted&&liveError)failures.push({provider:'osm',reason:liveError,details:live.failed||[]});

    // Empty results and temporarily unavailable providers are different outcomes.
    const status=items.length?(failures.length?'partial':'ok'):(failures.length?'unavailable':'empty');
    const source=official.items?.length&&live.items?.length
      ?'TRIP QUEST 공식 DB + 지도 보조'
      :official.items?.length?'TRIP QUEST 공식 여행지 DB'
      :live.items?.length?'선별 지도 보조'
      :status==='unavailable'?'검색 서비스 일부 연결 실패':'검색 결과 없음';
    return {
      items,source,status,failures,liveSupplemented:liveAttempted,
      counts:{national:official.items?.length||0,external:live.items?.length||0}
    };
  }
  async function nearbyCandidates({destination,radiusKm=5}){
    let official=[];
    try{official=await nearbyOfficialPlaces(destination,radiusKm,70)}catch(e){console.warn('nearby official DB fallback',e?.message||e)}
    if(official.length>=12){
      return {items:official.slice(0,40),source:'TRIP QUEST 공식 여행지 DB'};
    }
    const live=await softDeadline(searchNearbyPlaces(destination,Math.round(radiusKm*1000)),4500,[]);
    const items=mergePlaces(official,live).map(x=>({...x,distanceKm:Number(x.distanceKm)||geoKm(destination,x)}))
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

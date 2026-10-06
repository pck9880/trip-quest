import { RAW_PLACES } from '../data/places.js';
import { HOTSPOT_META } from '../data/recommendation-data.js';
import { CURATED_COURSES } from '../data/course-data.js';
import { geoKm } from './geo.js';
import { roadRoute } from '../services/routing.js';
import { activeVehicleProfile } from '../services/vehicle-settings.js';

export function placeByName(name){return RAW_PLACES.find(p=>p.name===name)}
export function curatedStops(destination,mode){
  const group=destination?.routeGroup||HOTSPOT_META[destination?.name]?.routeGroup;
  const preset=group&&CURATED_COURSES[group];
  if(!preset)return null;
  const names=mode==='walk'?preset.walk:preset.drive;
  const stops=names.map(placeByName).filter(Boolean);
  if(!stops.some(p=>p.name===destination.name))stops.unshift(destination);
  return stops.slice(0,3);
}


export function localCandidates(anchor,cats,maxLegKm){
  let pool=RAW_PLACES
    .filter(p=>p.id!==anchor.id)
    .map(p=>({...p,fromAnchorKm:geoKm(anchor,p)}))
    .filter(p=>p.fromAnchorKm<=maxLegKm);
  if(cats?.length){
    const preferred=pool.filter(p=>cats.includes(p.category));
    pool=[...preferred,...pool.filter(p=>!preferred.includes(p))];
  }
  return pool.sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm);
}
export function buildLocalChain(start,pool,maxLegKm,limit=2){
  const chosen=[],used=new Set(),remaining=[...pool];let current=start;
  while(chosen.length<limit){
    const options=remaining
      .filter(p=>!used.has(p.id))
      .map(p=>({p,leg:geoKm(current,p)}))
      .filter(x=>x.leg<=maxLegKm)
      .sort((a,b)=>a.leg-b.leg);
    if(!options.length)break;
    const next=options[0].p;chosen.push(next);used.add(next.id);current=next;
  }
  return chosen;
}
export async function roadCandidatePool(anchor,cats,maxLegKm){
  let pool=RAW_PLACES.filter(p=>p.id!==anchor.id&&geoKm(anchor,p)<=Math.max(6,maxLegKm*1.45));
  if(cats?.length){
    const preferred=pool.filter(p=>cats.includes(p.category));
    pool=[...preferred,...pool.filter(p=>!preferred.includes(p))];
  }
  const checked=await Promise.all(pool.slice(0,18).map(async p=>{
    const route=await roadRoute(anchor,p);
    return route.distanceKm<=maxLegKm?{...p,fromAnchorKm:route.distanceKm,roadSource:route.source}:null;
  }));
  return checked.filter(Boolean).sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm);
}
export async function buildRoadChain(start,pool,maxLegKm,limit=2){
  const chosen=[],used=new Set();let current=start;
  while(chosen.length<limit){
    const candidates=pool.filter(p=>!used.has(p.id));
    if(!candidates.length)break;
    const checked=await Promise.all(candidates.slice(0,12).map(async p=>({p,route:await roadRoute(current,p)})));
    const options=checked.filter(x=>x.route.distanceKm<=maxLegKm).sort((a,b)=>a.route.distanceKm-b.route.distanceKm);
    if(!options.length)break;
    const next=options[0].p;chosen.push(next);used.add(next.id);current=next;
  }
  return chosen;
}
export function walkingLeg(a,b){
  const distanceKm=geoKm(a,b)*1.12;
  return {distanceKm,timeMin:distanceKm/4.5*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'walk-estimate'};
}
export async function buildLocalCourseRoute(stops,mode){
  if(!Array.isArray(stops)||stops.length<2)return {distanceKm:0,timeMin:0,toll:0,coords:stops?.length?[[stops[0].lat,stops[0].lng]]:[],source:mode==='walk'?'walk-estimate':'osrm'};
  let distanceKm=0,timeMin=0,maxLegKm=0,allRoad=true,coords=[];
  for(let i=1;i<stops.length;i++){
    const r=mode==='walk'?walkingLeg(stops[i-1],stops[i]):await roadRoute(stops[i-1],stops[i]);
    distanceKm+=r.distanceKm;timeMin+=r.timeMin;maxLegKm=Math.max(maxLegKm,r.distanceKm);
    if(mode==='drive')allRoad=allRoad&&r.source==='osrm';
    if(coords.length&&r.coords?.length)coords.push(...r.coords.slice(1));else if(r.coords?.length)coords.push(...r.coords);
  }
  return {distanceKm,timeMin,maxLegKm,toll:0,coords,source:mode==='walk'?'walk-estimate':allRoad?'osrm':'mixed'};
}
export async function coursePack(body,w){
  const d=body.destination,cats=body.categories||[];
  const rain=Number(w.precipitation_probability)>=55||['비','눈','뇌우','이슬비'].includes(w.condition);

  const curatedWalk=curatedStops(d,'walk');
  const curatedDrive=curatedStops(d,'drive');
  const walkPool=curatedWalk?[]:localCandidates(d,cats,1.8);
  const drivePool=curatedDrive?[]:await roadCandidatePool(d,cats,4);
  const walkStops=curatedWalk||[d,...buildLocalChain(d,walkPool,1.8,2)];
  const driveStops=curatedDrive||[d,...await buildRoadChain(d,drivePool,4,2)];

  const configs=[
    {
      id:'A',title:'WALK · 도보 근거리',mode:'walk',
      reason:curatedWalk
        ?'같은 상권 안에서 실제로 이어 걷기 좋은 핵심 거리·시설을 순서대로 연결한 도보 코스입니다.'
        :walkStops.length>1
          ?'선택한 여행지 주변의 가까운 지점을 이어 만든 도보 코스입니다.'
          :'도보권 안에 추가 장소가 부족해 선택한 여행지를 중심으로 보여줍니다.',
      stops:walkStops
    },
    {
      id:'B',title:'DRIVE · 드라이브 코스',mode:'drive',
      reason:curatedDrive
        ?'같은 도시권에서 성격이 이어지는 번화가·문화거리·시장 등을 차량으로 연결한 드라이브 코스입니다.'
        :driveStops.length>1
          ?'선택 지역 안에서 가까운 지점을 차량으로 이어 만든 드라이브 코스입니다.'
          :'도로거리 4km 이내 적합한 추가 장소가 부족해 선택한 여행지 중심으로 구성했습니다.',
      stops:driveStops
    }
  ];

  const results=[];
  for(const c of configs){
    const route=await buildLocalCourseRoute(c.stops,c.mode);
    const vehicle=activeVehicleProfile(body);
    const fuel=c.mode==='drive'?route.distanceKm/vehicle.efficiency:0;
    const fuelCost=c.mode==='drive'?Math.round(fuel*vehicle.energyPrice):0;
    results.push({...c,
      weatherFit:rain?(c.mode==='walk'?'낮음':'보통'):'높음',
      localRule:c.mode==='walk'
        ?(curatedWalk?'큐레이션 도보 연계 · 출발지 제외':'여행지 주변 도보 근거리 · 출발지 제외')
        :(curatedDrive?'큐레이션 도시권 드라이브 · 출발지 제외':route.source==='osrm'?'여행지 주변 실제 도로거리 4km 이내':'여행지 주변 4km 이내 · 경로 실패 구간은 근사'),
      maxLocalLegKm:route.maxLegKm||0,
      route,
      estimatedCost:{fuelCost,toll:0,total:fuelCost}
    });
  }
  return results;
}

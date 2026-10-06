import { geoKm } from './geo.js';
import { roadRoute } from '../services/routing.js';
import { activeVehicleProfile } from '../services/vehicle-settings.js';

export function walkingLeg(a,b){
  const distanceKm=geoKm(a,b)*1.12;
  return {distanceKm,timeMin:distanceKm/4.5*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'walk-estimate'};
}
export async function buildLocalCourseRoute(stops,mode){
  if(!Array.isArray(stops)||stops.length<2)return {distanceKm:0,timeMin:0,toll:0,coords:stops?.length?[[stops[0].lat,stops[0].lng]]:[],source:mode==='walk'?'walk-estimate':'osrm'};
  let distanceKm=0,timeMin=0,maxLegKm=0,coords=[],allRoad=true;
  for(let i=1;i<stops.length;i++){
    const r=mode==='walk'?walkingLeg(stops[i-1],stops[i]):await roadRoute(stops[i-1],stops[i]);
    distanceKm+=r.distanceKm;timeMin+=r.timeMin;maxLegKm=Math.max(maxLegKm,r.distanceKm);
    if(mode==='drive')allRoad=allRoad&&r.source==='osrm';
    if(coords.length&&r.coords?.length)coords.push(...r.coords.slice(1));else if(r.coords?.length)coords.push(...r.coords);
  }
  return {distanceKm,timeMin,maxLegKm,toll:0,coords,source:mode==='walk'?'walk-estimate':allRoad?'osrm':'mixed'};
}
function nearest(anchor,nearby,maxKm,limit){
  return (nearby||[]).map(p=>({...p,fromAnchorKm:geoKm(anchor,p)})).filter(p=>p.fromAnchorKm<=maxKm).sort((a,b)=>a.fromAnchorKm-b.fromAnchorKm).slice(0,limit);
}
export async function coursePack(body,w){
  const d=body.destination,nearby=body.nearby||[];
  const walkStops=[d,...nearest(d,nearby,1.8,2)];
  const driveStops=[d,...nearest(d,nearby,5,2)];
  const configs=[
    {id:'A',title:'WALK · 주변 도보 코스',mode:'walk',reason:'선택한 장소 주변의 실제 지도 장소를 가까운 순서로 연결합니다.',stops:walkStops},
    {id:'B',title:'DRIVE · 주변 드라이브 코스',mode:'drive',reason:'선택한 장소 주변 5km 안의 실제 지도 장소를 차량 동선으로 연결합니다.',stops:driveStops}
  ];
  const results=[];
  for(const c of configs){
    const route=await buildLocalCourseRoute(c.stops,c.mode);
    const vehicle=activeVehicleProfile(body),fuel=c.mode==='drive'?route.distanceKm/vehicle.efficiency:0,fuelCost=c.mode==='drive'?Math.round(fuel*vehicle.energyPrice):0;
    results.push({...c,weatherFit:'참고',localRule:'OpenStreetMap 주변 장소 · 고정 장소 데이터 미사용',maxLocalLegKm:route.maxLegKm||0,route,estimatedCost:{fuelCost,toll:0,total:fuelCost}});
  }
  return results;
}

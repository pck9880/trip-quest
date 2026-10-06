import { geoKm } from './geo.js';

export function walkingLeg(a,b){
  const distanceKm=geoKm(a,b)*1.12;
  return {distanceKm,timeMin:distanceKm/4.5*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'walk-estimate'};
}
export async function buildLocalCourseRoute(stops){
  if(!Array.isArray(stops)||stops.length<2)return {distanceKm:0,timeMin:0,toll:0,coords:stops?.length?[[stops[0].lat,stops[0].lng]]:[],source:'walk-estimate'};
  let distanceKm=0,timeMin=0,maxLegKm=0,coords=[];
  for(let i=1;i<stops.length;i++){
    const r=walkingLeg(stops[i-1],stops[i]);
    distanceKm+=r.distanceKm;timeMin+=r.timeMin;maxLegKm=Math.max(maxLegKm,r.distanceKm);
    if(coords.length)coords.push(...r.coords.slice(1));else coords.push(...r.coords);
  }
  return {distanceKm,timeMin,maxLegKm,toll:0,coords,source:'walk-estimate'};
}
function routeLength(stops){
  let n=0;for(let i=1;i<stops.length;i++)n+=geoKm(stops[i-1],stops[i]);return n;
}
export function optimizeStops(destination,selected=[]){
  const remaining=[...selected],ordered=[destination];
  while(remaining.length){
    const last=ordered.at(-1);
    let best=0,bestKm=Infinity;
    for(let i=0;i<remaining.length;i++){
      const d=geoKm(last,remaining[i]);
      if(d<bestKm){bestKm=d;best=i}
    }
    ordered.push(remaining.splice(best,1)[0]);
  }
  if(ordered.length>3){
    let improved=true,loops=0;
    while(improved&&loops++<8){
      improved=false;
      for(let i=1;i<ordered.length-1;i++){
        for(let j=i+1;j<ordered.length;j++){
          const candidate=[...ordered.slice(0,i),...ordered.slice(i,j+1).reverse(),...ordered.slice(j+1)];
          if(routeLength(candidate)+0.0001<routeLength(ordered)){ordered.splice(0,ordered.length,...candidate);improved=true}
        }
      }
    }
  }
  return ordered;
}
function timeParts(hhmm='09:00'){
  const m=/^(\d{1,2}):(\d{2})$/.exec(hhmm)||[];
  return {h:Math.min(23,Math.max(0,Number(m[1])||9)),m:Math.min(59,Math.max(0,Number(m[2])||0))};
}
function clockAfter(start,minutes){
  const t=timeParts(start),sum=t.h*60+t.m+Math.round(minutes);
  const dayOffset=Math.floor(sum/1440),mod=((sum%1440)+1440)%1440;
  return {time:String(Math.floor(mod/60)).padStart(2,'0')+':'+String(mod%60).padStart(2,'0'),dayOffset};
}
export async function buildSelectedCourse({destination,selectedStops=[],departureTime='09:00',stayById={}}){
  const stops=optimizeStops(destination,selectedStops);
  const route=await buildLocalCourseRoute(stops);
  const legs=[];
  let elapsed=0;
  for(let i=0;i<stops.length;i++){
    const stop=stops[i];
    const stayMin=Math.max(0,Number(stayById[stop.id]??60));
    const arrival=clockAfter(departureTime,elapsed);
    const leave=clockAfter(departureTime,elapsed+stayMin);
    legs.push({stop,arrival,leave,stayMin});
    elapsed+=stayMin;
    if(i<stops.length-1)elapsed+=walkingLeg(stops[i],stops[i+1]).timeMin;
  }
  const end=clockAfter(departureTime,elapsed);
  return {
    id:'SELECTED',
    title:'사용자 선택 최적 코스',
    mode:'walk',
    reason:'선택한 장소만 이용해 이동거리가 짧아지도록 순서를 최적화했습니다.',
    stops,route,legs,
    departureTime,endTime:end.time,endDayOffset:end.dayOffset,
    stayMin:legs.reduce((n,x)=>n+x.stayMin,0),
    travelMin:Math.round(route.timeMin),
    totalMin:Math.round(elapsed),
    localRule:'사용자 선택 장소 · 도보 기준 이동시간',
    maxLocalLegKm:route.maxLegKm||0,
    estimatedCost:{fuelCost:0,toll:0,total:0}
  };
}

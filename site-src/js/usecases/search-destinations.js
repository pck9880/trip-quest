import { geoKm } from '../domain/geo.js';
import { scheduleWindow } from '../domain/schedule.js';
import { diversifyRecommendations, normalizedDistanceRange } from '../domain/recommendation.js';
import { roadRoute } from '../services/routing.js';

export async function refineRoadDistanceResults(items,body){
  if(!Array.isArray(items)||!items.length||!body?.origin)return [];
  const {min:minKm,max:maxKm}=normalizedDistanceRange(body);
  const band=body.distanceBand&&Number.isFinite(Number(body.distanceBand.min))&&Number.isFinite(Number(body.distanceBand.max))
    ?{min:Math.max(0,Number(body.distanceBand.min)),max:Math.min(400,Number(body.distanceBand.max))}
    :null;
  const min=band?band.min:minKm,max=band?band.max:maxKm;
  const checked=await Promise.all(items.slice(0,12).map(async p=>{
    const route=await roadRoute(body.origin,p);
    const roadKm=route.distanceKm;
    if(roadKm<min||roadKm>max)return null;
    const round=route.timeMin*2,avail=scheduleWindow(body.departure,body.returnTime);
    const feasible=avail==null?true:round<=avail;
    const distanceFit=Math.max(0,14-Math.abs(roadKm-(min+max)/2)/Math.max(10,max-min)*10);
    return {...p,distanceKm:roadKm,geoDistanceKm:p.geoDistanceKm??geoKm(body.origin,p),routePreview:route,
      roundTripDriveMin:round,availableMin:avail,feasible,roadVerified:route.source==='osrm',
      score:Math.min(99,Math.round((p.score||50)+distanceFit))};
  }));
  return diversifyRecommendations(checked.filter(Boolean).sort((a,b)=>b.score-a.score),10);
}

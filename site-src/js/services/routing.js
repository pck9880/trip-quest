import { geoKm } from '../domain/geo.js';

export function approxRoute(a,b){const distanceKm=geoKm(a,b)*1.23,avg=distanceKm<20?38:distanceKm<80?52:68;return {distanceKm,timeMin:distanceKm/avg*60,toll:0,coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'estimate'}}
const ROAD_ROUTE_CACHE=new Map();
export async function roadRoute(a,b){
  const fallback=approxRoute(a,b);
  if(typeof window==='undefined'||typeof fetch!=='function')return fallback;
  const key=[Number(a.lat).toFixed(5),Number(a.lng).toFixed(5),Number(b.lat).toFixed(5),Number(b.lng).toFixed(5)].join(',');
  if(ROAD_ROUTE_CACHE.has(key))return ROAD_ROUTE_CACHE.get(key);
  const promise=(async()=>{
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),4500);
    try{
      const url=`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
      const r=await fetch(url,{signal:ctrl.signal,headers:{accept:'application/json'}});
      if(!r.ok)throw new Error('route');
      const j=await r.json(),route=j?.routes?.[0];
      if(!route||!Number.isFinite(route.distance)||!Number.isFinite(route.duration))throw new Error('route');
      const coords=(route.geometry?.coordinates||[]).map(([lng,lat])=>[lat,lng]);
      return {distanceKm:route.distance/1000,timeMin:route.duration/60,toll:0,coords:coords.length>1?coords:[[a.lat,a.lng],[b.lat,b.lng]],source:'osrm'};
    }catch{return fallback}finally{clearTimeout(timer)}
  })();
  ROAD_ROUTE_CACHE.set(key,promise);
  const result=await promise;
  ROAD_ROUTE_CACHE.set(key,result);
  return result;
}

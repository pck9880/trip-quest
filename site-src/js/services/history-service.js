const HISTORY_KEY='tq_travel_history_v1';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}
function defaultStorage(){try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}}

function localDay(date=new Date()){
  const y=date.getFullYear(),m=String(date.getMonth()+1).padStart(2,'0'),d=String(date.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`;
}
function hashKey(input){
  let h=2166136261;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function normalizeStop(stop={}){
  return {name:String(stop.name||'장소'),category:String(stop.category||''),lat:Number(stop.lat)||0,lng:Number(stop.lng)||0};
}
function normalizeCourse(course={}){
  return {
    id:String(course.id||''),
    title:String(course.title||'코스'),
    mode:course.mode==='drive'?'drive':'walk',
    reason:String(course.reason||''),
    localRule:String(course.localRule||''),
    stops:Array.isArray(course.stops)?course.stops.map(normalizeStop):[],
    route:{distanceKm:Number(course.route?.distanceKm)||0,timeMin:Number(course.route?.timeMin)||0,source:String(course.route?.source||'')},
    estimatedCost:{fuelCost:Number(course.estimatedCost?.fuelCost)||0,toll:Number(course.estimatedCost?.toll)||0,total:Number(course.estimatedCost?.total)||0}
  };
}

export function buildTravelHistoryItem(destination={},course={},completedAt=new Date()){
  const date=completedAt instanceof Date?completedAt:new Date(completedAt);
  const destinationInfo={
    name:String(destination.name||'여행지'),
    category:String(destination.category||''),
    lat:Number(destination.lat)||0,
    lng:Number(destination.lng)||0,
    address:String(destination.address||'')
  };
  const normalized=normalizeCourse(course);
  const signature=[localDay(date),destinationInfo.name,normalized.id,normalized.stops.map(x=>x.name).join('>')].join('|');
  return {
    id:'trip-'+hashKey(signature),
    type:'completed-trip',
    destination:destinationInfo,
    course:normalized,
    completedAt:date.toISOString(),
    completedDay:localDay(date)
  };
}

export function createHistoryService(storage=defaultStorage()){
  function read(){
    try{
      const parsed=JSON.parse(storage.getItem(HISTORY_KEY)||'[]');
      return Array.isArray(parsed)?parsed.filter(item=>item?.id&&item.type==='completed-trip'):[];
    }catch{return []}
  }
  function write(items){try{storage.setItem(HISTORY_KEY,JSON.stringify(items))}catch{}return items}
  function list(){return read().sort((a,b)=>String(b.completedAt||'').localeCompare(String(a.completedAt||'')))}
  function get(id){return read().find(item=>item.id===id)||null}
  function has(id){return read().some(item=>item.id===id)}
  function uniquePlaceCount(){return new Set(read().map(item=>item.destination?.name).filter(Boolean)).size}
  function complete(destination,course,completedAt=new Date()){
    const item=buildTravelHistoryItem(destination,course,completedAt);
    const items=read(),index=items.findIndex(x=>x.id===item.id);
    const created=index<0;
    if(created)items.push(item);else items[index]=item;
    write(items);
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'){
      window.dispatchEvent(new CustomEvent('tripquest:history-change',{detail:{item,created,count:items.length,uniquePlaceCount:uniquePlaceCount()}}));
    }
    return {item,created,count:items.length,uniquePlaceCount:uniquePlaceCount()};
  }
  return {list,get,has,complete,count:()=>read().length,uniquePlaceCount,key:HISTORY_KEY};
}

export const historyService=createHistoryService();

const KEEP_KEY='tq_keep_courses_v1';

function memoryStorage(){
  const data=new Map();
  return {
    getItem:key=>data.has(key)?data.get(key):null,
    setItem:(key,value)=>data.set(key,String(value)),
    removeItem:key=>data.delete(key)
  };
}

function defaultStorage(){
  try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}
}

function hashKey(input){
  let h=2166136261;
  for(let i=0;i<input.length;i++){
    h^=input.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return (h>>>0).toString(36);
}

function normalizeCourse(course={}){
  return {
    id:String(course.id||''),
    title:String(course.title||'코스'),
    mode:course.mode==='drive'?'drive':'walk',
    reason:String(course.reason||''),
    weatherFit:String(course.weatherFit||''),
    localRule:String(course.localRule||''),
    stops:Array.isArray(course.stops)?course.stops.map(stop=>({
      name:String(stop?.name||'장소'),
      category:String(stop?.category||''),
      lat:Number(stop?.lat)||0,
      lng:Number(stop?.lng)||0
    })):[],
    route:{
      distanceKm:Number(course.route?.distanceKm)||0,
      timeMin:Number(course.route?.timeMin)||0,
      maxLegKm:Number(course.route?.maxLegKm)||0,
      source:String(course.route?.source||'')
    },
    estimatedCost:{
      fuelCost:Number(course.estimatedCost?.fuelCost)||0,
      toll:Number(course.estimatedCost?.toll)||0,
      total:Number(course.estimatedCost?.total)||0
    }
  };
}

export function buildCourseKeep(destination={},course={}){
  const normalized=normalizeCourse(course);
  const destinationInfo={
    name:String(destination?.name||'여행지'),
    category:String(destination?.category||''),
    lat:Number(destination?.lat)||0,
    lng:Number(destination?.lng)||0,
    address:String(destination?.address||''),
    distanceKm:Number(destination?.distanceKm)||0,
    geoDistanceKm:Number(destination?.geoDistanceKm)||0,
    aiReason:String(destination?.aiReason||''),
    routePreview:{
      distanceKm:Number(destination?.routePreview?.distanceKm)||0,
      timeMin:Number(destination?.routePreview?.timeMin)||0,
      source:String(destination?.routePreview?.source||'')
    }
  };
  const signature=[destinationInfo.name,normalized.id,normalized.stops.map(x=>x.name).join('>')].join('|');
  return {
    id:'course-'+hashKey(signature),
    type:'course',
    destination:destinationInfo,
    course:normalized,
    savedAt:new Date().toISOString()
  };
}

export function createKeepService(storage=defaultStorage()){
  function read(){
    try{
      const parsed=JSON.parse(storage.getItem(KEEP_KEY)||'[]');
      return Array.isArray(parsed)?parsed.filter(item=>item&&item.id&&item.type==='course'):[];
    }catch{return []}
  }

  function write(items){
    try{storage.setItem(KEEP_KEY,JSON.stringify(items))}catch{}
    return items;
  }

  function notify(detail={}){
    if(typeof window==='undefined'||typeof window.dispatchEvent!=='function')return;
    window.dispatchEvent(new CustomEvent('tripquest:keep-change',{detail:{...detail,count:count(),items:list()}}));
  }

  function list(){
    return read().sort((a,b)=>String(b.savedAt||'').localeCompare(String(a.savedAt||'')));
  }

  function count(){return read().length}
  function has(id){return read().some(item=>item.id===id)}
  function get(id){return read().find(item=>item.id===id)||null}

  function save(item){
    if(!item?.id)return {saved:false,item:null,count:count()};
    const items=read();
    const index=items.findIndex(x=>x.id===item.id);
    const next={...item,savedAt:index>=0?(items[index].savedAt||item.savedAt):item.savedAt};
    if(index>=0)items[index]=next;
    else items.push(next);
    write(items);
    notify({id:item.id,saved:true,item:next});
    return {saved:true,item:next,count:items.length};
  }

  function remove(id){
    const items=read();
    const existing=items.find(x=>x.id===id)||null;
    const next=items.filter(item=>item.id!==id);
    write(next);
    if(existing)notify({id,saved:false,item:existing});
    return {saved:false,item:existing,count:next.length};
  }

  function toggle(item){
    return has(item?.id)?remove(item.id):save(item);
  }

  function importData(items=[]){const clean=(Array.isArray(items)?items:[]).filter(item=>item?.id&&item.type==='course');write(clean);notify({imported:true});return clean}
  function clear(){write([]);notify({cleared:true});return []}
  return {list,count,has,get,save,remove,toggle,importData,clear,exportData:list,key:KEEP_KEY};
}

export const keepService=createKeepService();

function hash(input){
  let h=2166136261;
  for(let i=0;i<input.length;i++){h^=input.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(36);
}
function stopOf(stop={}){
  return {
    name:String(stop.name||'장소'),
    category:String(stop.category||''),
    lat:Number(stop.lat),
    lng:Number(stop.lng)
  };
}
function validPoint(point){return Number.isFinite(point?.lat)&&Number.isFinite(point?.lng)&&Math.abs(point.lat)<=90&&Math.abs(point.lng)<=180}

export function buildCourseQuest(destination={},course={}){
  const routeStops=(Array.isArray(course.stops)?course.stops:[]).map(stopOf).filter(validPoint);
  const fallback=stopOf(destination);
  const target=routeStops.at(-1)||(validPoint(fallback)?fallback:null);
  if(!target)return null;
  const signature=[destination.name||'',course.id||'',course.title||'',routeStops.map(s=>s.name).join('>'),target.lat,target.lng].join('|');
  return {
    id:'course-'+hash(signature),
    type:'course-quest',
    source:'selected-course',
    title:`${String(destination.name||target.name||'여행지')} · ${String(course.id||'A')}코스 QUEST`,
    summary:`선택한 ${String(course.id||'A')}코스의 최종 목적지에 도착한 뒤 앱에서 GPS 위치를 확인하면 완료됩니다.`,
    destination:{name:String(destination.name||target.name||'여행지'),category:String(destination.category||''),address:String(destination.address||'')},
    course:{id:String(course.id||''),title:String(course.title||''),mode:course.mode==='drive'?'drive':'walk'},
    routeStops,
    checkpoints:[{id:'arrival',name:target.name,category:target.category||'최종 목적지',lat:target.lat,lng:target.lng}],
    verification:{radiusM:150,maxAccuracyM:80,requiredHits:2,dwellMs:0,maxAgeMs:30000,maxJumpSpeedKmh:180},
    rewardStatus:'pending',
    xp:0,
    createdAt:new Date().toISOString()
  };
}

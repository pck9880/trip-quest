const ATTENDANCE_KEY='tq_attendance_v1';

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
function dayOffset(date,offset){const d=new Date(date);d.setHours(12,0,0,0);d.setDate(d.getDate()+offset);return d}

export function createAttendanceService(storage=defaultStorage(),clock=()=>new Date()){
  function list(){
    try{
      const parsed=JSON.parse(storage.getItem(ATTENDANCE_KEY)||'[]');
      return [...new Set(Array.isArray(parsed)?parsed.filter(Boolean):[])].sort();
    }catch{return []}
  }
  function write(days){try{storage.setItem(ATTENDANCE_KEY,JSON.stringify(days))}catch{}return days}
  function checkedToday(){return list().includes(localDay(clock()))}
  function checkIn(){
    const now=clock(),today=localDay(now),days=list();
    const already=days.includes(today);
    if(!already){days.push(today);write([...new Set(days)].sort())}
    const summary=getSummary();
    if(typeof window!=='undefined'&&typeof window.dispatchEvent==='function'){
      window.dispatchEvent(new CustomEvent('tripquest:attendance-change',{detail:{...summary,newCheckIn:!already}}));
    }
    return {...summary,newCheckIn:!already};
  }
  function streak(){
    const now=clock(),days=new Set(list());
    let cursor=checkedToday()?now:dayOffset(now,-1),count=0;
    while(days.has(localDay(cursor))){count++;cursor=dayOffset(cursor,-1)}
    return count;
  }
  function monthCount(){
    const now=clock();
    const prefix=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-`;
    return list().filter(day=>day.startsWith(prefix)).length;
  }
  function getSummary(){return {checkedToday:checkedToday(),streak:streak(),monthCount:monthCount(),total:list().length,today:localDay(clock())}}
  return {list,checkedToday,checkIn,streak,monthCount,getSummary,key:ATTENDANCE_KEY};
}

export const attendanceService=createAttendanceService();

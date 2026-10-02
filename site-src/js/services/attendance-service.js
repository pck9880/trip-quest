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
  function longestStreak(){
    const days=list();if(!days.length)return 0;
    let best=1,current=1;
    for(let i=1;i<days.length;i++){
      const diff=Math.round((new Date(days[i]+'T12:00:00')-new Date(days[i-1]+'T12:00:00'))/86400000);
      current=diff===1?current+1:1;if(current>best)best=current;
    }
    return best;
  }
  function monthCalendar(year=clock().getFullYear(),month=clock().getMonth()+1){
    const first=new Date(year,month-1,1,12),totalDays=new Date(year,month,0,12).getDate(),checked=new Set(list()),today=localDay(clock());
    return {year,month,firstWeekday:first.getDay(),checkedCount:[...checked].filter(day=>day.startsWith(`${year}-${String(month).padStart(2,'0')}-`)).length,days:Array.from({length:totalDays},(_,i)=>{const key=`${year}-${String(month).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;return {day:i+1,key,checked:checked.has(key),today:key===today}})};
  }
  function importData(days=[]){const clean=[...new Set((Array.isArray(days)?days:[]).filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(String(day))))].sort();write(clean);if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:attendance-change',{detail:getSummary()}));return clean}
  function clear(){write([]);return []}
  function getSummary(){return {checkedToday:checkedToday(),streak:streak(),longestStreak:longestStreak(),monthCount:monthCount(),total:list().length,today:localDay(clock())}}
  return {list,checkedToday,checkIn,streak,longestStreak,monthCount,monthCalendar,importData,clear,exportData:list,getSummary,key:ATTENDANCE_KEY};
}

export const attendanceService=createAttendanceService();

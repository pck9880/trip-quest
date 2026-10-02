import { QUESTS } from '../data/quest-data.js';

const QUEST_PROGRESS_KEY='tq_quest_progress_v1';
export const QUEST_TITLES=[
  {id:'first-step',name:'첫 발걸음',description:'GPS QUEST 1회 완료',condition:stats=>stats.completedCount>=1},
  {id:'road-traveler',name:'길 위의 여행자',description:'GPS QUEST 3회 완료',condition:stats=>stats.completedCount>=3},
  {id:'city-explorer',name:'골목 탐험가',description:'도시 QUEST 3회 완료',condition:stats=>(stats.themeCounts.city||0)>=3},
  {id:'quest-hunter',name:'QUEST HUNTER',description:'GPS QUEST 5회 완료',condition:stats=>stats.completedCount>=5}
];

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function defaultStorage(){try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}}
function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function blank(){return {version:1,xp:0,completed:[],unlockedTitles:[],equippedTitle:null}}

export function createQuestService(storage=defaultStorage(),clock=()=>new Date()){
  function read(){
    try{
      const parsed=JSON.parse(storage.getItem(QUEST_PROGRESS_KEY)||'null');
      return parsed&&Array.isArray(parsed.completed)?{...blank(),...parsed}:blank();
    }catch{return blank()}
  }
  function write(value){try{storage.setItem(QUEST_PROGRESS_KEY,JSON.stringify(value))}catch{}return value}
  function statsFrom(data=read()){
    const themeCounts={};
    for(const item of data.completed){themeCounts[item.theme]=(themeCounts[item.theme]||0)+1}
    return {xp:Number(data.xp)||0,level:Math.max(1,Math.floor((Number(data.xp)||0)/500)+1),completedCount:data.completed.length,themeCounts,unlockedTitles:[...(data.unlockedTitles||[])],equippedTitle:data.equippedTitle||null};
  }
  function refreshTitles(data){
    const stats=statsFrom(data),newlyUnlocked=[];
    for(const title of QUEST_TITLES){
      if(title.condition(stats)&&!data.unlockedTitles.includes(title.id)){data.unlockedTitles.push(title.id);newlyUnlocked.push(title)}
    }
    if(!data.equippedTitle&&data.unlockedTitles.length)data.equippedTitle=data.unlockedTitles[0];
    return newlyUnlocked;
  }
  function completeQuest(quest,verifiedCheckpointIds=[],completedAt=clock()){
    if(!quest?.id)throw new Error('QUEST 정보가 없습니다.');
    const expected=(quest.checkpoints||[]).map(cp=>cp.id);
    if(expected.some(id=>!verifiedCheckpointIds.includes(id)))throw new Error('모든 체크포인트 인증이 필요합니다.');
    const data=read(),date=completedAt instanceof Date?completedAt:new Date(completedAt),completionId=`${quest.id}:${dayKey(date)}`;
    if(data.completed.some(item=>item.id===completionId))return {created:false,progress:data,stats:statsFrom(data),newTitles:[]};
    data.xp=(Number(data.xp)||0)+(Number(quest.xp)||0);
    data.completed.push({id:completionId,questId:quest.id,title:quest.title,region:quest.region,theme:quest.theme,xp:Number(quest.xp)||0,completedAt:date.toISOString(),checkpointCount:expected.length});
    const newTitles=refreshTitles(data);write(data);
    const detail={created:true,questId:quest.id,xp:quest.xp,newTitles,stats:statsFrom(data)};
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:quest-change',{detail}));
    return {created:true,progress:data,stats:detail.stats,newTitles};
  }
  function equipTitle(id){
    const data=read();
    if(!data.unlockedTitles.includes(id))return false;
    data.equippedTitle=id;write(data);
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:quest-change',{detail:{equippedTitle:id,stats:statsFrom(data)}}));
    return true;
  }
  function title(id){return QUEST_TITLES.find(item=>item.id===id)||null}
  function getStats(){const data=read(),stats=statsFrom(data);return {...stats,equippedTitleInfo:title(stats.equippedTitle)}}
  function listTitles(){const data=read();return QUEST_TITLES.map(item=>({...item,unlocked:data.unlockedTitles.includes(item.id),equipped:data.equippedTitle===item.id}))}
  function importData(value={}){
    const next={...blank(),...(value||{})};
    next.completed=Array.isArray(next.completed)?next.completed:[];
    next.unlockedTitles=Array.isArray(next.unlockedTitles)?next.unlockedTitles:[];
    refreshTitles(next);write(next);
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:quest-change',{detail:{imported:true,stats:statsFrom(next)}}));
    return next;
  }
  function clear(){write(blank());return blank()}
  return {getStats,listTitles,completeQuest,equipTitle,title,importData,clear,exportData:read,key:QUEST_PROGRESS_KEY,quests:QUESTS};
}

export const questService=createQuestService();

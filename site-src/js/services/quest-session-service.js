import { getQuest } from '../data/quest-data.js';
import { createCheckpointVerifier } from '../domain/quest-verification.js';
import { gpsService as defaultGpsService } from './gps-service.js';
import { locationConsentService as defaultConsentService } from './location-consent-service.js';
import { questService as defaultQuestService } from './quest-service.js';

const SESSION_KEY='tq_quest_session_v1';

function memoryStorage(){
  const data=new Map();
  return {getItem:key=>data.has(key)?data.get(key):null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function defaultStorage(){try{return globalThis.localStorage||memoryStorage()}catch{return memoryStorage()}}

function questError(type,message,recoverable=true){
  const error=new Error(message);error.type=type;error.recoverable=recoverable;return error;
}

export function createQuestSessionService({
  storage=defaultStorage(),
  gps=defaultGpsService,
  consent=defaultConsentService,
  progress=defaultQuestService,
  clock=()=>new Date(),
  receivedNow=()=>Date.now()
}={}){
  let verifier=null;
  let telemetry=null;
  let lastCompletion=null;
  const listeners=new Set();

  function read(){
    try{
      const parsed=JSON.parse(storage.getItem(SESSION_KEY)||'null');
      return parsed?.questId?parsed:null;
    }catch{return null}
  }
  function write(session){
    if(!session)return null;
    const safe={
      version:1,
      questId:session.questId,
      checkpointIndex:Number(session.checkpointIndex)||0,
      verified:Array.isArray(session.verified)?session.verified.map(item=>({checkpointId:item.checkpointId,verifiedAt:item.verifiedAt,accuracyM:Number(item.accuracyM)||0})):[],
      startedAt:session.startedAt,
      status:session.status||'paused',
      pausedReason:session.pausedReason||null,
      updatedAt:clock().toISOString()
    };
    try{storage.setItem(SESSION_KEY,JSON.stringify(safe))}catch{}
    return safe;
  }
  function remove(){try{storage.removeItem(SESSION_KEY)}catch{}}
  function questFor(session=read()){return session?getQuest(session.questId):null}
  function currentCheckpoint(session=read()){
    const quest=questFor(session);
    return quest?.checkpoints?.[Number(session?.checkpointIndex)||0]||null;
  }
  function emit(type,extra={}){
    const event={type,session:read(),quest:questFor(),checkpoint:currentCheckpoint(),telemetry,lastCompletion,...extra};
    for(const listener of listeners){try{listener(event)}catch{}}
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('tripquest:quest-session',{detail:event}));
    return event;
  }
  function resetVerifier(){
    const session=read(),quest=questFor(session),checkpoint=currentCheckpoint(session);
    verifier=checkpoint&&quest?createCheckpointVerifier(checkpoint,quest.verification||{}):null;
    telemetry=null;
  }
  function updateSession(patch={}){
    const current=read();if(!current)return null;
    return write({...current,...patch});
  }
  async function ensureCanTrack(){
    if(!consent.isAgreed())throw questError('consent_required','QUEST GPS 인증을 시작하려면 위치 사용 동의가 필요합니다.',false);
    const supported=gps.support();
    if(!supported.ok)throw questError(supported.error.type,supported.error.message,supported.error.recoverable);
    const permission=await gps.permissionState();
    if(permission==='denied')throw questError('permission_denied','위치 권한이 차단되어 있습니다. 브라우저 또는 기기 설정에서 위치 권한을 허용해주세요.',false);
    return permission;
  }
  function stopWatch(){gps.stop()}
  function verifyPosition(position){
    const session=read(),quest=questFor(session),checkpoint=currentCheckpoint(session);
    if(!session||!quest||!checkpoint||!verifier)return;
    const result=verifier.evaluate(position,receivedNow());
    telemetry={
      status:result.status,
      distanceM:Number.isFinite(result.distanceM)?Math.round(result.distanceM):null,
      accuracyM:Number.isFinite(result.accuracyM)?Math.round(result.accuracyM):null,
      hits:Number(result.hits)||0,
      dwellMs:Number(result.dwellMs)||0,
      progress:Number(result.progress)||0,
      updatedAt:clock().toISOString()
    };
    emit('position');

    if(!result.verified)return;
    const verified=[...(session.verified||[]),{checkpointId:checkpoint.id,verifiedAt:clock().toISOString(),accuracyM:Math.round(Number(result.accuracyM)||0)}];
    const nextIndex=(Number(session.checkpointIndex)||0)+1;
    if(nextIndex>=quest.checkpoints.length){
      stopWatch();
      const completion=progress.completeQuest(quest,verified.map(item=>item.checkpointId),clock());
      lastCompletion={questId:quest.id,questTitle:quest.title,xp:Number(quest.xp)||0,newTitles:completion.newTitles||[],stats:completion.stats};
      remove();verifier=null;telemetry=null;
      emit('completed',{completion:lastCompletion});
      return;
    }
    write({...session,verified,checkpointIndex:nextIndex,status:'active',pausedReason:null});
    resetVerifier();
    emit('checkpoint_complete',{verifiedCheckpointId:checkpoint.id});
  }
  function gpsFailure(error){
    stopWatch();
    telemetry={status:'error',errorType:error?.type||'unknown',message:error?.message||'GPS 오류가 발생했습니다.',updatedAt:clock().toISOString()};
    updateSession({status:'error',pausedReason:error?.type||'gps_error'});
    emit('error',{error});
  }
  async function begin(questId,{resume=false}={}){
    await ensureCanTrack();
    let session=read(),quest=getQuest(questId||session?.questId);
    if(!quest)throw questError('quest_missing','QUEST 정보를 찾지 못했습니다.',false);

    if(!resume||!session||session.questId!==quest.id){
      session=write({questId:quest.id,checkpointIndex:0,verified:[],startedAt:clock().toISOString(),status:'locating',pausedReason:null});
    }else{
      session=write({...session,status:'locating',pausedReason:null});
    }
    resetVerifier();
    gps.watch({onPosition:verifyPosition,onError:gpsFailure});
    updateSession({status:'active',pausedReason:null});
    emit(resume?'resumed':'started');
    return read();
  }
  async function resume(){
    const session=read();
    if(!session)throw questError('session_missing','재개할 QUEST가 없습니다.',false);
    return begin(session.questId,{resume:true});
  }
  function pause(reason='manual'){
    if(!read())return null;
    stopWatch();
    const session=updateSession({status:'paused',pausedReason:reason});
    telemetry=null;emit('paused',{reason});return session;
  }
  function cancel(){
    stopWatch();remove();verifier=null;telemetry=null;lastCompletion=null;emit('cancelled');return true;
  }
  function subscribe(listener){listeners.add(listener);return ()=>listeners.delete(listener)}
  function getSnapshot(){return {session:read(),quest:questFor(),checkpoint:currentCheckpoint(),telemetry,lastCompletion,isWatching:gps.isWatching()}}
  function clearCompletion(){lastCompletion=null}

  return {begin,resume,pause,cancel,subscribe,getSnapshot,clearCompletion,key:SESSION_KEY};
}

export const questSessionService=createQuestSessionService();

import { $, esc, toast } from '../core/dom.js';
import { locationConsentService } from '../services/location-consent-service.js';
import { questService } from '../services/quest-service.js';
import { questSessionService } from '../services/quest-session-service.js';

function meterLabel(value){
  const n=Number(value);
  if(!Number.isFinite(n))return '측정 중';
  return n>=1000?`${(n/1000).toFixed(1)}km`:`${Math.round(n)}m`;
}
function statusCopy(telemetry,quest){
  if(!telemetry)return {title:'GPS 확인 대기',body:'앱이 활성화되면 현재 위치를 확인합니다.',tone:'normal'};
  if(telemetry.status==='weak')return {title:'GPS 정확도 개선 중',body:`현재 정확도 ±${telemetry.accuracyM??'?'}m · 인증 기준 ±${quest?.verification?.maxAccuracyM||80}m`,tone:'warn'};
  if(telemetry.status==='stale')return {title:'오래된 위치 정보',body:'새 위치 정보를 기다리고 있습니다.',tone:'warn'};
  if(telemetry.status==='jump')return {title:'비정상 위치 변화 감지',body:'갑작스러운 좌표 변화는 인증에서 제외했습니다.',tone:'warn'};
  if(telemetry.status==='outside')return {title:'목적지까지 이동 중',body:`최종 목적지까지 약 ${meterLabel(telemetry.distanceM)}`,tone:'normal'};
  if(telemetry.status==='verifying')return {title:'도착 위치 확인 중',body:`GPS 위치를 다시 확인하고 있습니다. · ${Math.round((telemetry.progress||0)*100)}%`,tone:'working'};
  if(telemetry.status==='error')return {title:'GPS 연결 오류',body:telemetry.message||'GPS 설정을 확인해주세요.',tone:'error'};
  return {title:'GPS 위치 확인 중',body:'현재 위치를 확인하고 있습니다.',tone:'working'};
}

export function initQuestPanel(){
  if(typeof document==='undefined'||$('#tqQuestOverlay'))return;
  const overlay=document.createElement('div');
  overlay.id='tqQuestOverlay';
  overlay.className='tq-quest-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <section class="tq-quest-sheet" role="dialog" aria-modal="true" aria-labelledby="tqQuestTitle">
      <div class="tq-sheet-handle" aria-hidden="true"></div>
      <header class="tq-quest-head">
        <div><small>TRIP QUEST</small><h2 id="tqQuestTitle">QUEST</h2></div>
        <button class="tq-quest-close" type="button" aria-label="QUEST 닫기">×</button>
      </header>
      <div id="tqQuestBody" class="tq-quest-body"></div>
    </section>`;
  document.body.appendChild(overlay);
  const body=$('#tqQuestBody');

  function close(){
    overlay.hidden=true;
    document.body.classList.remove('tq-quest-open');
    window.dispatchEvent(new CustomEvent('tripquest:quest-closed'));
  }
  function open(){
    overlay.hidden=false;
    document.body.classList.add('tq-quest-open');
    render();
    requestAnimationFrame(()=>overlay.querySelector('.tq-quest-close')?.focus({preventScroll:true}));
  }

  function renderEmpty(){
    const completed=questService.getStats().completedCount;
    body.innerHTML=`
      <section class="tq-quest-empty">
        <small>COURSE QUEST</small>
        <h3>먼저 여행 코스를 선택하세요.</h3>
        <p>탐색에서 목적지를 선택한 뒤 A코스 또는 B코스를 설정하면 그 코스에 맞는 QUEST가 자동 생성됩니다.</p>
        <div class="tq-quest-reward-pending">완료 보상은 추후 설정 예정 · 지금은 GPS 방문 완료 기록만 저장</div>
        ${completed?`<p style="margin-top:12px">완료한 QUEST ${completed}회</p>`:''}
      </section>`;
  }

  function renderActive(){
    const snap=questSessionService.getSnapshot();
    const {session,quest,checkpoint,telemetry}=snap;
    if(!session||!quest){renderEmpty();return}
    const gpsOn=locationConsentService.isEnabled();
    const status=statusCopy(telemetry,quest);
    const routeStops=Array.isArray(quest.routeStops)?quest.routeStops:[];
    body.innerHTML=`
      <section class="tq-quest-live">
        <div class="tq-quest-live-head">
          <div><small>COURSE QUEST</small><h3>${esc(quest.title)}</h3></div>
          <b>${esc(quest.course?.id||'')}코스</b>
        </div>
        <div class="tq-quest-route">
          <span>설정된 코스</span>
          <ol>${routeStops.length?routeStops.map(stop=>`<li>${esc(stop.name)}</li>`).join(''):`<li>${esc(checkpoint?.name||'최종 목적지')}</li>`}</ol>
        </div>
        <div class="tq-quest-next">
          <small>GPS COMPLETE POINT</small>
          <strong>${esc(checkpoint?.name||'최종 목적지')}</strong>
          <span>도착 후 앱이 활성화되어 있을 때 위치를 확인합니다.</span>
        </div>
        <div class="tq-gps-status ${gpsOn?status.tone:'warn'}">
          <i></i>
          <div><strong>${gpsOn?esc(status.title):'GPS OFF'}</strong><p>${gpsOn?esc(status.body):'MY > 위치 및 GPS에서 GPS를 켜야 자동 확인됩니다.'}</p></div>
        </div>
        <div class="tq-gps-metrics">
          <div><span>목표 거리</span><strong>${meterLabel(telemetry?.distanceM)}</strong></div>
          <div><span>GPS 정확도</span><strong>${telemetry?.accuracyM!=null?'±'+telemetry.accuracyM+'m':'측정 전'}</strong></div>
          <div><span>확인 횟수</span><strong>${telemetry?.hits||0}/${quest.verification?.requiredHits||2}</strong></div>
          <div><span>앱 상태</span><strong>${document.hidden?'비활성':'활성'}</strong></div>
        </div>
        <div class="tq-quest-reward-pending">QUEST 보상은 추후 설정 예정</div>
        ${gpsOn?'<button class="tq-quest-start" type="button" data-quest-action="verify">현재 위치로 완료 확인 →</button>':'<button class="tq-quest-start" type="button" data-quest-action="gps-settings">GPS 설정 열기 →</button>'}
        <button class="tq-quest-cancel" type="button" data-quest-action="cancel">현재 QUEST 취소</button>
        <p class="tq-quest-live-note">앱이 꺼져 있거나 백그라운드 상태에서는 QUEST가 완료되지 않습니다. 앱을 다시 열면 GPS 확인을 자동 재개합니다.</p>
      </section>`;
  }

  function renderCompletion(completion){
    body.innerHTML=`
      <section class="tq-quest-complete">
        <small>QUEST COMPLETE</small>
        <div class="tq-quest-complete-mark">✓</div>
        <h3>${esc(completion?.questTitle||'코스 QUEST 완료')}</h3>
        <p>GPS로 최종 목적지 도착을 확인했습니다.</p>
        <div class="tq-quest-reward-pending">보상 시스템은 추후 업데이트에서 설정됩니다.</div>
        <button class="tq-quest-start" type="button" data-quest-action="home">확인 →</button>
      </section>`;
  }

  function render(){
    const snap=questSessionService.getSnapshot();
    if(snap.lastCompletion){renderCompletion(snap.lastCompletion);return}
    if(snap.session)renderActive();
    else renderEmpty();
  }

  async function maintainTracking({manual=false}={}){
    const snap=questSessionService.getSnapshot();
    if(!snap.session||!locationConsentService.isEnabled()||document.hidden)return false;
    if(snap.isWatching)return true;
    try{
      await questSessionService.resume();
      if(manual&&!overlay.hidden)toast('현재 위치 확인을 시작했습니다.');
      return true;
    }catch(error){
      if(manual||!overlay.hidden)toast(error.message||'GPS 위치 확인을 시작하지 못했습니다.');
      return false;
    }
  }

  body.addEventListener('click',async e=>{
    const action=e.target.closest('[data-quest-action]')?.dataset.questAction;
    if(action==='home'){questSessionService.clearCompletion();render();return}
    if(action==='verify'){await maintainTracking({manual:true});render();return}
    if(action==='gps-settings'){
      close();
      window.dispatchEvent(new CustomEvent('tripquest:open-gps-settings'));
      return;
    }
    if(action==='cancel'){
      if(confirm('현재 코스 QUEST를 취소할까요?')){questSessionService.cancel();render()}
    }
  });

  questSessionService.subscribe(event=>{
    if(event.type==='armed'){
      maintainTracking().catch(()=>{});
      if(!overlay.hidden)render();
      return;
    }
    if(event.type==='completed'){
      toast(`QUEST 완료 · ${event.completion?.questTitle||'코스 도착 인증'}`);
      if(!overlay.hidden)renderCompletion(event.completion||event.lastCompletion);
      return;
    }
    if(!overlay.hidden&&['position','started','resumed','paused','error'].includes(event.type))renderActive();
  });

  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tq-quest-close'))close()});
  window.addEventListener('tripquest:open-quest',open);
  window.addEventListener('tripquest:close-quest',close);
  window.addEventListener('tripquest:location-consent-change',()=>{maintainTracking().catch(()=>{});if(!overlay.hidden)render()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){
      if(questSessionService.getSnapshot().isWatching)questSessionService.pause('background');
    }else{
      maintainTracking().catch(()=>{});
      if(!overlay.hidden)render();
    }
  });

  setTimeout(()=>maintainTracking().catch(()=>{}),0);
}

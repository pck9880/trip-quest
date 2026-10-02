import { $, esc, toast } from '../core/dom.js';
import { locationConsentService } from '../services/location-consent-service.js';
import { questService } from '../services/quest-service.js';
import { questSessionService } from '../services/quest-session-service.js';

function meterLabel(value){
  const n=Number(value);
  if(!Number.isFinite(n))return '측정 전';
  return n>=1000?`${(n/1000).toFixed(1)}km`:`${Math.round(n)}m`;
}
function statusCopy(telemetry,quest){
  if(!telemetry)return {title:'보상 확인 대기',body:'목적지에 도착하면 보상받기를 눌러 GPS 위치를 확인하세요.',tone:'normal'};
  if(telemetry.status==='weak')return {title:'GPS 정확도가 아직 부족해요',body:`현재 정확도 ±${telemetry.accuracyM??'?'}m · 인증 기준 ±${quest?.verification?.maxAccuracyM||80}m`,tone:'warn'};
  if(telemetry.status==='stale')return {title:'새 위치가 필요해요',body:'다시 보상받기를 눌러 현재 위치를 확인해주세요.',tone:'warn'};
  if(telemetry.status==='outside')return {title:'아직 목적지가 아니에요',body:`완료 지점까지 약 ${meterLabel(telemetry.distanceM)} 남아 있어요.`,tone:'warn'};
  if(telemetry.status==='error')return {title:'GPS 확인에 문제가 생겼어요',body:telemetry.message||'GPS 설정을 확인해주세요.',tone:'error'};
  return {title:'GPS 위치 확인 준비',body:'보상받기를 누르면 현재 위치를 확인합니다.',tone:'normal'};
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

  function showNotice({title,bodyText,tone='sad'}){
    let pop=$('#tqQuestRewardPopup');
    if(!pop){
      pop=document.createElement('div');
      pop.id='tqQuestRewardPopup';
      pop.className='tq-quest-reward-popup';
      document.body.appendChild(pop);
    }
    pop.className=`tq-quest-reward-popup ${tone}`;
    pop.innerHTML=`<div role="dialog" aria-modal="true" aria-labelledby="tqQuestRewardPopupTitle"><small>QUEST CHECK</small><h3 id="tqQuestRewardPopupTitle">${esc(title)}</h3><p>${esc(bodyText)}</p><button type="button">확인</button></div>`;
    pop.hidden=false;
    const dismiss=()=>{pop.hidden=true};
    pop.querySelector('button').onclick=dismiss;
    pop.onclick=e=>{if(e.target===pop)dismiss()};
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
          <small>REWARD POINT</small>
          <strong>${esc(checkpoint?.name||'최종 목적지')}</strong>
          <span>목적지에 도착한 뒤 보상받기를 누르면 현재 GPS 위치를 한 번 확인합니다.</span>
        </div>
        <div class="tq-gps-status ${gpsOn?status.tone:'warn'}">
          <i></i>
          <div><strong>${gpsOn?esc(status.title):'GPS OFF'}</strong><p>${gpsOn?esc(status.body):'MY > 위치 및 GPS에서 GPS를 켜주세요.'}</p></div>
        </div>
        <div class="tq-gps-metrics">
          <div><span>최근 확인 거리</span><strong>${meterLabel(telemetry?.distanceM)}</strong></div>
          <div><span>GPS 정확도</span><strong>${telemetry?.accuracyM!=null?'±'+telemetry.accuracyM+'m':'측정 전'}</strong></div>
          <div><span>완료 위치</span><strong>${esc(checkpoint?.name||'목적지')}</strong></div>
          <div><span>앱 상태</span><strong>${document.hidden?'비활성':'활성'}</strong></div>
        </div>
        <div class="tq-quest-reward-pending">QUEST 보상 내용은 추후 설정 예정</div>
        ${gpsOn?'<button class="tq-quest-start tq-reward-claim" type="button" data-quest-action="claim">보상받기</button>':'<button class="tq-quest-start" type="button" data-quest-action="gps-settings">GPS 설정 열기 →</button>'}
        <button class="tq-quest-cancel" type="button" data-quest-action="cancel">현재 QUEST 취소</button>
        <p class="tq-quest-live-note">앱이 꺼져 있거나 백그라운드 상태에서는 위치를 확인하지 않습니다. 목적지에 도착한 뒤 앱을 열고 보상받기를 눌러주세요.</p>
      </section>`;
  }

  function renderCompletion(completion){
    body.innerHTML=`
      <section class="tq-quest-complete">
        <small>QUEST COMPLETE</small>
        <div class="tq-quest-complete-mark">✓</div>
        <h3>${esc(completion?.questTitle||'코스 QUEST 완료')}</h3>
        <p>GPS로 최종 목적지 도착을 확인했습니다.</p>
        <div class="tq-quest-reward-pending">보상 시스템 상세는 추후 업데이트에서 설정됩니다.</div>
        <button class="tq-quest-start" type="button" data-quest-action="home">확인 →</button>
      </section>`;
  }

  function render(){
    const snap=questSessionService.getSnapshot();
    if(snap.lastCompletion){renderCompletion(snap.lastCompletion);return}
    if(snap.session)renderActive();else renderEmpty();
  }

  function failedCopy(result){
    const checkpoint=result?.checkpoint?.name||'QUEST 목적지';
    const reason=result?.reason;
    if(reason==='outside'){
      const distance=meterLabel(result?.result?.distanceM);
      return {title:'아쉽지만 아직 보상을 받을 수 없어요.',bodyText:`현재 위치가 ${checkpoint} 완료 지점에서 약 ${distance} 떨어져 있어요. 목적지에 도착한 뒤 다시 보상받기를 눌러주세요.`};
    }
    if(reason==='weak')return {title:'거의 다 왔는데 GPS가 아직 확실하지 않아요.',bodyText:'조금 더 열린 곳에서 잠시 기다린 뒤 보상받기를 다시 눌러주세요.'};
    if(reason==='stale')return {title:'위치 확인이 조금 늦었어요.',bodyText:'현재 위치를 새로 확인할 수 있도록 보상받기를 한 번 더 눌러주세요.'};
    return {title:'아쉽지만 지금은 보상을 확인할 수 없어요.',bodyText:'GPS 상태를 확인한 뒤 목적지에서 다시 시도해주세요.'};
  }

  body.addEventListener('click',async e=>{
    const action=e.target.closest('[data-quest-action]')?.dataset.questAction;
    if(action==='home'){questSessionService.clearCompletion();render();return}
    if(action==='claim'){
      const button=e.target.closest('[data-quest-action="claim"]');
      if(button){button.disabled=true;button.textContent='현재 위치 확인 중…'}
      try{
        const result=await questSessionService.claimReward();
        if(!result?.ok){
          const copy=failedCopy(result);
          showNotice(copy);
          renderActive();
        }
      }catch(error){
        showNotice({title:'보상 확인을 마치지 못했어요.',bodyText:error.message||'GPS 상태를 확인하고 다시 시도해주세요.',tone:'error'});
        renderActive();
      }
      return;
    }
    if(action==='gps-settings'){close();window.dispatchEvent(new CustomEvent('tripquest:open-gps-settings'));return}
    if(action==='cancel'){if(confirm('현재 코스 QUEST를 취소할까요?')){questSessionService.cancel();render()}}
  });

  questSessionService.subscribe(event=>{
    if(event.type==='completed'){
      toast(`QUEST 완료 · ${event.completion?.questTitle||'코스 도착 인증'}`);
      if(!overlay.hidden)renderCompletion(event.completion||event.lastCompletion);
      return;
    }
    if(!overlay.hidden&&['armed','claim_failed','error','checkpoint_complete'].includes(event.type))render();
  });

  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tq-quest-close'))close()});
  window.addEventListener('tripquest:open-quest',open);
  window.addEventListener('tripquest:close-quest',close);
  window.addEventListener('tripquest:location-consent-change',()=>{if(!overlay.hidden)render()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
}

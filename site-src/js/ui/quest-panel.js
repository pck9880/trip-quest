import { $, esc, toast } from '../core/dom.js';
import { QUESTS, dailyQuest, getQuest } from '../data/quest-data.js';
import { locationConsentService } from '../services/location-consent-service.js';
import { gpsService } from '../services/gps-service.js';
import { questService } from '../services/quest-service.js';
import { questSessionService } from '../services/quest-session-service.js';

function meterLabel(value){
  const n=Number(value);
  if(!Number.isFinite(n))return '측정 중';
  return n>=1000?`${(n/1000).toFixed(1)}km`:`${Math.round(n)}m`;
}
function seconds(ms){return Math.max(0,Math.ceil(Number(ms||0)/1000))}
function statusCopy(telemetry,quest){
  if(!telemetry)return {title:'GPS 위치 확인 중',body:'기기 위치를 찾고 있습니다.',tone:'working'};
  if(telemetry.status==='weak')return {title:'GPS 정확도 개선 중',body:`현재 정확도 ±${telemetry.accuracyM??'?'}m · 인증 기준 ±${quest?.verification?.maxAccuracyM||60}m`,tone:'warn'};
  if(telemetry.status==='stale')return {title:'오래된 위치 정보',body:'새 GPS 위치를 기다리고 있습니다.',tone:'warn'};
  if(telemetry.status==='jump')return {title:'비정상 위치 변화 감지',body:'갑작스러운 좌표 이동은 인증에서 제외했습니다.',tone:'warn'};
  if(telemetry.status==='outside')return {title:'체크포인트로 이동하세요',body:`목표까지 약 ${meterLabel(telemetry.distanceM)}`,tone:'normal'};
  if(telemetry.status==='verifying')return {title:'현장 인증 중',body:`목표 반경 안에서 위치를 확인하고 있습니다. · ${Math.round((telemetry.progress||0)*100)}%`,tone:'working'};
  if(telemetry.status==='error')return {title:'GPS 연결 오류',body:telemetry.message||'위치를 다시 연결해주세요.',tone:'error'};
  return {title:'GPS 인증 준비',body:'현재 위치를 확인하고 있습니다.',tone:'working'};
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
  let selectedQuestId=null;

  function close(){
    const snap=questSessionService.getSnapshot();
    if(snap.isWatching)questSessionService.pause('panel_closed');
    overlay.hidden=true;document.body.classList.remove('tq-quest-open');
    window.dispatchEvent(new CustomEvent('tripquest:quest-closed'));
  }
  function open(){
    overlay.hidden=false;document.body.classList.add('tq-quest-open');
    const snap=questSessionService.getSnapshot();
    if(snap.session)renderActive();
    else renderHome();
    requestAnimationFrame(()=>overlay.querySelector('.tq-quest-close')?.focus({preventScroll:true}));
  }

  function progressHeader(){
    const stats=questService.getStats(),title=stats.equippedTitleInfo?.name||'칭호 없음';
    return `<section class="tq-quest-profile"><div><small>QUEST LEVEL</small><strong>LV.${stats.level}</strong></div><div><span>XP</span><b>${stats.xp}</b></div><div><span>현재 칭호</span><b>《${esc(title)}》</b></div></section>`;
  }

  function questCard(quest,{daily=false}={}){
    const completedToday=questService.exportData().completed.some(item=>item.questId===quest.id&&String(item.completedAt||'').slice(0,10)===new Date().toISOString().slice(0,10));
    return `<button class="tq-quest-card" type="button" data-quest-id="${esc(quest.id)}">
      <div class="tq-quest-card-top"><span>${daily?'TODAY QUEST':esc(quest.region)}</span><b>+${quest.xp} XP</b></div>
      <h3>${esc(quest.title)}</h3><p>${esc(quest.summary)}</p>
      <div class="tq-quest-tags"><span>GPS 인증</span><span>${quest.checkpoints.length} CHECKPOINTS</span><span>${esc(quest.difficulty)}</span>${completedToday?'<span class="done">오늘 완료 ✓</span>':''}</div>
    </button>`;
  }

  function renderHome(){
    const today=dailyQuest();
    body.innerHTML=`
      ${progressHeader()}
      <section class="tq-quest-intro"><small>REAL WORLD QUEST</small><h3>직접 방문하고 GPS로 인증하세요.</h3><p>전체 이동 경로는 저장하지 않고, 체크포인트 인증 결과만 이 기기에 기록합니다.</p></section>
      <div class="tq-quest-section-title"><strong>오늘의 QUEST</strong><span>GPS 실방문 인증</span></div>
      ${questCard(today,{daily:true})}
      <div class="tq-quest-section-title"><strong>지역 QUEST</strong><span>${QUESTS.length}개</span></div>
      <div class="tq-quest-list">${QUESTS.filter(q=>q.id!==today.id).map(q=>questCard(q)).join('')}</div>`;
  }

  function renderDetail(id){
    const quest=getQuest(id);if(!quest){renderHome();return}
    selectedQuestId=id;
    const consent=locationConsentService.status();
    body.innerHTML=`
      <button class="tq-quest-back" type="button" data-quest-action="home">← QUEST 목록</button>
      <section class="tq-quest-detail">
        <small>${esc(quest.region)} · GPS QUEST</small><h3>${esc(quest.title)}</h3><p>${esc(quest.summary)}</p>
        <div class="tq-quest-reward"><span>완료 보상</span><strong>+${quest.xp} XP</strong></div>
        <ol class="tq-quest-checkpoints">${quest.checkpoints.map((cp,i)=>`<li><i>${i+1}</i><div><b>${esc(cp.name)}</b><small>${esc(cp.category)}</small></div><span>GPS</span></li>`).join('')}</ol>
        <div class="tq-quest-rule"><b>인증 기준</b><span>반경 ${quest.verification.radiusM}m · GPS 정확도 ±${quest.verification.maxAccuracyM}m 이하 · 연속 ${quest.verification.requiredHits}회 · 최소 ${seconds(quest.verification.dwellMs)}초 체류</span></div>
        <button class="tq-quest-start" type="button" data-quest-action="consent">${consent.agreed?'위치 사용 확인하고 QUEST 시작':'위치 사용 동의 후 QUEST 시작'} →</button>
      </section>`;
  }

  function renderConsent(){
    const quest=getQuest(selectedQuestId);if(!quest){renderHome();return}
    const current=locationConsentService.status();
    body.innerHTML=`
      <button class="tq-quest-back" type="button" data-quest-action="detail">← QUEST 정보</button>
      <section class="tq-quest-consent">
        <small>LOCATION CONSENT</small><h3>QUEST 위치정보 사용 안내</h3>
        <p><b>${esc(quest.title)}</b>의 실제 체크포인트 방문을 확인하기 위해 위치 정보가 필요합니다.</p>
        <div><b>사용 목적</b><span>QUEST 목적지 도착 확인 · 체크포인트 방문 인증 · 완료 판정</span></div>
        <div><b>저장 방식</b><span>전체 이동 경로와 실시간 좌표 기록은 저장하지 않습니다. 인증된 장소, 인증 시각, GPS 정확도만 기기에 저장합니다.</span></div>
        <div><b>PWA 제한</b><span>화면을 닫거나 백그라운드로 전환하면 GPS 인증이 중단될 수 있으며, 돌아온 뒤 다시 재개해야 합니다.</span></div>
        <label class="tq-quest-consent-check"><input id="tqQuestConsentCheck" type="checkbox" ${current.agreed?'checked':''}><span>위 안내를 확인했고 QUEST 인증을 위한 위치 사용에 동의합니다.</span></label>
        <button class="tq-quest-start" type="button" data-quest-action="agree-start">동의하고 GPS QUEST 시작 →</button>
        <button class="tq-quest-cancel" type="button" data-quest-action="detail">취소</button>
      </section>`;
  }

  function renderActive(){
    const snap=questSessionService.getSnapshot(),session=snap.session,quest=snap.quest,checkpoint=snap.checkpoint;
    if(!session||!quest){renderHome();return}
    const telemetry=snap.telemetry,status=statusCopy(telemetry,quest),verified=session.verified||[];
    const progressPct=Math.round((verified.length/quest.checkpoints.length)*100);
    const paused=session.status==='paused'||session.status==='error';
    body.innerHTML=`
      <section class="tq-quest-live">
        <div class="tq-quest-live-head"><div><small>QUEST ACTIVE</small><h3>${esc(quest.title)}</h3></div><b>${verified.length}/${quest.checkpoints.length}</b></div>
        <div class="tq-quest-overall"><span style="width:${progressPct}%"></span></div>
        <div class="tq-quest-next"><small>NEXT CHECKPOINT</small><strong>${esc(checkpoint?.name||'완료 처리 중')}</strong><span>${esc(checkpoint?.category||'')}</span></div>
        <div class="tq-gps-status ${status.tone}">
          <i></i><div><strong>${esc(status.title)}</strong><p>${esc(status.body)}</p></div>
        </div>
        <div class="tq-gps-metrics">
          <div><span>목표 거리</span><strong>${meterLabel(telemetry?.distanceM)}</strong></div>
          <div><span>GPS 정확도</span><strong>${telemetry?.accuracyM!=null?'±'+telemetry.accuracyM+'m':'측정 중'}</strong></div>
          <div><span>연속 확인</span><strong>${telemetry?.hits||0}/${quest.verification.requiredHits}</strong></div>
          <div><span>체류</span><strong>${Math.floor((telemetry?.dwellMs||0)/1000)}/${seconds(quest.verification.dwellMs)}초</strong></div>
        </div>
        <ol class="tq-quest-live-checkpoints">${quest.checkpoints.map((cp,i)=>`<li class="${verified.some(v=>v.checkpointId===cp.id)?'done':i===session.checkpointIndex?'active':''}"><i>${verified.some(v=>v.checkpointId===cp.id)?'✓':i+1}</i><span>${esc(cp.name)}</span></li>`).join('')}</ol>
        ${paused?`<button class="tq-quest-start" type="button" data-quest-action="resume">GPS 인증 재개 →</button>`:''}
        <button class="tq-quest-cancel" type="button" data-quest-action="cancel">QUEST 중단</button>
        <p class="tq-quest-live-note">GPS는 이 QUEST 화면이 열려 있는 동안 사용됩니다. 백그라운드 전환 시 인증을 일시중지합니다.</p>
      </section>`;
  }

  function renderCompletion(completion){
    const title=completion?.newTitles?.[0];
    body.innerHTML=`
      <section class="tq-quest-complete">
        <small>QUEST COMPLETE</small><div class="tq-quest-complete-mark">✓</div>
        <h3>${esc(completion?.questTitle||'QUEST 완료')}</h3>
        <strong>+${Number(completion?.xp)||0} XP</strong>
        ${title?`<div class="tq-new-title"><span>NEW TITLE</span><b>《${esc(title.name)}》</b><small>${esc(title.description)}</small></div>`:''}
        <button class="tq-quest-start" type="button" data-quest-action="home">QUEST 목록으로 →</button>
      </section>`;
  }

  async function startSelected(){
    const quest=getQuest(selectedQuestId);if(!quest)return;
    const check=$('#tqQuestConsentCheck');
    if(!check?.checked){toast('위치정보 사용 동의를 확인해주세요.');return}
    locationConsentService.agree();
    try{
      const support=gpsService.support();
      if(!support.ok)throw Object.assign(new Error(support.error.message),support.error);
      await questSessionService.begin(quest.id);
      renderActive();
    }catch(error){
      toast(error.message||'GPS QUEST를 시작하지 못했습니다.');
      renderActive();
      if(!questSessionService.getSnapshot().session)renderConsent();
    }
  }

  body.addEventListener('click',async e=>{
    const card=e.target.closest('[data-quest-id]');
    if(card){renderDetail(card.dataset.questId);return}
    const action=e.target.closest('[data-quest-action]')?.dataset.questAction;
    if(action==='home'){questSessionService.clearCompletion();selectedQuestId=null;renderHome();return}
    if(action==='detail'){renderDetail(selectedQuestId);return}
    if(action==='consent'){renderConsent();return}
    if(action==='agree-start'){await startSelected();return}
    if(action==='resume'){
      try{await questSessionService.resume();renderActive()}catch(error){toast(error.message||'GPS 인증을 재개하지 못했습니다.');renderActive()}
      return;
    }
    if(action==='cancel'){
      if(confirm('진행 중인 QUEST를 중단할까요? 현재 체크포인트 진행은 삭제됩니다.')){questSessionService.cancel();renderHome()}
    }
  });

  questSessionService.subscribe(event=>{
    if(overlay.hidden)return;
    if(event.type==='completed'){renderCompletion(event.completion||event.lastCompletion);return}
    if(['position','started','resumed','paused','error','checkpoint_complete'].includes(event.type))renderActive();
  });

  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tq-quest-close'))close()});
  window.addEventListener('tripquest:open-quest',open);
  window.addEventListener('tripquest:close-quest',close);
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&questSessionService.getSnapshot().isWatching)questSessionService.pause('background')});
}

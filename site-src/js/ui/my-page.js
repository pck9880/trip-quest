import { $, esc, toast } from '../core/dom.js';
import { fmtWon, fmtMin, fmtKm } from '../core/format.js';
import { keepService } from '../services/keep-service.js';
import { profileService, getProfileAvatar, saveProfileAvatar, removeProfileAvatar } from '../services/profile-service.js';
import { attendanceService } from '../services/attendance-service.js';
import { historyService } from '../services/history-service.js';

function dateLabel(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(d);
}
function todayLabel(){
  return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date());
}
function modeLabel(mode){return mode==='drive'?'차량':'도보'}

export function initMyPage(){
  if(typeof document==='undefined'||$('#tqMyOverlay'))return;
  const overlay=document.createElement('div');
  overlay.id='tqMyOverlay';
  overlay.className='tq-my-overlay';
  overlay.hidden=true;
  overlay.innerHTML=`
    <section class="tq-my-sheet" role="dialog" aria-modal="true" aria-labelledby="tqMyTitle">
      <div class="tq-sheet-handle" aria-hidden="true"></div>
      <header class="tq-my-head">
        <div><small>TRIP QUEST</small><h2 id="tqMyTitle">MY PAGE</h2></div>
        <button class="tq-my-close" type="button" aria-label="마이페이지 닫기">×</button>
      </header>
      <div id="tqMyBody" class="tq-my-body"></div>
    </section>`;
  document.body.appendChild(overlay);

  const body=$('#tqMyBody');
  let avatarUrl='';

  async function avatarMarkup(className='tq-profile-avatar'){
    if(avatarUrl){URL.revokeObjectURL(avatarUrl);avatarUrl=''}
    const blob=await getProfileAvatar();
    if(blob){
      avatarUrl=URL.createObjectURL(blob);
      return `<img class="${className}" src="${esc(avatarUrl)}" alt="프로필 이미지">`;
    }
    return `<span class="${className} tq-profile-avatar-fallback">TQ</span>`;
  }

  const close=()=>{
    overlay.hidden=true;
    document.body.classList.remove('tq-my-open');
    window.dispatchEvent(new CustomEvent('tripquest:my-closed'));
  };
  const open=async()=>{
    await renderHome();
    overlay.hidden=false;
    document.body.classList.add('tq-my-open');
    requestAnimationFrame(()=>overlay.querySelector('.tq-my-close')?.focus({preventScroll:true}));
  };

  async function renderHome(){
    const profile=profileService.get();
    const attendance=attendanceService.getSummary();
    const history=historyService.list();
    const avatar=await avatarMarkup();
    body.innerHTML=`
      <section class="tq-profile-card">
        <button class="tq-profile-photo-button" type="button" data-my-action="edit-profile" aria-label="프로필 수정">${avatar}</button>
        <div class="tq-profile-copy">
          <small>LOCAL TRAVELER</small>
          <h3>${esc(profile.nickname)}</h3>
          <p><b>${esc(profile.temporaryId)}</b> · 임시 여행자 ID</p>
          <em>로그인 기능 추가 후 계정에 연결할 수 있습니다.</em>
        </div>
        <button class="tq-profile-edit" type="button" data-my-action="edit-profile">프로필 수정</button>
      </section>

      <section class="tq-my-stats" aria-label="내 여행 현황">
        <div><span>다녀온 곳</span><strong>${historyService.uniquePlaceCount()}</strong></div>
        <div><span>KEEP</span><strong>${keepService.count()}</strong></div>
        <div><span>연속 출석</span><strong>${attendance.streak}<small>일</small></strong></div>
      </section>

      <section class="tq-attendance-card">
        <div class="tq-my-section-head"><div><small>DAILY CHECK</small><h3>오늘의 출석</h3></div><span>${esc(todayLabel())}</span></div>
        <div class="tq-attendance-row">
          <div><strong>${attendance.checkedToday?'오늘 출석 완료':'오늘도 여행 준비 완료?'}</strong><p>이번 달 ${attendance.monthCount}회 · 누적 ${attendance.total}회</p></div>
          <button id="tqAttendanceBtn" type="button" ${attendance.checkedToday?'disabled':''}>${attendance.checkedToday?'출석 완료 ✓':'출석 체크'}</button>
        </div>
      </section>

      <section class="tq-history-section">
        <div class="tq-my-section-head"><div><small>TRIP LOG</small><h3>내가 다녀온 곳</h3></div><span>${history.length}회 기록</span></div>
        <div class="tq-history-list">
          ${history.length?history.slice(0,10).map(item=>`<button class="tq-history-item" type="button" data-history-id="${esc(item.id)}"><span class="tq-history-date">${esc(dateLabel(item.completedAt))}</span><span class="tq-history-main"><strong>${esc(item.destination?.name||'여행지')}</strong><small>${esc(item.course?.id||'')}코스 · ${esc(modeLabel(item.course?.mode))} · ${esc((item.course?.stops||[]).slice(0,3).map(s=>s.name).join(' → ')||'여행 완료')}</small></span><span class="tq-history-arrow">›</span></button>`).join(''):`<div class="tq-history-empty"><strong>아직 완료한 여행이 없어요.</strong><p>코스를 선택한 뒤 ‘여행 완료’를 누르면 여기에 기록됩니다.</p></div>`}
        </div>
      </section>

      <section class="tq-my-settings">
        <div class="tq-my-section-head"><div><small>SETTINGS</small><h3>설정</h3></div></div>
        <button type="button" data-my-action="vehicle"><span><b>차량 및 연비</b><small>예상 연료비·통행료 계산 기준</small></span><i>›</i></button>
        <button type="button" data-my-action="profile"><span><b>프로필</b><small>닉네임·프로필 이미지·임시 ID</small></span><i>›</i></button>
        <div class="tq-my-local-note"><b>LOCAL PROFILE</b><span>프로필·KEEP·출석·여행 기록은 현재 이 기기에 저장됩니다.</span></div>
      </section>`;

    const attendanceBtn=$('#tqAttendanceBtn');
    if(attendanceBtn)attendanceBtn.onclick=()=>{
      const result=attendanceService.checkIn();
      toast(result.newCheckIn?`출석 완료 · ${result.streak}일 연속`:'오늘은 이미 출석했습니다.');
      renderHome();
    };
  }

  async function renderProfileEdit(){
    const profile=profileService.get();
    const avatar=await avatarMarkup('tq-profile-avatar tq-profile-avatar-large');
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← MY PAGE</button>
        <div class="tq-profile-editor">
          <div class="tq-profile-image-editor">
            <button id="tqAvatarChoose" type="button" class="tq-profile-avatar-edit">${avatar}<span>사진 변경</span></button>
            <input id="tqAvatarInput" type="file" accept="image/*" hidden>
            <button id="tqAvatarRemove" type="button" class="tq-profile-avatar-remove">이미지 삭제</button>
          </div>
          <label class="tq-profile-field"><span>닉네임</span><input id="tqNicknameInput" maxlength="20" value="${esc(profile.nickname)}" placeholder="여행자 닉네임"></label>
          <div class="tq-profile-id-card"><span>임시 여행자 ID</span><strong>${esc(profile.temporaryId)}</strong><small>추후 로그인/회원 기능에서 이 로컬 데이터를 계정에 연결할 수 있도록 분리해두었습니다.</small></div>
          <button id="tqProfileSave" class="tq-profile-save" type="button">프로필 저장</button>
        </div>
      </div>`;

    const fileInput=$('#tqAvatarInput');
    $('#tqAvatarChoose').onclick=()=>fileInput.click();
    fileInput.onchange=async()=>{
      const file=fileInput.files?.[0];
      if(!file)return;
      try{await saveProfileAvatar(file);toast('프로필 이미지를 저장했습니다.');await renderProfileEdit()}
      catch(error){toast(error.message||'이미지를 저장하지 못했습니다.')}
    };
    $('#tqAvatarRemove').onclick=async()=>{await removeProfileAvatar();toast('프로필 이미지를 삭제했습니다.');await renderProfileEdit()};
    $('#tqProfileSave').onclick=async()=>{
      const nickname=$('#tqNicknameInput').value.trim();
      if(!nickname){toast('닉네임을 입력해주세요.');return}
      profileService.update({nickname});
      toast('프로필을 저장했습니다.');
      await renderHome();
    };
  }

  function renderHistoryDetail(id){
    const item=historyService.get(id);
    if(!item){renderHome();return}
    const c=item.course||{},route=c.route||{},cost=c.estimatedCost||{},stops=Array.isArray(c.stops)?c.stops:[];
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← 다녀온 곳</button>
        <section class="tq-history-detail">
          <small>TRIP LOG · ${esc(dateLabel(item.completedAt))}</small>
          <h3>${esc(item.destination?.name||'여행지')}</h3>
          <p>${esc(item.destination?.category||'여행지')} · ${esc(c.id||'')}코스</p>
          <div class="tq-history-metrics"><div><span>이동</span><strong>${esc(modeLabel(c.mode))}</strong></div><div><span>거리</span><strong>${Number(route.distanceKm)>0.05?fmtKm(route.distanceKm):'단일 장소'}</strong></div><div><span>소요</span><strong>${Number(route.timeMin)>0.5?fmtMin(route.timeMin):'체류형'}</strong></div><div><span>예상 비용</span><strong>${fmtWon(cost.total||0)}</strong></div></div>
          <div class="tq-history-stops"><span>완료 코스</span><ol>${stops.map((stop,index)=>`<li><i>${index+1}</i><b>${esc(stop.name)}</b><small>${esc(stop.category||'')}</small></li>`).join('')}</ol></div>
          <div class="tq-history-complete-mark">✓ 여행 완료 기록</div>
        </section>
      </div>`;
  }

  body.addEventListener('click',async e=>{
    const historyButton=e.target.closest('[data-history-id]');
    if(historyButton){renderHistoryDetail(historyButton.dataset.historyId);return}
    const action=e.target.closest('[data-my-action]')?.dataset.myAction;
    if(action==='home'){await renderHome();return}
    if(action==='edit-profile'||action==='profile'){await renderProfileEdit();return}
    if(action==='vehicle'){
      window.dispatchEvent(new CustomEvent('tripquest:open-vehicle-settings'));
      return;
    }
  });

  overlay.addEventListener('click',e=>{
    if(e.target===overlay||e.target.closest('.tq-my-close'))close();
  });
  window.addEventListener('tripquest:open-my',open);
  window.addEventListener('tripquest:close-my',close);
  window.addEventListener('tripquest:keep-change',()=>{if(!overlay.hidden)renderHome()});
  window.addEventListener('tripquest:history-change',()=>{if(!overlay.hidden)renderHome()});
  window.addEventListener('tripquest:profile-change',()=>{if(!overlay.hidden)renderHome()});
  window.addEventListener('tripquest:attendance-change',()=>{if(!overlay.hidden)renderHome()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});

  profileService.get();
}

import { $, esc, toast } from '../core/dom.js';
import { fmtWon, fmtMin, fmtKm } from '../core/format.js';
import { keepService, buildCourseKeep } from '../services/keep-service.js';
import { profileService, getProfileAvatar, saveProfileAvatar, removeProfileAvatar } from '../services/profile-service.js';
import { attendanceService } from '../services/attendance-service.js';
import { historyService } from '../services/history-service.js';
import { userDataService } from '../services/user-data-service.js';

function dateLabel(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime()))return '';
  return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'short',day:'numeric'}).format(d);
}
function todayLabel(){return new Intl.DateTimeFormat('ko-KR',{month:'long',day:'numeric',weekday:'short'}).format(new Date())}
function modeLabel(mode){return mode==='drive'?'차량':'도보'}
function monthTitle(year,month){return `${year}.${String(month).padStart(2,'0')}`}
function backupFileName(){
  const d=new Date();
  return `trip-quest-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
}

export function initMyPage({onOpenHistoryCourse}={}){
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
  let calendarCursor=new Date();

  async function avatarMarkup(className='tq-profile-avatar'){
    if(avatarUrl){URL.revokeObjectURL(avatarUrl);avatarUrl=''}
    const blob=await getProfileAvatar();
    if(blob){avatarUrl=URL.createObjectURL(blob);return `<img class="${className}" src="${esc(avatarUrl)}" alt="프로필 이미지">`}
    return `<span class="${className} tq-profile-avatar-fallback">TQ</span>`;
  }

  const close=()=>{
    overlay.hidden=true;
    document.body.classList.remove('tq-my-open');
    window.dispatchEvent(new CustomEvent('tripquest:my-closed'));
  };
  const open=async()=>{
    calendarCursor=new Date();
    await renderHome();
    overlay.hidden=false;
    document.body.classList.add('tq-my-open');
    requestAnimationFrame(()=>overlay.querySelector('.tq-my-close')?.focus({preventScroll:true}));
  };

  function calendarMarkup(){
    const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth()+1;
    const cal=attendanceService.monthCalendar(year,month);
    const blanks='<i></i>'.repeat(cal.firstWeekday);
    const days=cal.days.map(day=>`<span class="${day.checked?'checked ':''}${day.today?'today':''}" title="${esc(day.key)}">${day.day}${day.checked?'<b>✓</b>':''}</span>`).join('');
    return `<div class="tq-attendance-calendar">
      <div class="tq-calendar-nav"><button type="button" data-calendar="-1" aria-label="이전 달">‹</button><strong>${monthTitle(year,month)}</strong><button type="button" data-calendar="1" aria-label="다음 달">›</button></div>
      <div class="tq-calendar-week"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b></div>
      <div class="tq-calendar-days">${blanks}${days}</div>
      <small>이 달 출석 ${cal.checkedCount}회</small>
    </div>`;
  }

  async function renderHome(){
    const profile=profileService.get(),attendance=attendanceService.getSummary(),stats=historyService.stats(),history=historyService.list(),avatar=await avatarMarkup();
    body.innerHTML=`
      <section class="tq-profile-card">
        <button class="tq-profile-photo-button" type="button" data-my-action="edit-profile" aria-label="프로필 수정">${avatar}</button>
        <div class="tq-profile-copy">
          <small>LOCAL TRAVELER</small><h3>${esc(profile.nickname)}</h3>
          <p><b>${esc(profile.temporaryId)}</b> · 임시 여행자 ID</p>
          <em>로그인 기능 추가 후 계정에 연결할 수 있습니다.</em>
        </div>
        <button class="tq-profile-edit" type="button" data-my-action="edit-profile">프로필 수정</button>
      </section>

      <section class="tq-my-stats tq-my-stats-detailed" aria-label="내 여행 현황">
        <div><span>다녀온 곳</span><strong>${stats.uniquePlaces}</strong></div>
        <div><span>여행 완료</span><strong>${stats.totalTrips}<small>회</small></strong></div>
        <div><span>KEEP</span><strong>${keepService.count()}</strong></div>
        <div><span>코스 누적</span><strong>${stats.totalCourseKm.toFixed(1)}<small>km</small></strong></div>
      </section>
      <div class="tq-month-trip-strip"><span>이번 달</span><strong>${stats.monthTrips}회 여행 · 코스 ${stats.monthCourseKm.toFixed(1)}km</strong></div>

      <section class="tq-attendance-card">
        <div class="tq-my-section-head"><div><small>DAILY CHECK</small><h3>출석 캘린더</h3></div><span>${esc(todayLabel())}</span></div>
        <div class="tq-attendance-row">
          <div><strong>${attendance.checkedToday?'오늘 출석 완료':'오늘도 여행 준비 완료?'}</strong><p>현재 ${attendance.streak}일 · 최장 ${attendance.longestStreak}일 · 누적 ${attendance.total}회</p></div>
          <button id="tqAttendanceBtn" type="button" ${attendance.checkedToday?'disabled':''}>${attendance.checkedToday?'출석 완료 ✓':'출석 체크'}</button>
        </div>
        ${calendarMarkup()}
      </section>

      <section class="tq-history-section">
        <div class="tq-my-section-head"><div><small>TRIP LOG</small><h3>내가 다녀온 곳</h3></div><span>${history.length}회 기록</span></div>
        <div class="tq-history-list">
          ${history.length?history.slice(0,20).map(item=>`<button class="tq-history-item" type="button" data-history-id="${esc(item.id)}"><span class="tq-history-date">${esc(dateLabel(item.completedAt))}</span><span class="tq-history-main"><strong>${esc(item.destination?.name||'여행지')}</strong><small>${esc(item.course?.id||'')}코스 · ${esc(modeLabel(item.course?.mode))} · ${esc((item.course?.stops||[]).slice(0,3).map(s=>s.name).join(' → ')||'여행 완료')}</small></span><span class="tq-history-arrow">›</span></button>`).join(''):`<div class="tq-history-empty"><strong>아직 완료한 여행이 없어요.</strong><p>코스를 선택한 뒤 ‘여행 완료’를 누르면 여기에 기록됩니다.</p></div>`}
        </div>
      </section>

      <section class="tq-my-settings">
        <div class="tq-my-section-head"><div><small>SETTINGS</small><h3>설정</h3></div></div>
        <button type="button" data-my-action="vehicle"><span><b>차량 및 연비</b><small>예상 연료비·통행료 계산 기준</small></span><i>›</i></button>
        <button type="button" data-my-action="profile"><span><b>프로필</b><small>닉네임·프로필 이미지·임시 ID</small></span><i>›</i></button>
        <button type="button" data-my-action="data"><span><b>데이터 관리</b><small>백업·복원·기기 데이터 초기화</small></span><i>›</i></button>
        <button type="button" data-my-action="app-info"><span><b>앱 정보</b><small>버전·저장 방식·서비스 안내</small></span><i>›</i></button>
        <div class="tq-my-local-note"><b>LOCAL PROFILE</b><span>프로필·KEEP·출석·여행 기록은 현재 이 기기에 저장됩니다.</span></div>
      </section>`;

    const attendanceBtn=$('#tqAttendanceBtn');
    if(attendanceBtn)attendanceBtn.onclick=()=>{const result=attendanceService.checkIn();toast(result.newCheckIn?`출석 완료 · ${result.streak}일 연속`:'오늘은 이미 출석했습니다.');renderHome()};
  }

  async function renderProfileEdit(){
    const profile=profileService.get(),avatar=await avatarMarkup('tq-profile-avatar tq-profile-avatar-large');
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← MY PAGE</button>
        <div class="tq-profile-editor">
          <div class="tq-profile-image-editor">
            <button id="tqAvatarChoose" type="button" class="tq-profile-avatar-edit">${avatar}<span>사진 변경</span></button>
            <input id="tqAvatarInput" type="file" accept="image/*" hidden>
            <button id="tqAvatarRemove" type="button" class="tq-profile-avatar-remove">이미지 삭제</button>
            <small class="tq-profile-image-note">선택한 사진은 정사각형으로 맞춰 512px WebP로 저장됩니다.</small>
          </div>
          <label class="tq-profile-field"><span>닉네임</span><input id="tqNicknameInput" maxlength="20" value="${esc(profile.nickname)}" placeholder="여행자 닉네임"></label>
          <div class="tq-profile-id-card"><span>임시 여행자 ID</span><strong>${esc(profile.temporaryId)}</strong><small>생성 ${esc(dateLabel(profile.createdAt))} · 추후 로그인 계정에 로컬 데이터를 연결할 수 있도록 분리해두었습니다.</small><button id="tqCopyTempId" type="button">ID 복사</button></div>
          <button id="tqProfileSave" class="tq-profile-save" type="button">프로필 저장</button>
        </div>
      </div>`;
    const fileInput=$('#tqAvatarInput');
    $('#tqAvatarChoose').onclick=()=>fileInput.click();
    fileInput.onchange=async()=>{const file=fileInput.files?.[0];if(!file)return;try{await saveProfileAvatar(file);toast('프로필 이미지를 압축해 저장했습니다.');await renderProfileEdit()}catch(error){toast(error.message||'이미지를 저장하지 못했습니다.')}};
    $('#tqAvatarRemove').onclick=async()=>{await removeProfileAvatar();toast('프로필 이미지를 삭제했습니다.');await renderProfileEdit()};
    $('#tqCopyTempId').onclick=async()=>{try{await navigator.clipboard.writeText(profile.temporaryId);toast('임시 ID를 복사했습니다.')}catch{toast('ID를 복사하지 못했습니다.')}};
    $('#tqProfileSave').onclick=async()=>{const nickname=$('#tqNicknameInput').value.trim();if(!nickname){toast('닉네임을 입력해주세요.');return}profileService.update({nickname});toast('프로필을 저장했습니다.');await renderHome()};
  }

  function renderHistoryDetail(id){
    const item=historyService.get(id);if(!item){renderHome();return}
    const c=item.course||{},route=c.route||{},cost=c.estimatedCost||{},stops=Array.isArray(c.stops)?c.stops:[],keepItem=buildCourseKeep(item.destination||{},c),kept=keepService.has(keepItem.id);
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← 다녀온 곳</button>
        <section class="tq-history-detail">
          <small>TRIP LOG · ${esc(dateLabel(item.completedAt))}</small><h3>${esc(item.destination?.name||'여행지')}</h3>
          <p>${esc(item.destination?.category||'여행지')} · ${esc(c.id||'')}코스</p>
          <div class="tq-history-metrics"><div><span>이동</span><strong>${esc(modeLabel(c.mode))}</strong></div><div><span>거리</span><strong>${Number(route.distanceKm)>0.05?fmtKm(route.distanceKm):'단일 장소'}</strong></div><div><span>소요</span><strong>${Number(route.timeMin)>0.5?fmtMin(route.timeMin):'체류형'}</strong></div><div><span>예상 비용</span><strong>${fmtWon(cost.total||0)}</strong></div></div>
          <div class="tq-history-stops"><span>완료 코스</span><ol>${stops.map((stop,index)=>`<li><i>${index+1}</i><b>${esc(stop.name)}</b><small>${esc(stop.category||'')}</small></li>`).join('')}</ol></div>
          <div class="tq-history-complete-mark">✓ 여행 완료 기록</div>
          <div class="tq-history-actions">
            <button type="button" class="primary" data-open-history-course="${esc(item.id)}">코스 다시보기 →</button>
            <button type="button" data-history-keep="${esc(item.id)}">${kept?'★ KEEP 해제':'☆ KEEP 저장'}</button>
            <button type="button" class="danger" data-history-delete="${esc(item.id)}">기록 삭제</button>
          </div>
        </section>
      </div>`;
  }

  async function renderDataManagement(){
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← MY PAGE</button>
        <section class="tq-data-page">
          <small>DATA MANAGEMENT</small><h3>내 데이터 관리</h3>
          <p>로그인 기능 전까지 이 기기에 저장되는 프로필, KEEP, 출석, 여행 기록을 파일로 보관할 수 있습니다.</p>
          <button type="button" data-data-action="backup"><b>백업 파일 만들기</b><span>JSON 파일로 내 데이터 저장</span></button>
          <button type="button" data-data-action="restore"><b>백업 불러오기</b><span>이 기기의 데이터에 백업 내용 적용</span></button>
          <input id="tqBackupInput" type="file" accept="application/json,.json" hidden>
          <div class="tq-data-warning"><b>기기 변경 전에 백업 권장</b><span>브라우저 데이터 삭제 시 로컬 기록이 사라질 수 있습니다.</span></div>
          <button type="button" class="danger" data-data-action="reset"><b>모든 로컬 데이터 초기화</b><span>프로필·사진·KEEP·출석·여행 기록·차량 설정 삭제</span></button>
        </section>
      </div>`;
  }

  function renderAppInfo(){
    body.innerHTML=`
      <div class="tq-my-subpage">
        <button class="tq-my-back" type="button" data-my-action="home">← MY PAGE</button>
        <section class="tq-app-info-page">
          <small>ABOUT</small><h3>TRIP QUEST</h3>
          <div><span>버전</span><strong>v1.3.0</strong></div>
          <div><span>프로필</span><strong>로컬 기기 저장</strong></div>
          <div><span>로그인</span><strong>추후 계정 연결 예정</strong></div>
          <p>현재 사용자 데이터는 서버 계정이 아닌 이 브라우저에 저장됩니다. 데이터 관리에서 백업 파일을 만들어 보관할 수 있습니다.</p>
        </section>
      </div>`;
  }

  body.addEventListener('click',async e=>{
    const calendar=e.target.closest('[data-calendar]');
    if(calendar){calendarCursor.setMonth(calendarCursor.getMonth()+Number(calendar.dataset.calendar||0));await renderHome();return}
    const historyButton=e.target.closest('[data-history-id]');
    if(historyButton){renderHistoryDetail(historyButton.dataset.historyId);return}
    const openHistory=e.target.closest('[data-open-history-course]');
    if(openHistory){const id=openHistory.dataset.openHistoryCourse;close();if(typeof onOpenHistoryCourse==='function')onOpenHistoryCourse(id);return}
    const keepHistory=e.target.closest('[data-history-keep]');
    if(keepHistory){const item=historyService.get(keepHistory.dataset.historyKeep);if(item){const result=keepService.toggle(buildCourseKeep(item.destination||{},item.course||{}));toast(result.saved?'KEEP에 저장했어요.':'KEEP에서 해제했어요.');renderHistoryDetail(item.id)}return}
    const deleteHistory=e.target.closest('[data-history-delete]');
    if(deleteHistory){const item=historyService.get(deleteHistory.dataset.historyDelete);if(item&&confirm(`${item.destination?.name||'이 여행'} 기록을 삭제할까요?`)){historyService.remove(item.id);toast('여행 기록을 삭제했습니다.');await renderHome()}return}

    const dataAction=e.target.closest('[data-data-action]')?.dataset.dataAction;
    if(dataAction==='backup'){
      try{const payload=await userDataService.exportData(),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=backupFileName();document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);toast('백업 파일을 만들었습니다.')}catch(error){toast(error.message||'백업을 만들지 못했습니다.')}
      return;
    }
    if(dataAction==='restore'){$('#tqBackupInput')?.click();return}
    if(dataAction==='reset'){if(confirm('프로필·KEEP·출석·여행 기록·차량 설정을 모두 초기화할까요? 이 작업은 되돌릴 수 없습니다.')){await userDataService.reset();toast('로컬 데이터를 초기화했습니다.');await renderHome()}return}

    const action=e.target.closest('[data-my-action]')?.dataset.myAction;
    if(action==='home'){await renderHome();return}
    if(action==='edit-profile'||action==='profile'){await renderProfileEdit();return}
    if(action==='data'){await renderDataManagement();return}
    if(action==='app-info'){renderAppInfo();return}
    if(action==='vehicle'){window.dispatchEvent(new CustomEvent('tripquest:open-vehicle-settings'));return}
  });

  body.addEventListener('change',async e=>{
    if(e.target?.id!=='tqBackupInput')return;
    const file=e.target.files?.[0];if(!file)return;
    try{const payload=JSON.parse(await file.text());if(!confirm('백업 데이터를 이 기기에 적용할까요? 현재 로컬 데이터가 백업 내용으로 교체됩니다.'))return;await userDataService.importData(payload);toast('백업 데이터를 불러왔습니다.');await renderHome()}catch(error){toast(error.message||'백업 파일을 불러오지 못했습니다.')}
  });

  overlay.addEventListener('click',e=>{if(e.target===overlay||e.target.closest('.tq-my-close'))close()});
  window.addEventListener('tripquest:open-my',open);
  window.addEventListener('tripquest:close-my',close);
  window.addEventListener('tripquest:keep-change',()=>{if(!overlay.hidden&&!body.querySelector('.tq-my-subpage'))renderHome()});
  window.addEventListener('tripquest:history-change',()=>{if(!overlay.hidden&&!body.querySelector('.tq-my-subpage'))renderHome()});
  window.addEventListener('tripquest:profile-change',()=>{if(!overlay.hidden&&!body.querySelector('.tq-my-subpage'))renderHome()});
  window.addEventListener('tripquest:profile-avatar-change',()=>{if(!overlay.hidden&&!body.querySelector('.tq-my-subpage'))renderHome()});
  window.addEventListener('tripquest:attendance-change',()=>{if(!overlay.hidden&&!body.querySelector('.tq-my-subpage'))renderHome()});
  window.addEventListener('tripquest:user-data-restored',()=>{if(!overlay.hidden)renderHome()});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!overlay.hidden)close()});
  profileService.get();
}

import { $, all, setText, toast, esc } from '../core/dom.js';
import { fmtWon, fmtMin, fmtKm } from '../core/format.js';
import { focusMapPoint } from './main-map.js';
import { drawCourseRoute } from './course-map.js';
import { renderCourseActionButtons } from './course-actions.js';
import { keepService, buildCourseKeep } from '../services/keep-service.js';

export function createResultsUI(state){
  let onSelectPlace=null;

  function syncKeepButton(button){
    if(!button)return;
    const kept=keepService.has(button.dataset.keepId);
    button.classList.toggle('is-kept',kept);
    button.setAttribute('aria-pressed',String(kept));
    button.setAttribute('aria-label',kept?'KEEP 해제':'KEEP에 저장');
    button.title=kept?'KEEP 해제':'KEEP에 저장';
    button.textContent=kept?'★':'☆';
  }

  if(typeof window!=='undefined'){
    window.addEventListener('tripquest:keep-change',e=>{
      const id=e.detail?.id;
      document.querySelectorAll('.course-keep-toggle').forEach(button=>{
        if(!id||button.dataset.keepId===id)syncKeepButton(button);
      });
    });
  }
  function setSelectPlaceHandler(handler){onSelectPlace=handler}
  function renderRanking(){
    if(!state.recommendations.length){$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 지역과 조건에 맞는 장소를 찾지 못했습니다.<br>플레이스 종류나 부가조건을 조정해보세요.';$('#noMatchActions').hidden=false;return}
    $('#ranking').className='ranking';$('#noMatchActions').hidden=true;
    $('#ranking').innerHTML=state.recommendations.map((p,i)=>{
      const distance=Number.isFinite(Number(p.distanceKm))&&Number(p.distanceKm)>0?`<span>${Number(p.distanceKm).toFixed(1)}km</span>`:'';
      const facilities=Object.entries(p.facilities||{}).filter(([,v])=>v).map(([k])=>({parking:'주차',indoor:'실내',outdoor:'실외',pet:'반려동물',wheelchair:'무장애',toilets:'화장실'}[k])).filter(Boolean).slice(0,3);
      return `<article class="rank-card" data-i="${i}"><div class="rank-number">${String(i+1).padStart(2,'0')}</div><div><h3>${esc(p.name)}</h3><div class="rank-tags"><span class="tag good">적합도 ${Math.round(p.score||70)}</span><span class="tag">${esc(p.category||'장소')}</span>${facilities.map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div><div class="rank-meta"><span>${esc(p.address||p.liveRegion||'선택 지역')}</span>${distance}</div><div class="rank-reason">${esc(p.aiReason||'선택한 행정구역 경계 안의 장소')}</div></div><div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button><button class="btn secondary map-focus">지도에서 보기</button></div></article>`;
    }).join('');
    $('#ranking').onclick=e=>{const card=e.target.closest('.rank-card');if(!card)return;const i=Number(card.dataset.i);if(e.target.closest('.select-place'))onSelectPlace?.(i,true);else{const p=state.recommendations[i];focusMapPoint(p,14)}};
  }

  function renderSummary(s){
    const src=s.outbound.source==='osrm'?'OSRM 도로 경로':s.outbound.source==='tmap'?'실시간 경로 데이터':'경로 API 실패 · 근사 경로';
    const t=s.total||{},unit=t.energyUnit||'L',amount=Number(t.energyAmount??t.fuelLiters)||0,cost=Number(t.energyCost??t.fuelCost)||0;
    const energyLabel=t.energyLabel||'예상 연료',costLabel=t.costLabel||'연료비';
    const vehicle=t.vehicleLabel||'캐스퍼',fuel=t.fuelLabel||'휘발유',eff=Number(t.efficiency||s.fuelEconomyKmL||11),effUnit=t.efficiencyUnit||'km/L';
    $('#tripSummary').className='summary-box';
    $('#tripSummary').innerHTML=`<div class="metric-grid"><div class="metric"><span>왕복 거리</span><strong>${fmtKm(t.distanceKm)}</strong></div><div class="metric"><span>운전 시간</span><strong>${fmtMin(t.drivingMin)}</strong></div><div class="metric"><span>예상 통행료</span><strong>${fmtWon(t.toll)}</strong></div><div class="metric"><span>${esc(energyLabel)}</span><strong>${amount.toFixed(1)}${unit}</strong></div><div class="metric"><span>${esc(costLabel)}</span><strong>${fmtWon(cost)}</strong></div><div class="metric"><span>교통비 합계</span><strong>${fmtWon(t.tripCost)}</strong></div></div><div class="source-note">${src} · ${esc(vehicle)} · ${esc(fuel)} ${eff.toFixed(1)}${esc(effUnit)} 기준 · 통행료는 예상치 · 식비/주차비/입장료 제외</div>`;
  }

  function renderCourses(j){
    const w=j.weather;
    const courses=Array.isArray(j.courses)?j.courses:[];
    if(w.source==='keep')setText('#courseWeather','KEEP에 저장된 코스입니다. 현재 날씨와 이동 조건은 새 검색 시 다시 계산됩니다.');
    else if(w.source==='fallback')setText('#courseWeather','날씨 API 연결이 되면 방문 예정시간 기준으로 코스를 다시 판단합니다.');
    else setText('#courseWeather',`예상 ${w.condition} · ${Math.round(w.temperature_2m)}°C · 강수 ${w.precipitation_probability||0}% · 바람 ${Math.round(w.wind_speed_10m)}km/h · Open-Meteo`);
    $('#courseDetailPanel').hidden=true;
    $('#courseList').className='course-list';
    $('#courseList').innerHTML=courses.map(c=>{const keep=buildCourseKeep(state.selected,c);const kept=keepService.has(keep.id);return `<article class="course-card" data-course="${c.id}"><div class="course-top"><span class="course-id">${c.id}</span><span class="badge">날씨 적합 ${esc(c.weatherFit)}</span></div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><ol class="stops">${c.stops.map((s,i)=>`<li>${i+1}. ${esc(s.name)}</li>`).join('')}</ol><div class="course-rule">${esc(c.localRule||"근거리 코스")}${c.maxLocalLegKm?` · 최대 구간 ${c.maxLocalLegKm.toFixed(1)}km`:""}</div><div class="course-stats"><span>${fmtKm(c.route.distanceKm)}</span><span>${fmtMin(c.route.timeMin)}</span><span>약 ${fmtWon(c.estimatedCost.total)}</span></div><div class="course-choice-row"><button class="btn secondary choose-course" type="button">${c.id}코스 선택</button><button class="course-keep-toggle${kept?' is-kept':''}" type="button" data-keep-id="${esc(keep.id)}" aria-pressed="${kept}" aria-label="${kept?'KEEP 해제':'KEEP에 저장'}" title="${kept?'KEEP 해제':'KEEP에 저장'}">${kept?'★':'☆'}</button></div></article>`}).join('');
  
    $('#courseList').onclick=e=>{
      const card=e.target.closest('.course-card');
      if(!card)return;

      const id=card.dataset.course;
      const course=courses.find(c=>c.id===id);
      if(!course){toast('코스 정보를 다시 불러와주세요.');return}

      const keepButton=e.target.closest('.course-keep-toggle');
      if(keepButton){
        const result=keepService.toggle(buildCourseKeep(state.selected,course));
        syncKeepButton(keepButton);
        toast(result.saved?'KEEP에 저장했어요.':'KEEP에서 해제했어요.');
        return;
      }

      const button=e.target.closest('.choose-course');
      if(!button)return;
  
      state.selectedCourse=id;
      state.selectedCourseData=course;
  
      all('.course-card').forEach(x=>x.classList.toggle('selected',x===card));
      all('.choose-course').forEach(x=>x.textContent=`${x.closest('.course-card').dataset.course}코스 선택`);
      button.textContent='선택 완료 ✓';
  
      const panel=$('#courseDetailPanel');
      if(panel)panel.hidden=false;
      renderCourseActionButtons(course);
  
      try{
        drawCourseRoute(course);
      }catch(err){
        console.error('course route error',err);
        setText('#courseMapStatus','지도 표시 중 오류가 있어도 카페·음식점 추천은 사용할 수 있습니다.');
      }
  
      setText('#actionHint',`${id}코스를 선택했습니다. 아래에서 주변 카페·음식점을 확인할 수 있습니다.`);
      toast(`${id}코스를 선택했습니다.`);
      setTimeout(()=>document.querySelector('#courseDetailPanel')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    };
  }
  function renderSavedCourse(item){
    const destination=item?.destination||{};
    const course=item?.course;
    if(!course)return false;

    state.selected={...destination};
    state.selectedCourse=course.id||'KEEP';
    state.selectedCourseData=course;

    setText('#selectedPlaceName',destination.name||'저장한 여행지');
    setText('#selectedPlaceMeta',[destination.category||'여행지',destination.address||''].filter(Boolean).join(' · '));

    const route=course.route||{},cost=course.estimatedCost||{};
    const destinationDistance=Number(destination.distanceKm)||Number(destination.routePreview?.distanceKm)||0;
    const destinationTime=Number(destination.routePreview?.timeMin)||0;
    $('#tripSummary').className='summary-box';
    $('#tripSummary').innerHTML=`<div class="metric-grid"><div class="metric"><span>저장 코스</span><strong>${esc(course.id||'KEEP')}코스</strong></div><div class="metric"><span>코스 거리</span><strong>${Number(route.distanceKm)>0.05?fmtKm(route.distanceKm):'단일 장소'}</strong></div><div class="metric"><span>코스 소요</span><strong>${Number(route.timeMin)>0.5?fmtMin(route.timeMin):'체류형'}</strong></div><div class="metric"><span>코스 예상 비용</span><strong>${fmtWon(cost.total||0)}</strong></div>${destinationDistance?`<div class="metric"><span>저장 당시 목적지 거리</span><strong>${fmtKm(destinationDistance)}</strong></div>`:''}${destinationTime?`<div class="metric"><span>저장 당시 편도</span><strong>${fmtMin(destinationTime)}</strong></div>`:''}</div><div class="source-note">KEEP에서 불러온 저장 코스 · 출발지·시간·차량 조건이 달라졌다면 새 검색으로 다시 계산하세요.</div>`;

    renderCourses({weather:{source:'keep'},courses:[course]});
    const choose=$('#courseList .choose-course');
    if(choose)choose.click();
    return true;
  }

  return {setSelectPlaceHandler,renderRanking,renderSummary,renderCourses,renderSavedCourse};
}

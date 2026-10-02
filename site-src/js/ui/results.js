import { $, all, setText, toast, esc } from '../core/dom.js';
import { fmtWon, fmtMin, fmtKm } from '../core/format.js';
import { focusMapPoint } from './main-map.js';
import { drawCourseRoute } from './course-map.js';
import { renderCourseActionButtons } from './course-actions.js';

export function createResultsUI(state){
  let onSelectPlace=null;
  function setSelectPlaceHandler(handler){onSelectPlace=handler}
  function renderRanking(){
    if(!state.recommendations.length){$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 거리와 조건에 맞는 장소를 찾지 못했습니다.<br>비슷한 거리 범위에서 다시 찾아볼 수 있습니다.';$('#noMatchActions').hidden=false;return}
    $('#ranking').className='ranking';$('#noMatchActions').hidden=true;
    $('#ranking').innerHTML=state.recommendations.map((p,i)=>{const free=p.availableMin!=null?Math.round(p.availableMin-p.roundTripDriveMin):null;const reason=p.aiReason||[Math.abs(p.distanceKm-state.targetKm)<state.targetKm*.25?'원하는 거리와 가까움':'거리 조건 범위',p.feasible===false?'귀가시간이 빠듯함':free!=null?`귀가 전 여유 약 ${fmtMin(Math.max(0,free))}`:'이동시간 확인',p.category||'여행지'].join(' · ');return `<article class="rank-card" data-i="${i}"><div class="rank-number">${String(i+1).padStart(2,'0')}</div><div><h3>${esc(p.name)}</h3><div class="rank-tags"><span class="tag good">적합도 ${Math.round(p.score)}</span><span class="tag">${esc(p.category||'장소')}</span>${p.feasible===false?'<span class="tag warn">시간 빠듯</span>':''}</div><div class="rank-meta"><span>${p.roadVerified?'도로':'예상 도로'} ${p.distanceKm.toFixed(1)}km</span>${Number.isFinite(p.geoDistanceKm)?`<span>직선 ${p.geoDistanceKm.toFixed(1)}km</span>`:''}${p.routePreview?`<span>편도 ${fmtMin(p.routePreview.timeMin)}</span>`:''}</div><div class="rank-reason">${esc(reason)}</div></div><div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button>${p.url?`<button class="btn secondary open-place">장소 정보</button>`:'<button class="btn secondary map-focus">지도에서 보기</button>'}</div></article>`}).join('');
    $('#ranking').onclick=e=>{const card=e.target.closest('.rank-card');if(!card)return;const i=Number(card.dataset.i);if(e.target.closest('.select-place'))onSelectPlace?.(i,true);else if(e.target.closest('.open-place'))window.open(state.recommendations[i].url,'_blank','noopener');else{const p=state.recommendations[i];focusMapPoint(p,13)}};
  }

  function renderSummary(s){
    const src=s.outbound.source==='osrm'?'실제 도로 경로':s.outbound.source==='tmap'?'실시간 경로 데이터':'경로 API 실패 · 근사 경로';
    const t=s.total||{},unit=t.energyUnit||'L',amount=Number(t.energyAmount??t.fuelLiters)||0,cost=Number(t.energyCost??t.fuelCost)||0;
    const energyLabel=t.energyLabel||'예상 연료',costLabel=t.costLabel||'연료비';
    const vehicle=t.vehicleLabel||'캐스퍼',fuel=t.fuelLabel||'휘발유',eff=Number(t.efficiency||s.fuelEconomyKmL||11),effUnit=t.efficiencyUnit||'km/L';
    $('#tripSummary').className='summary-box';
    $('#tripSummary').innerHTML=`<div class="metric-grid"><div class="metric"><span>왕복 거리</span><strong>${fmtKm(t.distanceKm)}</strong></div><div class="metric"><span>운전 시간</span><strong>${fmtMin(t.drivingMin)}</strong></div><div class="metric"><span>예상 통행료</span><strong>${fmtWon(t.toll)}</strong></div><div class="metric"><span>${esc(energyLabel)}</span><strong>${amount.toFixed(1)}${unit}</strong></div><div class="metric"><span>${esc(costLabel)}</span><strong>${fmtWon(cost)}</strong></div><div class="metric"><span>교통비 합계</span><strong>${fmtWon(t.tripCost)}</strong></div></div><div class="source-note">${src} · ${esc(vehicle)} · ${esc(fuel)} ${eff.toFixed(1)}${esc(effUnit)} 기준 · 통행료는 예상치 · 식비/주차비/입장료 제외</div>`;
  }

  function renderCourses(j){
    const w=j.weather;
    const courses=Array.isArray(j.courses)?j.courses:[];
    if(w.source==='fallback')setText('#courseWeather','날씨 API 연결이 되면 방문 예정시간 기준으로 코스를 다시 판단합니다.');
    else setText('#courseWeather',`예상 ${w.condition} · ${Math.round(w.temperature_2m)}°C · 강수 ${w.precipitation_probability||0}% · 바람 ${Math.round(w.wind_speed_10m)}km/h`);
    $('#courseDetailPanel').hidden=true;
    $('#courseList').className='course-list';
    $('#courseList').innerHTML=courses.map(c=>`<article class="course-card" data-course="${c.id}"><div class="course-top"><span class="course-id">${c.id}</span><span class="badge">날씨 적합 ${esc(c.weatherFit)}</span></div><h4>${esc(c.title)}</h4><p>${esc(c.reason)}</p><ol class="stops">${c.stops.map((s,i)=>`<li>${i+1}. ${esc(s.name)}</li>`).join('')}</ol><div class="course-rule">${esc(c.localRule||"근거리 코스")}${c.maxLocalLegKm?` · 최대 구간 ${c.maxLocalLegKm.toFixed(1)}km`:""}</div><div class="course-stats"><span>${fmtKm(c.route.distanceKm)}</span><span>${fmtMin(c.route.timeMin)}</span><span>약 ${fmtWon(c.estimatedCost.total)}</span></div><button class="btn secondary choose-course" type="button">${c.id}코스 선택</button></article>`).join('');
  
    $('#courseList').onclick=e=>{
      const button=e.target.closest('.choose-course');
      const card=e.target.closest('.course-card');
      if(!button||!card)return;
  
      const id=card.dataset.course;
      const course=courses.find(c=>c.id===id);
      if(!course){toast('코스 정보를 다시 불러와주세요.');return}
  
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
  return {setSelectPlaceHandler,renderRanking,renderSummary,renderCourses};
}

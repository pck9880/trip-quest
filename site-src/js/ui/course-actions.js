import { $, toast, esc } from '../core/dom.js';

function courseAnchor(course){
  const stops=Array.isArray(course?.stops)?course.stops:[];
  const anchor=stops[stops.length-1]||stops[0]||null;
  if(!anchor)return null;
  return {id:anchor.id||'',name:anchor.name||'코스 마지막 지점',address:anchor.address||'',lat:Number(anchor.lat),lng:Number(anchor.lng)};
}

export function renderNearbyPlaceLinks(course,type='전체'){
  const el=$('#nearbyPlaces');if(!el)return;
  const anchor=courseAnchor(course);
  if(!anchor){el.innerHTML='<div class="empty-state">연계 검색 기준 위치가 없습니다.</div>';return}
  const modes=type==='카페'?['cafe']:type==='맛집'?['food']:['cafe','food'];
  el.innerHTML=modes.map(mode=>{
    const code=mode==='cafe'?'CAFE':'FOOD';
    const desc=mode==='cafe'?'무드와 거리 조건으로 주변 카페 검색':'음식·무드와 거리 조건으로 주변 맛집 검색';
    return '<article class="nearby-stop-card"><div class="nearby-stop-head"><span>'+code+'</span><div><b>'+esc(anchor.name)+'</b><small>'+desc+'</small></div></div></article>';
  }).join('');
  el.hidden=false;
}

export function renderCourseActionButtons(course){
  if(!course)return;
  let box=document.querySelector('#courseActionButtons');
  if(!box){
    box=document.createElement('div');
    box.id='courseActionButtons';
    box.className='course-action-buttons';
    const panel=document.querySelector('#courseDetailPanel');
    if(panel)panel.insertBefore(box,panel.firstChild);
  }
  box.innerHTML='<button class="btn primary course-nearby-btn" data-mode="cafe">CAFE 연계 →</button><button class="btn primary course-nearby-btn" data-mode="food">FOOD 연계 →</button>';
  box.onclick=e=>{
    const button=e.target.closest('.course-nearby-btn');if(!button)return;
    const anchor=courseAnchor(course);
    if(!anchor||!Number.isFinite(anchor.lat)||!Number.isFinite(anchor.lng)){toast('코스 기준 위치를 확인할 수 없습니다.');return}
    const mode=button.dataset.mode==='food'?'food':'cafe';
    renderNearbyPlaceLinks(course,mode==='food'?'맛집':'카페');
    window.dispatchEvent(new CustomEvent('tripquest:linked-place-search',{detail:{mode,anchor,courseId:course.id||''}}));
  };
}

import { $, esc, toast } from '../core/dom.js';
import { geoBearing, geoKm, bearingLabel8 } from '../domain/geo.js';

const VIEW={w:1000,h:760};
const KOREA={minLat:33.05,maxLat:38.65,minLng:125.0,maxLng:129.75,left:214,right:786,top:56,bottom:594};

function svgPoint(svg,event){
  const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;
  const matrix=svg.getScreenCTM()?.inverse();
  return matrix?pt.matrixTransform(matrix):{x:500,y:318};
}
function geoToXY(point){
  const lng=Math.max(KOREA.minLng,Math.min(KOREA.maxLng,Number(point?.lng)||127.5));
  const lat=Math.max(KOREA.minLat,Math.min(KOREA.maxLat,Number(point?.lat)||36));
  return {x:KOREA.left+(lng-KOREA.minLng)/(KOREA.maxLng-KOREA.minLng)*(KOREA.right-KOREA.left),y:KOREA.bottom-(lat-KOREA.minLat)/(KOREA.maxLat-KOREA.minLat)*(KOREA.bottom-KOREA.top)};
}
function xyToGeo(x,y){
  const cx=Math.max(KOREA.left,Math.min(KOREA.right,x));
  const cy=Math.max(KOREA.top,Math.min(KOREA.bottom,y));
  return {x:cx,y:cy,lng:KOREA.minLng+(cx-KOREA.left)/(KOREA.right-KOREA.left)*(KOREA.maxLng-KOREA.minLng),lat:KOREA.maxLat-(cy-KOREA.top)/(KOREA.bottom-KOREA.top)*(KOREA.maxLat-KOREA.minLat)};
}
function concisePlace(place){const raw=String(place?.name||place?.address||'탐색 위치').trim();return raw.split(/\s+/).slice(0,4).join(' ')}

function installKoreaCanvas(svg){
  if(!svg||svg.querySelector('#koreaMapLayer'))return;
  const ns='http://www.w3.org/2000/svg';
  const layer=document.createElementNS(ns,'g');layer.id='koreaMapLayer';layer.setAttribute('class','tq-korea-map');
  layer.innerHTML=`
    <path class="sea-grid" d="M120 120H880M120 220H880M120 320H880M120 420H880M120 520H880M220 40V630M340 40V630M460 40V630M580 40V630M700 40V630M820 40V630"/>
    <path class="korea-halo" d="M469 69C430 84 404 118 399 151C393 186 363 207 349 239C337 267 347 294 328 323C309 352 282 373 286 407C290 440 321 455 329 485C336 513 320 543 344 566C367 588 401 577 424 592C448 608 471 626 502 616C533 606 545 577 569 560C594 542 628 540 646 512C665 482 650 452 670 425C690 398 723 381 724 346C725 311 698 288 690 256C681 221 700 188 681 158C662 128 628 120 605 96C582 72 552 49 519 55C500 58 486 64 469 69Z"/>
    <path class="korea-land" d="M477 78C446 91 425 118 422 148C419 177 392 201 378 226C362 255 369 280 350 310C332 339 306 361 310 394C314 425 343 443 350 470C357 498 342 526 364 548C384 568 414 558 438 574C462 590 481 604 507 596C533 588 544 559 566 544C591 527 620 526 637 500C654 474 640 446 659 418C677 392 705 375 706 344C707 315 683 293 675 264C666 231 684 201 666 173C649 147 618 138 596 116C574 94 548 72 519 75C502 76 490 73 477 78Z"/>
    <path class="korea-detail" d="M447 129C483 151 531 150 580 126M394 218C443 230 506 220 646 184M354 316C433 303 527 314 680 273M326 407C410 389 516 407 684 365M360 505C427 475 524 489 640 457"/>
    <path class="jeju" d="M425 640C449 624 493 620 525 628C549 635 552 650 531 661C504 674 457 675 429 663C413 656 411 648 425 640Z"/>
    <circle class="island" cx="730" cy="250" r="7"/><circle class="island" cx="750" cy="238" r="4"/><circle class="island" cx="274" cy="374" r="5"/>
    <text class="korea-label" x="500" y="338" text-anchor="middle">SOUTH KOREA</text>`;
  const field=svg.querySelector('.tq-geo-field');field?.after(layer);
  const style=document.createElement('style');style.id='tqKoreaCanvasStyle';style.textContent=`
    .tq-geo-grid,.tq-geo-ring-labels,.tq-geo-cardinals,.tq-geo-contours{display:none}
    .tq-korea-map{pointer-events:none}.tq-korea-map .sea-grid{fill:none;stroke:#73818c;stroke-width:1;stroke-opacity:.045}
    .tq-korea-map .korea-halo{fill:#c9ff45;fill-opacity:.025;stroke:#c9ff45;stroke-opacity:.05;stroke-width:22}
    .tq-korea-map .korea-land{fill:#101c1c;stroke:#7e963d;stroke-opacity:.62;stroke-width:2.2}
    .tq-korea-map .korea-detail{fill:none;stroke:#92a17b;stroke-opacity:.12;stroke-width:1.3;stroke-dasharray:3 8}
    .tq-korea-map .jeju,.tq-korea-map .island{fill:#101c1c;stroke:#7e963d;stroke-opacity:.52;stroke-width:2}
    .tq-korea-map .korea-label{fill:#8d9a8e;fill-opacity:.28;font:800 12px ui-monospace,monospace;letter-spacing:.22em}
    .tq-geo-search-sheet{transform:none !important;transition:none !important}
    .tq-geo-sheet-handle,.tq-geo-sheet-expand{display:none !important}
    .tq-geo-search-sheet{padding-top:14px}
  `;document.head.appendChild(style);
}

export function initGeoExplorer({state,travelService,setOrigin,onSearch,onSelect}){
  const svg=$('#geoCanvas'),target=$('#geoTarget'),vector=$('#geoVector'),pulse=$('#geoTargetPulse');
  const placeLabel=$('#geoExplorePlace'),distanceLabel=$('#geoExploreDistance'),directionLabel=$('#geoExploreDirection');
  const popup=$('#geoLocationPopup'),popupTitle=$('#geoPopupTitle'),popupMeta=$('#geoPopupMeta'),popupUse=$('#geoPopupUse');
  const startLabel=$('#geoStartLabel'),results=$('#geoResults'),sheet=$('#geoSearchSheet'),input=$('#aiInput');
  let dragging=false,dragPointer=null,lastGeo={lat:36.25,lng:127.8};
  installKoreaCanvas(svg);

  function setText(node,value){if(node)node.textContent=value}
  function updateVector(targetPoint){
    const o=geoToXY(state.origin||{lat:35.18,lng:129.08}),p=geoToXY(targetPoint||lastGeo);
    if(vector){vector.setAttribute('x1',String(o.x));vector.setAttribute('y1',String(o.y));vector.setAttribute('x2',String(p.x));vector.setAttribute('y2',String(p.y))}
    const originNode=svg?.querySelector('.tq-geo-origin');if(originNode)originNode.setAttribute('transform','translate('+o.x+' '+o.y+')');
    if(target)target.setAttribute('transform','translate('+p.x+' '+p.y+')');if(pulse)pulse.setAttribute('transform','translate('+p.x+' '+p.y+')');
  }
  function previewGeo(point){
    lastGeo={lat:point.lat,lng:point.lng};
    const origin=state.origin;
    const km=origin?geoKm(origin,lastGeo):0,bearing=origin?geoBearing(origin,lastGeo):0,dir=bearingLabel8(bearing);
    updateVector(lastGeo);setText(distanceLabel,Math.round(km)+' km');setText(directionLabel,dir+' · '+Math.round(bearing)+'°');
    return {point:lastGeo,km,bearing,dir};
  }
  async function resolveTarget(preview){
    if(!state.origin)return;
    const point=preview.point;
    state.minKm=Math.max(0,Math.round(Math.max(0,preview.km-60)/10)*10);state.targetKm=Math.min(450,Math.round(Math.min(450,preview.km+60)/10)*10);state.direction=preview.dir;
    state.exploreTarget={...point,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir,name:'위치 분석 중',address:''};
    if(popup){popup.hidden=false;popup.classList.add('is-loading')}setText(popupTitle,'위치 분석 중…');setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향');setText(placeLabel,'좌표를 지명으로 분석하고 있습니다.');
    try{const found=await travelService.reverseGeocode(point.lat,point.lng);if(found)state.exploreTarget={...state.exploreTarget,...found,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir}}catch{}
    const name=concisePlace(state.exploreTarget);setText(placeLabel,name);setText(popupTitle,name);setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향 · MAP TARGET');if(popup){popup.classList.remove('is-loading');popup.classList.add('is-found')}try{navigator.vibrate?.(12)}catch{}
  }
  function resetTarget(resolve=false){
    const base=state.origin?{lat:Math.min(38.2,state.origin.lat+1.25),lng:Math.max(125.4,state.origin.lng-0.45)}:{lat:36.25,lng:127.8};
    const preview=previewGeo(base);state.exploreTarget=null;setText(placeLabel,'남한 지도에서 포인트를 드래그해 탐색하세요.');if(popup)popup.hidden=true;if(resolve&&state.origin)resolveTarget(preview);
  }
  function syncOrigin(){const origin=state.origin;if(!origin){setText(startLabel,'시작 위치를 설정하세요.');updateVector(lastGeo);return}setText(startLabel,origin.name||origin.address||'설정한 출발지');resetTarget(false)}
  function startTargetDrag(event){if(!state.origin){toast('먼저 시작 위치를 설정해주세요.');openStartPicker();return}dragging=true;dragPointer=event.pointerId;target?.setPointerCapture?.(event.pointerId);target?.classList.add('is-dragging');if(popup)popup.hidden=true;const p=svgPoint(svg,event);previewGeo(xyToGeo(p.x,p.y));event.preventDefault()}
  function moveTarget(event){if(!dragging||event.pointerId!==dragPointer)return;const p=svgPoint(svg,event);previewGeo(xyToGeo(p.x,p.y));event.preventDefault()}
  async function endTargetDrag(event){if(!dragging||event.pointerId!==dragPointer)return;dragging=false;dragPointer=null;target?.classList.remove('is-dragging');const p=svgPoint(svg,event);await resolveTarget(previewGeo(xyToGeo(p.x,p.y)));event.preventDefault()}

  function createPicker(){
    let overlay=$('#geoStartPicker');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='geoStartPicker';overlay.className='tq-start-picker';overlay.hidden=true;
    overlay.innerHTML=`<section class="tq-start-picker-card" role="dialog" aria-modal="true" aria-labelledby="geoStartPickerTitle"><div class="tq-sheet-handle" aria-hidden="true"></div><header><div><small>START POINT</small><h2 id="geoStartPickerTitle">여행 시작 위치</h2><p>현재 위치를 사용하거나 직접 입력하세요.</p></div><button id="geoStartPickerClose" type="button" aria-label="닫기">×</button></header><button id="geoStartUseGps" class="tq-start-gps" type="button"><i></i><span><b>현재 위치 사용</b><small>GPS 좌표를 실제 지역명으로 확인합니다.</small></span><em>→</em></button><div class="tq-start-divider"><span>또는 직접 입력</span></div><div class="tq-start-search"><input id="geoStartQuery" type="search" placeholder="예: 부산역, 서면역, 가야공원" autocomplete="off"><button id="geoStartSearchBtn" type="button">찾기</button></div><div id="geoStartResults" class="tq-start-results"></div></section>`;
    document.body.appendChild(overlay);$('#geoStartPickerClose').onclick=closeStartPicker;overlay.addEventListener('click',e=>{if(e.target===overlay)closeStartPicker()});$('#geoStartUseGps').onclick=useGpsOrigin;$('#geoStartSearchBtn').onclick=searchOrigin;$('#geoStartQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchOrigin()}});return overlay;
  }
  function openStartPicker(){const overlay=createPicker();overlay.hidden=false;document.body.classList.add('tq-modal-open');setTimeout(()=>$('#geoStartQuery')?.focus({preventScroll:true}),140)}
  function closeStartPicker(){const overlay=$('#geoStartPicker');if(overlay)overlay.hidden=true;document.body.classList.remove('tq-modal-open')}
  async function useGpsOrigin(){
    const btn=$('#geoStartUseGps')||$('#geoStartQuickGps');if(!navigator.geolocation){toast('현재 위치 기능을 사용할 수 없습니다. 직접 입력해주세요.');return null}if(btn){btn.disabled=true;btn.classList.add('is-loading');const label=btn.querySelector?.('b');if(label)label.textContent='현재 위치 확인 중…'}
    return new Promise(resolve=>{navigator.geolocation.getCurrentPosition(async pos=>{let origin=null;try{const lat=pos.coords.latitude,lng=pos.coords.longitude;const found=await travelService.reverseGeocode(lat,lng);origin=found||{lat,lng,name:'현재 위치',address:'현재 위치',placeTypeLabel:'현재 위치'};state.searchRegion=origin;await setOrigin({...origin,name:origin.name||'현재 위치'});syncOrigin();closeStartPicker();toast((origin.name||'현재 위치')+'에서 시작합니다.')}catch{}finally{if(btn){btn.disabled=false;btn.classList.remove('is-loading');const label=btn.querySelector?.('b');if(label)label.textContent='현재 위치 사용'}}resolve(origin)},()=>{if(btn){btn.disabled=false;btn.classList.remove('is-loading');const label=btn.querySelector?.('b');if(label)label.textContent='현재 위치 사용'}toast('위치 권한을 허용하거나 시작 위치를 직접 입력해주세요.');resolve(null)},{enableHighAccuracy:true,timeout:10000,maximumAge:30000})})
  }
  async function searchOrigin(){
    const q=$('#geoStartQuery')?.value.trim()||'',box=$('#geoStartResults');if(!q)return;box.innerHTML='<div class="tq-start-empty">위치를 찾고 있습니다…</div>';
    try{const result=await travelService.geocode(q),items=result.items||[];if(!items.length){box.innerHTML='<div class="tq-start-empty">검색 결과가 없습니다. 장소명을 조금 더 구체적으로 입력해주세요.</div>';return}box.innerHTML=items.slice(0,5).map((item,index)=>'<button type="button" data-origin-index="'+index+'"><span><b>'+esc(item.name)+'</b><small>'+esc(item.address||'')+'</small></span><em>선택</em></button>').join('');box.onclick=async e=>{const row=e.target.closest('[data-origin-index]');if(!row)return;const item=items[Number(row.dataset.originIndex)];state.searchRegion=item;await setOrigin({...item,name:item.name});syncOrigin();closeStartPicker();toast(item.name+'에서 시작합니다.')}}catch(error){box.innerHTML='<div class="tq-start-empty error">'+esc(error.message||'위치 검색에 실패했습니다.')+'</div>'}
  }

  function setSheetState(){if(sheet){sheet.style.transform='none';sheet.dataset.state='fixed'}}
  function clearCandidates(){const group=$('#geoCandidateLayer');if(group)group.innerHTML='';if(results)results.innerHTML=''}
  function renderRecommendations(items=[]){
    clearCandidates();if(!state.origin||!Array.isArray(items)||!items.length)return;const group=$('#geoCandidateLayer');
    if(group){group.innerHTML=items.slice(0,8).map((item,index)=>{const p=geoToXY(item);return '<g class="tq-geo-candidate" data-geo-index="'+index+'" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')"><circle r="19"></circle><text text-anchor="middle" dy="4">'+String(index+1).padStart(2,'0')+'</text></g>'}).join('');group.onclick=e=>{const node=e.target.closest('[data-geo-index]');if(node)onSelect?.(Number(node.dataset.geoIndex))}}
    if(results){results.innerHTML='<div class="tq-geo-result-head"><span>AI PICKS</span><b>'+items.length+'곳</b></div>'+items.slice(0,8).map((item,index)=>'<button type="button" data-result-index="'+index+'"><b>'+String(index+1).padStart(2,'0')+'</b><span><strong>'+esc(item.name)+'</strong><small>'+esc((item.category||'여행지')+' · '+Math.round(Number(item.distanceKm||item.geoDistanceKm||0))+'km')+'</small></span><em>선택</em></button>').join('');results.onclick=e=>{const row=e.target.closest('[data-result-index]');if(row)onSelect?.(Number(row.dataset.resultIndex))}}
  }
  function renderEmpty(message='현재 조건에서 추천 가능한 여행지가 부족합니다.'){clearCandidates();if(results)results.innerHTML='<div class="tq-start-empty">'+esc(message)+'</div>'}
  function renderSearchState(label){const node=$('#geoSearchContext');if(node)node.textContent=label||'남한 지도 탐색 포인트와 자연어 조건을 함께 분석합니다.'}
  function focusSearch(){setTimeout(()=>input?.focus({preventScroll:true}),120)}

  target?.addEventListener('pointerdown',startTargetDrag);svg?.addEventListener('pointermove',moveTarget);svg?.addEventListener('pointerup',endTargetDrag);svg?.addEventListener('pointercancel',endTargetDrag);popupUse?.addEventListener('click',focusSearch);$('#geoStartChange')?.addEventListener('click',openStartPicker);$('#geoStartQuickGps')?.addEventListener('click',useGpsOrigin);input?.addEventListener('focus',setSheetState);window.addEventListener('resize',setSheetState);
  syncOrigin();setSheetState();return {syncOrigin,openStartPicker,closeStartPicker,useGpsOrigin,renderRecommendations,renderEmpty,clearCandidates,renderSearchState,setSheetState,focusSearch,resetTarget};
}
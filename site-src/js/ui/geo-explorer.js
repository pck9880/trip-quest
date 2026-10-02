import { $, esc, toast } from '../core/dom.js';
import { destinationPoint, geoBearing, geoKm, bearingLabel8 } from '../domain/geo.js';

const VIEW={w:1000,h:760,cx:500,cy:318,maxR:286,maxKm:450};

function svgPoint(svg,event){
  const pt=svg.createSVGPoint();
  pt.x=event.clientX;pt.y=event.clientY;
  const matrix=svg.getScreenCTM()?.inverse();
  return matrix?pt.matrixTransform(matrix):{x:VIEW.cx,y:VIEW.cy};
}
function clampPoint(x,y){
  const dx=x-VIEW.cx,dy=y-VIEW.cy;
  const r=Math.hypot(dx,dy);
  if(r<=VIEW.maxR)return {x,y,r};
  const k=VIEW.maxR/Math.max(1,r);
  return {x:VIEW.cx+dx*k,y:VIEW.cy+dy*k,r:VIEW.maxR};
}
function bearingFromPoint(x,y){
  return (Math.atan2(x-VIEW.cx,-(y-VIEW.cy))*180/Math.PI+360)%360;
}
function kmFromRadius(r){return Math.max(0,Math.min(VIEW.maxKm,r/VIEW.maxR*VIEW.maxKm))}
function projectFromOrigin(origin,point){
  const km=Math.min(VIEW.maxKm,geoKm(origin,point));
  const bearing=geoBearing(origin,point);
  const r=km/VIEW.maxKm*VIEW.maxR;
  const a=bearing*Math.PI/180;
  return {x:VIEW.cx+Math.sin(a)*r,y:VIEW.cy-Math.cos(a)*r,km,bearing};
}
function concisePlace(place){
  const raw=String(place?.name||place?.address||'탐색 위치').trim();
  return raw.split(/\s+/).slice(0,4).join(' ');
}

export function initGeoExplorer({state,travelService,setOrigin,onSearch,onSelect}){
  const svg=$('#geoCanvas');
  const target=$('#geoTarget');
  const vector=$('#geoVector');
  const pulse=$('#geoTargetPulse');
  const placeLabel=$('#geoExplorePlace');
  const distanceLabel=$('#geoExploreDistance');
  const directionLabel=$('#geoExploreDirection');
  const popup=$('#geoLocationPopup');
  const popupTitle=$('#geoPopupTitle');
  const popupMeta=$('#geoPopupMeta');
  const popupUse=$('#geoPopupUse');
  const startLabel=$('#geoStartLabel');
  const results=$('#geoResults');
  const sheet=$('#geoSearchSheet');
  const handle=$('#geoSheetHandle');
  const input=$('#aiInput');
  let dragging=false;
  let dragPointer=null;
  let lastXY={x:VIEW.cx+104,y:VIEW.cy-24};
  let sheetState='mid';
  let sheetDrag=null;

  function setText(node,value){if(node)node.textContent=value}

  function updateVector(x,y){
    if(vector){vector.setAttribute('x2',String(x));vector.setAttribute('y2',String(y))}
    if(target)target.setAttribute('transform','translate('+x+' '+y+')');
    if(pulse) pulse.setAttribute('transform','translate('+x+' '+y+')');
  }

  function previewAt(x,y){
    const p=clampPoint(x,y);lastXY={x:p.x,y:p.y};
    const km=kmFromRadius(p.r),bearing=bearingFromPoint(p.x,p.y),dir=bearingLabel8(bearing);
    updateVector(p.x,p.y);
    setText(distanceLabel,Math.round(km)+' km');
    setText(directionLabel,dir+' · '+Math.round(bearing)+'°');
    return {km,bearing,dir,x:p.x,y:p.y};
  }

  async function resolveTarget(preview){
    if(!state.origin)return;
    const point=destinationPoint(state.origin,preview.km,preview.bearing);
    state.minKm=Math.max(0,Math.round(Math.max(0,preview.km-60)/10)*10);
    state.targetKm=Math.min(450,Math.round(Math.min(450,preview.km+60)/10)*10);
    state.direction=preview.dir;
    state.exploreTarget={...point,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir,name:'위치 분석 중',address:''};
    if(popup){popup.hidden=false;popup.classList.add('is-loading')}
    setText(popupTitle,'위치 분석 중…');
    setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향');
    setText(placeLabel,'좌표를 지명으로 분석하고 있습니다.');
    try{
      const found=await travelService.reverseGeocode(point.lat,point.lng);
      if(found){
        state.exploreTarget={...state.exploreTarget,...found,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir};
      }
    }catch{}
    const name=concisePlace(state.exploreTarget);
    setText(placeLabel,name);
    setText(popupTitle,name);
    setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향 · DRAG TARGET');
    if(popup){popup.classList.remove('is-loading');popup.classList.add('is-found')}
    try{navigator.vibrate?.(12)}catch{}
  }

  function resetTarget(resolve=false){
    const preview=previewAt(VIEW.cx+96,VIEW.cy-64);
    state.exploreTarget=null;
    setText(placeLabel,'포인트를 드래그해 탐색 방향을 정하세요.');
    if(popup)popup.hidden=true;
    if(resolve&&state.origin)resolveTarget(preview);
  }

  function syncOrigin(){
    const origin=state.origin;
    if(!origin){
      setText(startLabel,'시작 위치를 설정하세요.');
      return;
    }
    setText(startLabel,origin.name||origin.address||'설정한 출발지');
    resetTarget(false);
  }

  function startTargetDrag(event){
    if(!state.origin){toast('먼저 시작 위치를 설정해주세요.');openStartPicker();return}
    dragging=true;dragPointer=event.pointerId;
    target?.setPointerCapture?.(event.pointerId);
    target?.classList.add('is-dragging');
    popup && (popup.hidden=true);
    const p=svgPoint(svg,event);previewAt(p.x,p.y);
    event.preventDefault();
  }
  function moveTarget(event){
    if(!dragging||event.pointerId!==dragPointer)return;
    const p=svgPoint(svg,event);previewAt(p.x,p.y);event.preventDefault();
  }
  async function endTargetDrag(event){
    if(!dragging||event.pointerId!==dragPointer)return;
    dragging=false;dragPointer=null;target?.classList.remove('is-dragging');
    const p=svgPoint(svg,event);const preview=previewAt(p.x,p.y);
    await resolveTarget(preview);
    event.preventDefault();
  }

  function createPicker(){
    let overlay=$('#geoStartPicker');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='geoStartPicker';
    overlay.className='tq-start-picker';
    overlay.hidden=true;
    overlay.innerHTML=`
      <section class="tq-start-picker-card" role="dialog" aria-modal="true" aria-labelledby="geoStartPickerTitle">
        <div class="tq-sheet-handle" aria-hidden="true"></div>
        <header><div><small>START POINT</small><h2 id="geoStartPickerTitle">여행 시작 위치</h2><p>현재 위치를 사용하거나 직접 입력하세요.</p></div><button id="geoStartPickerClose" type="button" aria-label="닫기">×</button></header>
        <button id="geoStartUseGps" class="tq-start-gps" type="button"><i></i><span><b>현재 위치 사용</b><small>GPS 좌표를 실제 지역명으로 확인합니다.</small></span><em>→</em></button>
        <div class="tq-start-divider"><span>또는 직접 입력</span></div>
        <div class="tq-start-search"><input id="geoStartQuery" type="search" placeholder="예: 부산역, 서면역, 가야공원" autocomplete="off"><button id="geoStartSearchBtn" type="button">찾기</button></div>
        <div id="geoStartResults" class="tq-start-results"></div>
      </section>`;
    document.body.appendChild(overlay);
    $('#geoStartPickerClose').onclick=closeStartPicker;
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeStartPicker()});
    $('#geoStartUseGps').onclick=useGpsOrigin;
    $('#geoStartSearchBtn').onclick=searchOrigin;
    $('#geoStartQuery').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchOrigin()}});
    return overlay;
  }
  function openStartPicker(){
    const overlay=createPicker();overlay.hidden=false;document.body.classList.add('tq-modal-open');
    setTimeout(()=>$('#geoStartQuery')?.focus({preventScroll:true}),140);
  }
  function closeStartPicker(){
    const overlay=$('#geoStartPicker');if(overlay)overlay.hidden=true;document.body.classList.remove('tq-modal-open');
  }
  async function useGpsOrigin(){
    const btn=$('#geoStartUseGps');
    if(!navigator.geolocation){toast('현재 위치 기능을 사용할 수 없습니다. 직접 입력해주세요.');return}
    if(btn){btn.disabled=true;btn.classList.add('is-loading');btn.querySelector('b').textContent='현재 위치 확인 중…'}
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        const lat=pos.coords.latitude,lng=pos.coords.longitude;
        const found=await travelService.reverseGeocode(lat,lng);
        const origin=found||{lat,lng,name:'현재 위치',address:'현재 위치',placeTypeLabel:'현재 위치'};
        state.searchRegion=origin;
        await setOrigin({...origin,name:origin.name||'현재 위치'});
        syncOrigin();closeStartPicker();toast((origin.name||'현재 위치')+'에서 시작합니다.');
      }finally{
        if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.querySelector('b').textContent='현재 위치 사용'}
      }
    },()=>{
      if(btn){btn.disabled=false;btn.classList.remove('is-loading');btn.querySelector('b').textContent='현재 위치 사용'}
      toast('위치 권한을 허용하거나 시작 위치를 직접 입력해주세요.');
    },{enableHighAccuracy:true,timeout:10000,maximumAge:30000});
  }
  async function searchOrigin(){
    const q=$('#geoStartQuery')?.value.trim()||'',box=$('#geoStartResults');
    if(!q)return;
    box.innerHTML='<div class="tq-start-empty">위치를 찾고 있습니다…</div>';
    try{
      const result=await travelService.geocode(q),items=result.items||[];
      if(!items.length){box.innerHTML='<div class="tq-start-empty">검색 결과가 없습니다. 장소명을 조금 더 구체적으로 입력해주세요.</div>';return}
      box.innerHTML=items.slice(0,5).map((item,index)=>'<button type="button" data-origin-index="'+index+'"><span><b>'+esc(item.name)+'</b><small>'+esc(item.address||'')+'</small></span><em>선택</em></button>').join('');
      box.onclick=async e=>{
        const row=e.target.closest('[data-origin-index]');if(!row)return;
        const item=items[Number(row.dataset.originIndex)];
        state.searchRegion=item;
        await setOrigin({...item,name:item.name});
        syncOrigin();closeStartPicker();toast(item.name+'에서 시작합니다.');
      };
    }catch(error){box.innerHTML='<div class="tq-start-empty error">'+esc(error.message||'위치 검색에 실패했습니다.')+'</div>'}
  }

  function sheetOffsets(){
    if(!sheet)return {full:0,mid:0,peek:0};
    const h=sheet.getBoundingClientRect().height;
    return {full:0,mid:Math.max(0,h-430),peek:Math.max(0,h-225)};
  }
  function setSheetState(next,animate=true){
    if(!sheet)return;
    sheetState=next;
    const offsets=sheetOffsets();
    sheet.classList.toggle('no-transition',!animate);
    sheet.style.transform='translate3d(0,'+(offsets[next]||0)+'px,0)';
    sheet.dataset.state=next;
    if(!animate)requestAnimationFrame(()=>sheet.classList.remove('no-transition'));
  }
  function startSheetDrag(event){
    if(!sheet)return;
    const current=new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42||0;
    sheetDrag={pointerId:event.pointerId,startY:event.clientY,startOffset:current,currentOffset:current};
    handle?.setPointerCapture?.(event.pointerId);sheet.classList.add('is-dragging');event.preventDefault();
  }
  function moveSheet(event){
    if(!sheetDrag||event.pointerId!==sheetDrag.pointerId)return;
    const offsets=sheetOffsets(),next=Math.max(0,Math.min(offsets.peek,sheetDrag.startOffset+(event.clientY-sheetDrag.startY)));
    sheetDrag.currentOffset=next;sheet.style.transform='translate3d(0,'+next+'px,0)';event.preventDefault();
  }
  function endSheet(event){
    if(!sheetDrag||event.pointerId!==sheetDrag.pointerId)return;
    const offsets=sheetOffsets(),y=sheetDrag.currentOffset;
    const states=['full','mid','peek'];
    const next=states.sort((a,b)=>Math.abs(offsets[a]-y)-Math.abs(offsets[b]-y))[0];
    sheetDrag=null;sheet.classList.remove('is-dragging');setSheetState(next,true);event.preventDefault();
  }

  function clearCandidates(){
    const group=$('#geoCandidateLayer');if(group)group.innerHTML='';
    if(results)results.innerHTML='';
  }
  function renderRecommendations(items=[]){
    clearCandidates();
    if(!state.origin||!Array.isArray(items)||!items.length)return;
    const group=$('#geoCandidateLayer');
    if(group){
      group.innerHTML=items.slice(0,8).map((item,index)=>{
        const p=projectFromOrigin(state.origin,item);
        return '<g class="tq-geo-candidate" data-geo-index="'+index+'" transform="translate('+p.x.toFixed(1)+' '+p.y.toFixed(1)+')"><circle r="19"></circle><text text-anchor="middle" dy="4">'+String(index+1).padStart(2,'0')+'</text></g>';
      }).join('');
      group.onclick=e=>{
        const node=e.target.closest('[data-geo-index]');if(!node)return;
        onSelect?.(Number(node.dataset.geoIndex));
      };
    }
    if(results){
      results.innerHTML='<div class="tq-geo-result-head"><span>AI PICKS</span><b>'+items.length+'곳</b></div>'+
        items.slice(0,8).map((item,index)=>'<button type="button" data-result-index="'+index+'"><b>'+String(index+1).padStart(2,'0')+'</b><span><strong>'+esc(item.name)+'</strong><small>'+esc((item.category||'여행지')+' · '+Math.round(Number(item.distanceKm||item.geoDistanceKm||0))+'km')+'</small></span><em>선택</em></button>').join('');
      results.onclick=e=>{
        const row=e.target.closest('[data-result-index]');if(!row)return;
        onSelect?.(Number(row.dataset.resultIndex));
      };
    }
    setSheetState('full',true);
  }

  function renderSearchState(label){
    const node=$('#geoSearchContext');
    if(node)node.textContent=label||'지도 탐색 포인트와 자연어 조건을 함께 분석합니다.';
  }
  function focusSearch(){
    setSheetState('mid',true);setTimeout(()=>input?.focus({preventScroll:true}),180);
  }

  target?.addEventListener('pointerdown',startTargetDrag);
  svg?.addEventListener('pointermove',moveTarget);
  svg?.addEventListener('pointerup',endTargetDrag);
  svg?.addEventListener('pointercancel',endTargetDrag);
  popupUse?.addEventListener('click',focusSearch);
  $('#geoStartChange')?.addEventListener('click',openStartPicker);
  $('#geoStartQuickGps')?.addEventListener('click',useGpsOrigin);
  handle?.addEventListener('pointerdown',startSheetDrag);
  window.addEventListener('pointermove',moveSheet,{passive:false});
  window.addEventListener('pointerup',endSheet,{passive:false});
  input?.addEventListener('focus',()=>setSheetState('mid',true));
  $('#geoSheetExpand')?.addEventListener('click',()=>setSheetState(sheetState==='full'?'peek':'full',true));
  window.addEventListener('resize',()=>setSheetState(sheetState,false));

  syncOrigin();previewAt(lastXY.x,lastXY.y);setSheetState('mid',false);
  return {syncOrigin,openStartPicker,closeStartPicker,useGpsOrigin,renderRecommendations,clearCandidates,renderSearchState,setSheetState,focusSearch,resetTarget};
}

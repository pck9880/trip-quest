import { $, esc, toast } from '../core/dom.js';
import { geoBearing, geoKm, bearingLabel8 } from '../domain/geo.js';
import { gpsService } from '../services/gps-service.js';

const KOREA={minLat:33.05,maxLat:38.65,minLng:125.0,maxLng:129.75,left:210,right:790,top:42,bottom:690};
const REGIONS=[
 ['서울특별시','서울',37.5665,126.9780],['부산광역시','부산',35.1796,129.0756],['대구광역시','대구',35.8714,128.6014],['인천광역시','인천',37.4563,126.7052],['광주광역시','광주',35.1595,126.8526],['대전광역시','대전',36.3504,127.3845],['울산광역시','울산',35.5384,129.3114],['세종특별자치시','세종',36.4800,127.2890],['경기도','경기',37.4138,127.5183],['강원특별자치도','강원',37.8228,128.1555],['충청북도','충북',36.6357,127.4917],['충청남도','충남',36.5184,126.8000],['전북특별자치도','전북',35.7175,127.1530],['전라남도','전남',34.8679,126.9910],['경상북도','경북',36.4919,128.8889],['경상남도','경남',35.4606,128.2132],['제주특별자치도','제주',33.4890,126.4983]
];
const LAND=[
 [126.12,37.70],[126.18,37.86],[126.45,38.05],[126.72,38.18],[127.10,38.30],[127.55,38.34],[128.05,38.55],[128.38,38.61],[128.62,38.48],[128.82,38.25],
 [128.98,37.92],[129.18,37.70],[129.34,37.42],[129.42,37.08],[129.36,36.82],[129.48,36.55],[129.43,36.22],[129.50,35.92],[129.38,35.62],[129.30,35.38],
 [129.18,35.18],[129.06,35.08],[128.90,35.10],[128.78,34.96],[128.62,34.88],[128.45,34.91],[128.30,34.82],[128.16,34.72],[127.98,34.62],[127.78,34.58],
 [127.62,34.70],[127.42,34.62],[127.22,34.50],[127.02,34.55],[126.84,34.48],[126.66,34.58],[126.48,34.64],[126.34,34.80],[126.20,34.94],[126.10,35.16],
 [126.02,35.38],[126.08,35.58],[126.18,35.78],[126.10,36.00],[126.18,36.22],[126.34,36.38],[126.22,36.58],[126.30,36.80],[126.20,37.02],[126.38,37.22],
 [126.52,37.38],[126.44,37.52],[126.28,37.58]
];
const MAP_LABELS=[
 ['서울',37.5665,126.9780,12,-10],['인천',37.4563,126.7052,-42,5],['수원',37.2636,127.0286,12,17],['춘천',37.8813,127.7298,12,-8],
 ['강릉',37.7519,128.8761,12,4],['청주',36.6424,127.4890,12,-8],['대전',36.3504,127.3845,12,16],['전주',35.8242,127.1480,-38,2],
 ['광주',35.1595,126.8526,-38,4],['대구',35.8714,128.6014,12,-7],['포항',36.0190,129.3435,12,-5],['울산',35.5384,129.3114,12,9],
 ['창원',35.2279,128.6811,-42,16],['부산',35.1796,129.0756,12,18],['여수',34.7604,127.6622,12,18],['제주',33.4996,126.5312,12,6]
];
function svgPoint(svg,event){const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;const matrix=svg.getScreenCTM()?.inverse();return matrix?pt.matrixTransform(matrix):{x:500,y:318}}
function geoToXY(point){const lng=Math.max(KOREA.minLng,Math.min(KOREA.maxLng,Number(point?.lng)||127.5));const lat=Math.max(KOREA.minLat,Math.min(KOREA.maxLat,Number(point?.lat)||36));return{x:KOREA.left+(lng-KOREA.minLng)/(KOREA.maxLng-KOREA.minLng)*(KOREA.right-KOREA.left),y:KOREA.bottom-(lat-KOREA.minLat)/(KOREA.maxLat-KOREA.minLat)*(KOREA.bottom-KOREA.top)}}
function xyToGeo(x,y){const cx=Math.max(KOREA.left,Math.min(KOREA.right,x)),cy=Math.max(KOREA.top,Math.min(KOREA.bottom,y));return{x:cx,y:cy,lng:KOREA.minLng+(cx-KOREA.left)/(KOREA.right-KOREA.left)*(KOREA.maxLng-KOREA.minLng),lat:KOREA.maxLat-(cy-KOREA.top)/(KOREA.bottom-KOREA.top)*(KOREA.maxLat-KOREA.minLat)}}
function concisePlace(place){const raw=String(place?.name||place?.address||'탐색 위치').trim();return raw.split(/\s+/).slice(0,4).join(' ')}
function inside(lng,lat){let hit=false;for(let i=0,j=LAND.length-1;i<LAND.length;j=i++){const a=LAND[i],b=LAND[j];if(((a[1]>lat)!=(b[1]>lat))&&(lng<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0]))hit=!hit}return hit}
function cityLabel(place){const text=String(place?.address||place?.name||'');const match=text.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^\s]*/);return match?.[0]||String(place?.name||'현재 위치').split(/\s+/)[0]}

function installKoreaCanvas(svg){
 if(!svg||svg.querySelector('#koreaMapLayer'))return;
 const ns='http://www.w3.org/2000/svg',layer=document.createElementNS(ns,'g');layer.id='koreaMapLayer';layer.setAttribute('class','tq-korea-map');
 let dots='';for(let lat=34.42;lat<=38.56;lat+=.14){for(let lng=125.95;lng<=129.55;lng+=.13){if(inside(lng,lat)){const p=geoToXY({lat,lng});dots+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.7"/>`}}}
 for(let lat=33.32;lat<=33.58;lat+=.13){for(let lng=126.15;lng<=126.90;lng+=.14){const dx=(lng-126.52)/.43,dy=(lat-33.45)/.18;if(dx*dx+dy*dy<1){const p=geoToXY({lat,lng});dots+=`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.1"/>`}}}
 const ulleung=geoToXY({lat:37.4845,lng:130.9057});dots+=`<circle cx="${ulleung.x.toFixed(1)}" cy="${ulleung.y.toFixed(1)}" r="4.2"/>`;
 const labels=MAP_LABELS.map(r=>{const p=geoToXY({lat:r[1],lng:r[2]});return `<g class="tq-map-city" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="4.8"/><text x="${r[3]}" y="${r[4]}">${r[0]}</text></g>`}).join('');
 layer.innerHTML=`<g class="tq-dot-land">${dots}</g><g class="tq-city-labels">${labels}</g>`;
 const field=svg.querySelector('.tq-geo-field');field?.after(layer);
 const style=document.createElement('style');style.id='tqKoreaCanvasStyle';style.textContent=`
 .tq-geo-grid,.tq-geo-ring-labels,.tq-geo-cardinals,.tq-geo-contours,.tq-geo-ambient{display:none!important}.tq-korea-map{pointer-events:none}.tq-dot-land circle{fill:#78877f;opacity:.64}.tq-map-city circle{fill:#c9ff45;opacity:.96;stroke:#0b1016;stroke-width:2}.tq-map-city text{fill:#eef4ef;font:800 16px Pretendard,"Noto Sans KR",system-ui,sans-serif;letter-spacing:-.02em;paint-order:stroke;stroke:#0b1016;stroke-width:5px;stroke-linejoin:round}.tq-geo-origin .core{fill:#c9ff45!important}.tq-geo-origin text{fill:#c9ff45!important}
 .tq-geo-explorer{height:auto!important;min-height:0!important;overflow:visible!important;padding-bottom:calc(96px + env(safe-area-inset-bottom,0px))!important}.tq-geo-stage{position:relative!important;inset:auto!important;height:min(76vw,680px)!important;min-height:500px!important;overflow:hidden!important;background:radial-gradient(circle at 50% 48%,rgba(201,255,69,.045),transparent 55%)}.tq-geo-canvas{inset:8px 0 auto!important;width:100%!important;height:calc(100% - 14px)!important;min-height:0!important}.tq-geo-readout{top:auto!important;bottom:8px!important}.tq-geo-search-sheet{position:relative!important;z-index:20!important;left:auto!important;right:auto!important;bottom:auto!important;top:auto!important;transform:none!important;transition:none!important;max-height:none!important;overflow:visible!important;margin:10px 14px 0!important;padding:14px!important;touch-action:auto!important}.tq-geo-sheet-handle,.tq-geo-sheet-expand{display:none!important}.tq-geo-sheet-top{grid-template-columns:minmax(0,1fr)!important}.tq-geo-location-popup.tq-location-result-bar{position:relative!important;z-index:12!important;left:auto!important;top:auto!important;width:auto!important;transform:none!important;margin:10px 14px 0!important;border-radius:15px!important;box-shadow:none!important}.tq-start-region-list{display:grid;gap:7px;max-height:min(54vh,520px);overflow:auto;padding:2px 3px 12px;overscroll-behavior:contain}.tq-start-region-list button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:54px;padding:0 16px;border:1px solid #2d3b47;border-radius:15px;background:#101820;color:#eef3f5;text-align:left;font:700 15px inherit}.tq-start-region-list button small{color:#c9ff45;font:700 11px ui-monospace,monospace;letter-spacing:.08em}.tq-start-picker-card .tq-start-divider span{white-space:nowrap}.tq-start-picker-card header p{margin-bottom:0}@media(max-width:720px){.tq-geo-explorer{margin-bottom:78px!important}.tq-geo-stage{height:62vh!important;min-height:470px!important;max-height:610px!important}.tq-geo-location-popup.tq-location-result-bar{margin:8px 12px 0!important}.tq-geo-search-sheet{margin:8px 8px 0!important;border-radius:24px!important}.tq-geo-readout{left:12px!important;right:12px!important;bottom:6px!important}.tq-map-city text{font-size:14px}}
 `;document.head.appendChild(style)
}
function normalizeLayout(sheet,popup){if(sheet){sheet.removeAttribute('data-state');sheet.classList.add('is-fixed-panel');sheet.querySelector('#geoSheetHandle')?.remove();sheet.querySelector('#geoSheetExpand')?.remove()}const stage=$('.tq-geo-stage');if(popup&&stage&&popup.parentElement===stage){stage.after(popup);popup.classList.add('tq-location-result-bar')}}

export function initGeoExplorer({state,travelService,setOrigin,onSearch,onSelect}){
 const svg=$('#geoCanvas'),target=$('#geoTarget'),vector=$('#geoVector'),pulse=$('#geoTargetPulse'),placeLabel=$('#geoExplorePlace'),distanceLabel=$('#geoExploreDistance'),directionLabel=$('#geoExploreDirection'),popup=$('#geoLocationPopup'),popupTitle=$('#geoPopupTitle'),popupMeta=$('#geoPopupMeta'),popupUse=$('#geoPopupUse'),startLabel=$('#geoStartLabel'),results=$('#geoResults'),sheet=$('#geoSearchSheet'),input=$('#aiInput');let dragging=false,dragPointer=null,lastGeo={lat:36.25,lng:127.8};installKoreaCanvas(svg);normalizeLayout(sheet,popup);const changeBtn=$('#geoStartChange');if(changeBtn)changeBtn.textContent='지역 선택';
 function setText(node,value){if(node)node.textContent=value}
 function updateVector(targetPoint){const o=geoToXY(state.origin||{lat:35.18,lng:129.08}),p=geoToXY(targetPoint||lastGeo);if(vector){vector.setAttribute('x1',o.x);vector.setAttribute('y1',o.y);vector.setAttribute('x2',p.x);vector.setAttribute('y2',p.y)}const originNode=svg?.querySelector('.tq-geo-origin');if(originNode)originNode.setAttribute('transform',`translate(${o.x} ${o.y})`);if(target)target.setAttribute('transform',`translate(${p.x} ${p.y})`);if(pulse)pulse.setAttribute('transform',`translate(${p.x} ${p.y})`)}
 function previewGeo(point){lastGeo={lat:point.lat,lng:point.lng};const origin=state.origin,km=origin?geoKm(origin,lastGeo):0,bearing=origin?geoBearing(origin,lastGeo):0,dir=bearingLabel8(bearing);updateVector(lastGeo);setText(distanceLabel,Math.round(km)+' km');setText(directionLabel,dir+' · '+Math.round(bearing)+'°');return{point:lastGeo,km,bearing,dir}}
 async function resolveTarget(preview){if(!state.origin)return;const point=preview.point;state.minKm=Math.max(0,Math.round(Math.max(0,preview.km-60)/10)*10);state.targetKm=Math.min(450,Math.round(Math.min(450,preview.km+60)/10)*10);state.direction=preview.dir;state.exploreTarget={...point,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir,name:'위치 분석 중',address:''};if(popup){popup.hidden=false;popup.classList.add('is-loading')}setText(popupTitle,'위치 분석 중…');setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향');try{const found=await travelService.reverseGeocode(point.lat,point.lng);if(found)state.exploreTarget={...state.exploreTarget,...found,distanceKm:preview.km,bearing:preview.bearing,direction:preview.dir}}catch{}const name=concisePlace(state.exploreTarget);setText(placeLabel,name);setText(popupTitle,name);setText(popupMeta,Math.round(preview.km)+'km · '+preview.dir+' 방향');popup?.classList.remove('is-loading')}
 function resetTarget(){const base=state.origin?{lat:Math.min(38.2,state.origin.lat+1.25),lng:Math.max(125.4,state.origin.lng-.45)}:{lat:36.25,lng:127.8};previewGeo(base);state.exploreTarget=null;setText(placeLabel,'점 지도에서 포인트를 드래그해 탐색하세요.');if(popup)popup.hidden=true}
 function syncOrigin(){const origin=state.origin;if(!origin){setText(startLabel,'시작 위치를 설정하세요.');updateVector(lastGeo);return}setText(startLabel,origin.displayRegion||cityLabel(origin));resetTarget()}
 function startTargetDrag(e){if(!state.origin){toast('먼저 시작 위치를 설정해주세요.');openStartPicker();return}dragging=true;dragPointer=e.pointerId;target?.setPointerCapture?.(e.pointerId);target?.classList.add('is-dragging');if(popup)popup.hidden=true;const p=svgPoint(svg,e);previewGeo(xyToGeo(p.x,p.y));e.preventDefault()}
 function moveTarget(e){if(!dragging||e.pointerId!==dragPointer)return;const p=svgPoint(svg,e);previewGeo(xyToGeo(p.x,p.y));e.preventDefault()}
 async function endTargetDrag(e){if(!dragging||e.pointerId!==dragPointer)return;dragging=false;dragPointer=null;target?.classList.remove('is-dragging');const p=svgPoint(svg,e);await resolveTarget(previewGeo(xyToGeo(p.x,p.y)));e.preventDefault()}
 function createPicker(){let overlay=$('#geoStartPicker');if(overlay)return overlay;overlay=document.createElement('div');overlay.id='geoStartPicker';overlay.className='tq-start-picker';overlay.hidden=true;overlay.innerHTML=`<section class="tq-start-picker-card" role="dialog" aria-modal="true" aria-labelledby="geoStartPickerTitle"><header><div><small>START REGION</small><h2 id="geoStartPickerTitle">시·도 선택</h2><p>여행을 시작할 지역을 선택하세요.</p></div><button id="geoStartPickerClose" type="button" aria-label="닫기">×</button></header><button id="geoStartUseGps" class="tq-start-gps" type="button"><i></i><span><b>현재 위치 사용</b><small>GPS로 현재 도시를 자동 표시합니다.</small></span><em>→</em></button><div class="tq-start-divider"><span>시·도 직접 선택</span></div><div class="tq-start-region-list">${REGIONS.map((r,i)=>`<button type="button" data-region="${i}"><span>${r[0]}</span><small>${r[1]}</small></button>`).join('')}</div></section>`;document.body.appendChild(overlay);$('#geoStartPickerClose').onclick=closeStartPicker;overlay.addEventListener('click',e=>{if(e.target===overlay)closeStartPicker();const row=e.target.closest('[data-region]');if(row)selectRegion(Number(row.dataset.region))});$('#geoStartUseGps').onclick=useGpsOrigin;return overlay}
 function openStartPicker(){const overlay=createPicker();overlay.hidden=false;document.body.classList.add('tq-modal-open')}
 function closeStartPicker(){const overlay=$('#geoStartPicker');if(overlay)overlay.hidden=true;document.body.classList.remove('tq-modal-open')}
 async function selectRegion(index){const r=REGIONS[index];if(!r)return;const origin={name:r[0],address:r[0],displayRegion:r[0],lat:r[2],lng:r[3],placeTypeLabel:'시·도'};state.searchRegion=origin;await setOrigin(origin);syncOrigin();closeStartPicker();toast(r[0]+'에서 시작합니다.')}
 async function useGpsOrigin(){
  const btn=$('#geoStartUseGps')||$('#geoStartQuickGps');
  const support=gpsService.support();
  if(!support.ok){toast(support.error?.message||'현재 위치 기능을 사용할 수 없습니다. 지역을 선택해주세요.');return null}
  if(btn){btn.disabled=true;btn.classList.add('is-loading')}
  try{
    const pos=await gpsService.current({enableHighAccuracy:true,timeout:20000,maximumAge:0});
    const lat=pos.lat,lng=pos.lng;
    let found=null;
    try{found=await travelService.reverseGeocode(lat,lng)}catch{}
    const origin={...(found||{}),lat,lng,accuracy:pos.accuracyM,name:found?.name||'현재 위치',address:found?.address||'현재 위치'};
    origin.displayRegion=cityLabel(origin);
    state.searchRegion=origin;
    await setOrigin(origin);
    syncOrigin();
    closeStartPicker();
    toast(`${origin.displayRegion} · 현재 위치로 설정했습니다.`);
    return origin;
  }catch(err){
    toast(err?.message||'GPS 위치를 확인하지 못했습니다. 위치 권한을 확인해주세요.');
    return null;
  }finally{
    if(btn){btn.disabled=false;btn.classList.remove('is-loading')}
  }
 }
 function clearCandidates(){const group=$('#geoCandidateLayer');if(group)group.innerHTML='';if(results)results.innerHTML=''}
 function renderRecommendations(items=[]){clearCandidates();if(!state.origin||!Array.isArray(items)||!items.length)return;const group=$('#geoCandidateLayer');if(group){group.innerHTML=items.slice(0,8).map((item,index)=>{const p=geoToXY(item);return `<g class="tq-geo-candidate" data-geo-index="${index}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})"><circle r="19"></circle><text text-anchor="middle" dy="4">${String(index+1).padStart(2,'0')}</text></g>`}).join('');group.onclick=e=>{const node=e.target.closest('[data-geo-index]');if(node)onSelect?.(Number(node.dataset.geoIndex))}}if(results){results.innerHTML='<div class="tq-geo-result-head"><span>AI PICKS</span><b>'+items.length+'곳</b></div>'+items.slice(0,8).map((item,index)=>'<button type="button" data-result-index="'+index+'"><b>'+String(index+1).padStart(2,'0')+'</b><span><strong>'+esc(item.name)+'</strong><small>'+esc((item.category||'여행지')+' · '+Math.round(Number(item.distanceKm||item.geoDistanceKm||0))+'km')+'</small></span><em>선택</em></button>').join('');results.onclick=e=>{const row=e.target.closest('[data-result-index]');if(row)onSelect?.(Number(row.dataset.resultIndex))}}}
 function renderEmpty(message='현재 조건에서 추천 가능한 여행지가 부족합니다.'){clearCandidates();if(results)results.innerHTML='<div class="tq-start-empty">'+esc(message)+'</div>'}
 function renderSearchState(label){const node=$('#geoSearchContext');if(node)node.textContent=label||'점 지도 탐색 포인트와 자연어 조건을 함께 분석합니다.'}
 function focusSearch(){input?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>input?.focus({preventScroll:true}),180)}
 target?.addEventListener('pointerdown',startTargetDrag);svg?.addEventListener('pointermove',moveTarget);svg?.addEventListener('pointerup',endTargetDrag);svg?.addEventListener('pointercancel',endTargetDrag);popupUse?.addEventListener('click',focusSearch);changeBtn?.addEventListener('click',openStartPicker);$('#geoStartQuickGps')?.addEventListener('click',useGpsOrigin);syncOrigin();return{syncOrigin,openStartPicker,closeStartPicker,useGpsOrigin,renderRecommendations,renderEmpty,clearCandidates,renderSearchState,setSheetState:()=>normalizeLayout(sheet,popup),focusSearch,resetTarget}
}
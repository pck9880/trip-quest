import { $, esc, toast } from '../core/dom.js';
import { gpsService } from '../services/gps-service.js';

const REGIONS=[
 ['서울특별시','서울',37.5665,126.9780],['부산광역시','부산',35.1796,129.0756],['대구광역시','대구',35.8714,128.6014],['인천광역시','인천',37.4563,126.7052],['광주광역시','광주',35.1595,126.8526],['대전광역시','대전',36.3504,127.3845],['울산광역시','울산',35.5384,129.3114],['세종특별자치시','세종',36.4800,127.2890],['경기도','경기',37.4138,127.5183],['강원특별자치도','강원',37.8228,128.1555],['충청북도','충북',36.6357,127.4917],['충청남도','충남',36.5184,126.8000],['전북특별자치도','전북',35.7175,127.1530],['전라남도','전남',34.8679,126.9910],['경상북도','경북',36.4919,128.8889],['경상남도','경남',35.4606,128.2132],['제주특별자치도','제주',33.4890,126.4983]
];

function cityLabel(place){
 const raw=String(place?.displayRegion||place?.address||place?.name||'').trim();
 const match=raw.match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[^ ]*/);
 return match?.[0]||raw.split(/[ ,]/).filter(Boolean)[0]||'현재 위치';
}
function installSearchOnlyStyle(){
 if($('#tqSearchOnlyStyle'))return;
 const style=document.createElement('style');style.id='tqSearchOnlyStyle';style.textContent=`
 .tq-search-only{min-height:0!important;height:auto!important;padding:18px 0 28px!important;overflow:visible!important}
 .tq-search-only-panel{position:relative!important;inset:auto!important;transform:none!important;width:min(760px,calc(100% - 28px))!important;max-height:none!important;margin:0 auto!important;padding:20px!important;overflow:visible!important;border-radius:24px!important}
 .tq-search-only-panel .tq-geo-sheet-top{grid-template-columns:minmax(0,1fr)!important}.tq-search-only-panel .tq-geo-start{margin-bottom:18px}.tq-search-only-panel .tq-geo-search-copy{margin-bottom:14px}
 .tq-search-only-panel .tq-geo-search-copy h1{font-size:clamp(28px,5vw,44px);line-height:1.05}.tq-search-only-panel .tq-geo-search-copy p{max-width:580px;color:#8f9ba4}
 .tq-start-region-list{display:grid;gap:7px;max-height:min(54vh,520px);overflow:auto;padding:2px 3px 12px;overscroll-behavior:contain}.tq-start-region-list button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:54px;padding:0 16px;border:1px solid #2d3b47;border-radius:15px;background:#101820;color:#eef3f5;text-align:left;font:700 15px inherit}.tq-start-region-list button small{color:#c9ff45;font:700 11px ui-monospace,monospace;letter-spacing:.08em}.tq-start-picker-card .tq-start-divider span{white-space:nowrap}
 @media(max-width:720px){.tq-search-only{padding:10px 0 20px!important}.tq-search-only-panel{width:calc(100% - 16px)!important;padding:16px!important;border-radius:22px!important}.tq-search-only-panel .tq-geo-search-copy h1{font-size:30px}}
 `;document.head.appendChild(style)
}

export function initGeoExplorer({state,travelService,setOrigin,onSelect}){
 installSearchOnlyStyle();
 const startLabel=$('#geoStartLabel'),results=$('#geoResults'),input=$('#aiInput');
 const changeBtn=$('#geoStartChange');
 function syncOrigin(){const origin=state.origin||state.searchRegion;if(startLabel)startLabel.textContent=origin?cityLabel(origin):'시작 위치를 설정하세요.'}
 function createPicker(){
  let overlay=$('#geoStartPicker');if(overlay)return overlay;
  overlay=document.createElement('div');overlay.id='geoStartPicker';overlay.className='tq-start-picker';overlay.hidden=true;
  overlay.innerHTML='<div class="tq-start-picker-card"><header><div><small>START LOCATION</small><h2>어디에서 출발하나요?</h2><p>현재 위치를 사용하거나 지역을 선택하세요.</p></div><button id="geoStartPickerClose" type="button" aria-label="닫기">×</button></header><button id="geoStartUseGps" class="tq-start-gps" type="button"><b>◎</b><span><strong>현재 위치 사용</strong><small>GPS로 출발 위치 확인</small></span></button><div class="tq-start-divider"><span>또는 지역 선택</span></div><div class="tq-start-region-list">'+REGIONS.map((r,i)=>'<button type="button" data-region="'+i+'"><span>'+esc(r[0])+'</span><small>'+esc(r[1])+'</small></button>').join('')+'</div></div>';
  document.body.appendChild(overlay);
  $('#geoStartPickerClose').onclick=closeStartPicker;overlay.addEventListener('click',e=>{if(e.target===overlay)closeStartPicker();const row=e.target.closest('[data-region]');if(row)selectRegion(Number(row.dataset.region))});$('#geoStartUseGps').onclick=useGpsOrigin;return overlay
 }
 function openStartPicker(){const overlay=createPicker();overlay.hidden=false;document.body.classList.add('tq-modal-open')}
 function closeStartPicker(){const overlay=$('#geoStartPicker');if(overlay)overlay.hidden=true;document.body.classList.remove('tq-modal-open')}
 async function selectRegion(index){const r=REGIONS[index];if(!r)return;const origin={name:r[0],address:r[0],displayRegion:r[0],lat:r[2],lng:r[3],placeTypeLabel:'시·도'};state.searchRegion=origin;state.exploreTarget=null;await setOrigin(origin);syncOrigin();closeStartPicker();toast(r[0]+'에서 시작합니다.')}
 async function useGpsOrigin(){
  const btn=$('#geoStartUseGps')||$('#geoStartQuickGps'),support=gpsService.support();
  if(!support.ok){toast(support.error?.message||'현재 위치 기능을 사용할 수 없습니다. 지역을 선택해주세요.');return null}
  if(btn){btn.disabled=true;btn.classList.add('is-loading')}
  try{const pos=await gpsService.current({enableHighAccuracy:true,timeout:20000,maximumAge:0});let found=null;try{found=await travelService.reverseGeocode(pos.lat,pos.lng)}catch{}const origin={...(found||{}),lat:pos.lat,lng:pos.lng,accuracy:pos.accuracyM,name:found?.name||'현재 위치',address:found?.address||'현재 위치'};origin.displayRegion=cityLabel(origin);state.searchRegion=origin;state.exploreTarget=null;await setOrigin(origin);syncOrigin();closeStartPicker();toast(origin.displayRegion+' · 현재 위치로 설정했습니다.');return origin}catch(err){toast(err?.message||'GPS 위치를 확인하지 못했습니다. 위치 권한을 확인해주세요.');return null}finally{if(btn){btn.disabled=false;btn.classList.remove('is-loading')}}
 }
 function clearCandidates(){if(results)results.innerHTML=''}
 function renderRecommendations(items=[]){clearCandidates();if(!Array.isArray(items)||!items.length)return;if(results){results.innerHTML='<div class="tq-geo-result-head"><span>AI PICKS</span><b>'+items.length+'곳</b></div>'+items.slice(0,8).map((item,index)=>'<button type="button" data-result-index="'+index+'"><b>'+String(index+1).padStart(2,'0')+'</b><span><strong>'+esc(item.name)+'</strong><small>'+esc((item.category||'여행지')+' · '+Math.round(Number(item.distanceKm||item.geoDistanceKm||0))+'km')+'</small></span><em>선택</em></button>').join('');results.onclick=e=>{const row=e.target.closest('[data-result-index]');if(row)onSelect?.(Number(row.dataset.resultIndex))}}}
 function renderEmpty(message='현재 조건에서 추천 가능한 여행지가 부족합니다.'){clearCandidates();if(results)results.innerHTML='<div class="tq-start-empty">'+esc(message)+'</div>'}
 function renderSearchState(label){const node=$('#geoSearchContext');if(node)node.textContent=label||'여행 조건을 분석하고 있습니다.'}
 function focusSearch(){input?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>input?.focus({preventScroll:true}),180)}
 function resetTarget(){state.exploreTarget=null}
 changeBtn?.addEventListener('click',openStartPicker);$('#geoStartQuickGps')?.addEventListener('click',useGpsOrigin);syncOrigin();
 return{syncOrigin,openStartPicker,closeStartPicker,useGpsOrigin,renderRecommendations,renderEmpty,clearCandidates,renderSearchState,setSheetState:()=>{},focusSearch,resetTarget}
}

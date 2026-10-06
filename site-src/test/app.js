import { $, setText, toast } from './js/core/dom.js';
import { showMainLanding, hideMainLanding } from './js/ui/landing.js';
import { createWizardUI } from './js/ui/wizard.js';
import { createSearchController } from './js/controllers/search-controller.js';
import { bindAppActions } from './js/controllers/app-controller.js';
import { initMap } from './js/ui/main-map.js';
import { createTripStore } from './js/store/trip-store.js';
import { createTravelService } from './js/services/travel-service.js';
import { initKeepPanel } from './js/ui/keep-panel.js';
import { createQuestSelector } from './js/ui/quest-selector.js';

const store=createTripStore();
const state=store.state;
const travelService=createTravelService();
const wizardUI=createWizardUI(state);
const {setStep,syncCategoriesUI,syncFacilitiesUI,validateUIRuntime,bindChoices}=wizardUI;
const questSelector=createQuestSelector({state,setStep,syncCategoriesUI,syncFacilitiesUI});
const searchController=createSearchController({state,travelService,setStep});
const {sortRecommendations,recommend,openKeptCourse}=searchController;

function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true}

function buildShareUrl(){
  if(!state.selected)return location.href.split('?')[0];
  const u=new URL(location.href);
  u.search='';
  u.searchParams.set('place',state.selected.name);
  return u.toString();
}
async function shareTrip(){
  const url=buildShareUrl();
  const title=state.selected?`TRIP QUEST · ${state.selected.name}`:'TRIP QUEST';
  const text=state.selected?`${state.selected.name} · TRIP QUEST`:'TRIP QUEST';
  try{
    if(navigator.share){await navigator.share({title,text,url});return}
    await navigator.clipboard.writeText(url);toast('공유 링크를 복사했습니다.');
  }catch(e){if(e?.name!=='AbortError')toast('공유를 완료하지 못했습니다.')}
}
function initPWA(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
  const btn=$('#installBtn');
  if(btn){
    if(isStandalone())btn.hidden=true;
    else if(isIOS()){btn.hidden=false;btn.textContent='홈 화면 추가'}
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;btn.hidden=false;btn.textContent='앱 설치'});
    window.addEventListener('appinstalled',()=>{state.installPrompt=null;btn.hidden=true;toast('TRIP QUEST가 설치되었습니다.')});
    btn.onclick=async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;btn.hidden=true}else if(isIOS())$('#iosInstallTip').hidden=false};
  }
  $('#closeInstallTip')?.addEventListener('click',()=>$('#iosInstallTip').hidden=true);
  $('#iosInstallTip')?.addEventListener('click',e=>{if(e.target===$('#iosInstallTip'))$('#iosInstallTip').hidden=true});
  $('#topShareBtn')?.addEventListener('click',shareTrip);
  $('#shareTripBtn')?.addEventListener('click',shareTrip);
}
async function loadConfig(){
  state.config=await travelService.getConfig();
  setText('#providerNow',state.config?.national?.status==='ready'?'전국 공식 DB':'공식 DB 준비 + 지도 보조');
  setText('#updatedAt',state.config?.national?.total?('정규화 '+Number(state.config.national.total).toLocaleString()+'곳'):'선택형 지역 엔진');
}
function resetTrip(){
  store.resetJourney();questSelector.reset();
  $('#ranking').innerHTML='지역과 플레이스를 선택하면 결과가 표시됩니다.';
  $('#ranking').className='ranking empty-state';
  setStep(1);showMainLanding();toast('새 TRIP QUEST를 시작합니다.');
}
function bindActions(){
  bindAppActions({state,hideMainLanding,setStep,sortRecommendations,resetTrip,recommend});
}
function showSafeRuntimeError(){
  const ranking=$('#ranking');
  if(ranking){ranking.className='ranking empty-state';ranking.innerHTML='<div><strong>화면을 다시 불러오면 정상적으로 사용할 수 있습니다.</strong><br><br><button id="runtimeReloadBtn" class="btn primary" type="button">앱 새로고침</button></div>';$('#runtimeReloadBtn')?.addEventListener('click',()=>location.reload())}
}
if(typeof window!=='undefined'){
  window.addEventListener('error',e=>{console.error('TRIP QUEST runtime error',e.error||e.message);if(state.step===4)showSafeRuntimeError()});
  window.addEventListener('unhandledrejection',e=>{console.error('TRIP QUEST async error',e.reason);if(state.step===4)showSafeRuntimeError()});
}

async function boot(){
  initMap();
  initKeepPanel({onOpenCourse:openKeptCourse});
  validateUIRuntime();bindChoices();questSelector.bind();bindActions();initPWA();
  syncCategoriesUI();syncFacilitiesUI();setStep(1);showMainLanding();
  try{await loadConfig()}catch{setText('#providerNow','지도 데이터 연결 확인 필요')}
}
if(typeof document!=='undefined')boot();

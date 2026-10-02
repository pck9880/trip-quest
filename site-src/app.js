import { $, all, setText, loading, toast, esc } from './js/core/dom.js';
import { categoryLabels } from './js/data/ui-options.js';
import { activeVehicleProfile } from './js/services/vehicle-settings.js';
import { estimateRoundTripToll } from './js/domain/trip-cost.js';
import { approxRoute, roadRoute } from './js/services/routing.js';
import { clientWeather, selectWeatherAt } from './js/services/weather.js';
import { localGeocode } from './js/services/geocoding.js';
import { normalizedDistanceRange, localRecommend } from './js/domain/recommendation.js';
import { refineRoadDistanceResults } from './js/usecases/search-destinations.js';
import { localAI } from './js/domain/intent-parser.js';
import { coursePack } from './js/domain/course-planner.js';
import { initTimes, updateSchedulePreview } from './js/ui/time-controls.js';
import { showMainLanding, hideMainLanding } from './js/ui/landing.js';
import { createWizardUI } from './js/ui/wizard.js';
import { createSearchController } from './js/controllers/search-controller.js';
import { createOriginController } from './js/controllers/origin-controller.js';
import { bindAppActions } from './js/controllers/app-controller.js';
import { initMap } from './js/ui/main-map.js';
const state={step:1,origin:null,minKm:0,targetKm:100,direction:'전체',categories:['관광지'],recommendations:[],selected:null,selectedCourse:null,selectedCourseData:null,config:null,aiBusy:false,installPrompt:null,sharedTrip:null,sharedPending:false,resultSort:'recommend',lastSearchMode:'ai',lastAIMessage:'',activeDistanceBand:null};






async function api(url,opts={}){const u=new URL(url,location.href),method=(opts.method||'GET').toUpperCase(),body=opts.body?JSON.parse(opts.body):{};
  if(u.pathname.endsWith('/api/config'))return {providers:{kakao:false,tmap:false,openai:false,weather:true},defaultGasPrice:1858,fuelEconomyKmL:11,publicBaseUrl:''};
  if(u.pathname.endsWith('/api/geocode'))return {items:await localGeocode(u.searchParams.get('q')||'')};
  if(u.pathname.endsWith('/api/bootstrap')){const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng')),weather=await clientWeather(lat,lng);return {weather,traffic:{label:'경로 선택 후 계산',avgSpeed:0,source:'정적 배포판'},updatedAt:new Date().toISOString()}}
  if(u.pathname.endsWith('/api/recommend')){const base=localRecommend(body),items=await refineRoadDistanceResults(base,body);return {items,source:items.some(x=>x.roadVerified)?'도로 경로 + 내장 장소 데이터':'근사 경로 + 내장 장소 데이터'}};
  if(u.pathname.endsWith('/api/trip-summary')){
    const [a,b]=await Promise.all([roadRoute(body.origin,body.destination),roadRoute(body.destination,body.origin)]);
    const distanceKm=a.distanceKm+b.distanceKm,drivingMin=a.timeMin+b.timeMin,vehicle=activeVehicleProfile(body);
    const energyAmount=distanceKm/vehicle.efficiency,energyCost=Math.round(energyAmount*vehicle.energyPrice);
    const toll=estimateRoundTripToll(distanceKm,vehicle.tollDiscount);
    return {outbound:a,inbound:b,total:{
      distanceKm,drivingMin,toll,tripCost:energyCost+toll,
      fuelLiters:energyAmount,fuelCost:energyCost,
      energyAmount,energyCost,energyUnit:vehicle.energyUnit,energyPrice:vehicle.energyPrice,
      vehicleLabel:vehicle.vehicleLabel,fuelLabel:vehicle.fuelLabel,efficiency:vehicle.efficiency,efficiencyUnit:vehicle.efficiencyUnit,
      energyLabel:vehicle.fuel==='electric'?'예상 전력':'예상 연료',
      costLabel:vehicle.fuel==='electric'?'충전비':'연료비'
    },fuelEconomyKmL:vehicle.efficiency}
  }
  if(u.pathname.endsWith('/api/courses')){const ww=await clientWeather(body.destination.lat,body.destination.lng),w=selectWeatherAt(ww,body.departure);return {weather:w,courses:await coursePack(body,w),provider:{ai:false,road:'osrm-or-fallback',kakao:false}}}
  if(u.pathname.endsWith('/api/ai-search')){const r=localAI(body.message||'',body.context||{});if(r.intent==='travel_search'&&body.context?.origin){const merged={...body.context,...r.patch,focusQuery:r.focusQuery,semanticProfile:r.semanticProfile};r.items=await refineRoadDistanceResults(localRecommend(merged),merged)}return r}
  throw new Error('지원하지 않는 요청입니다.');
}



const wizardUI=createWizardUI(state);
const {setStep,syncDistanceUI,setDistanceBoundary,syncCategoriesUI,syncDirectionUI,validateUIRuntime,bindChoices}=wizardUI;
const searchController=createSearchController({state,api,setStep});
const {sortRecommendations,currentPayload,recommend,selectPlace,renderRanking}=searchController;
const originController=createOriginController({state,api,setStep,recommend});
const {startFromMainLocation,useLocation,setOrigin,refreshLive,searchOrigin}=originController;

function isIOS(){return /iphone|ipad|ipod/i.test(navigator.userAgent)}
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone===true}
function encodeShare(obj){const bytes=new TextEncoder().encode(JSON.stringify(obj));let bin='';for(const b of bytes)bin+=String.fromCharCode(b);return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeShare(str){try{let s=str.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';const bin=atob(s),bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}catch{return null}}
function appBaseUrl(){return state.config?.publicBaseUrl || `${location.origin}${location.pathname}`}
function buildShareUrl(){
  if(!state.selected)return appBaseUrl();
  const payload={v:1,destination:{name:state.selected.name,category:state.selected.category,lat:state.selected.lat,lng:state.selected.lng,address:state.selected.address||''},course:state.selectedCourse||'',minKm:state.minKm,targetKm:state.targetKm,direction:state.direction,categories:state.categories};
  const u=new URL(appBaseUrl(),location.href);u.searchParams.set('trip',encodeShare(payload));return u.toString();
}
async function shareTrip(){
  const hasTrip=!!state.selected;const url=buildShareUrl();
  const title=hasTrip?`TRIP QUEST · ${state.selected.name}`:'TRIP QUEST · 국내여행 AI 플래너';
  const text=hasTrip?`${state.selected.name}${state.selectedCourse?` · ${state.selectedCourse}코스`:''}\nTRIP QUEST에서 여행 정보를 확인해보세요.`:'국내여행 AI 플래너 TRIP QUEST';
  try{if(navigator.share){await navigator.share({title,text,url});return}await navigator.clipboard.writeText(url);toast('공유 링크를 복사했습니다.')}catch(e){if(e?.name!=='AbortError')toast('공유를 완료하지 못했습니다.')}
}
function hydrateSharedTrip(){
  const q=new URL(location.href).searchParams.get('trip');if(!q)return;
  const data=decodeShare(q);if(!data?.destination?.name)return;state.sharedTrip=data;
  $('#sharedTripBanner').hidden=false;setText('#sharedTripTitle',data.destination.name);setText('#sharedTripMeta',`${data.destination.category||'여행지'}${data.course?` · ${data.course}코스`:''} · 공유 링크`);
}
async function useSharedTrip(){
  const d=state.sharedTrip;if(!d)return;
  if(Number.isFinite(Number(d.minKm)))state.minKm=Number(d.minKm);if(Number.isFinite(Number(d.targetKm)))state.targetKm=Number(d.targetKm);syncDistanceUI()
  if(d.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(d.direction)){state.direction=d.direction;syncDirectionUI()}
  if(Array.isArray(d.categories)&&d.categories.length){state.categories=d.categories.filter(x=>categoryLabels.includes(x));syncCategoriesUI()}
  if(!state.origin){state.sharedPending=true;setStep(1);toast('출발지를 설정하면 공유 받은 여행지를 기준으로 다시 계산합니다.');return}
  await recommend({focusQuery:d.destination.name});
}
function initPWA(){
  if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});
  hydrateSharedTrip();
  const btn=$('#installBtn');
  if(isStandalone()){btn.hidden=true}else if(isIOS()){btn.hidden=false;btn.textContent='홈 화면 추가'}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.installPrompt=e;btn.hidden=false;btn.textContent='앱 설치'});
  window.addEventListener('appinstalled',()=>{state.installPrompt=null;btn.hidden=true;toast('TRIP QUEST가 설치되었습니다.')});
  btn.onclick=async()=>{if(state.installPrompt){state.installPrompt.prompt();await state.installPrompt.userChoice;state.installPrompt=null;btn.hidden=true}else if(isIOS()){$('#iosInstallTip').hidden=false}else toast('브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.')};
  $('#closeInstallTip').onclick=()=>$('#iosInstallTip').hidden=true;
  $('#iosInstallTip').onclick=e=>{if(e.target===$('#iosInstallTip'))$('#iosInstallTip').hidden=true};
  $('#topShareBtn').onclick=shareTrip;$('#shareTripBtn').onclick=shareTrip;$('#sharedTripUseBtn').onclick=useSharedTrip;
}










async function loadConfig(){
  state.config=await api('/api/config');$('#gasPrice').value=state.config.defaultGasPrice;const p=state.config.providers;
  setText('#providerNow','모바일 즉시실행');setText('#updatedAt','v0.52 · UI·컨트롤러 분리 · 기존 기능 유지');
}





function resetTrip(){document.body.classList.remove('tq-advanced-open');const manualBar=$('#openAdvancedSearch');if(manualBar){manualBar.setAttribute('aria-expanded','false');manualBar.classList.remove('open')}state.minKm=0;state.targetKm=100;state.resultSort='recommend';state.activeDistanceBand=null;state.lastSearchMode='ai';state.lastAIMessage='';state.direction='전체';state.categories=['관광지'];state.recommendations=[];state.selected=null;state.selectedCourse=null;state.selectedCourseData=null;state.sharedPending=false;syncDistanceUI();all('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='전체'));syncCategoriesUI();$('#ranking').innerHTML='조건을 설정한 뒤 추천지를 찾아보세요.';$('#ranking').className='ranking empty-state';initTimes();setStep(1);showMainLanding();toast('새 여행을 시작합니다.')}

){state.lastSearchMode='manual';state.activeDistanceBand=extra.distanceBand||null;if(!state.origin){toast('출발지를 먼저 설정하세요.');setStep(1);return}loading(true);setStep(4);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='여행 후보를 계산하고 있습니다…';$('#noMatchActions').hidden=true;try{const j=await api('/api/recommend',{method:'POST',body:JSON.stringify({...currentPayload(),...extra,distanceBand:state.activeDistanceBand})});state.recommendations=j.items||[];state.selected=null;sortRecommendations('recommend',false);renderRanking();drawMap(state.origin,state.recommendations);setText('#resultCaption',state.activeDistanceBand?`비슷한 거리 ${Math.round(state.activeDistanceBand.min)}~${Math.round(state.activeDistanceBand.max)}km · ${state.direction==='전체'?'전체 방향':state.direction}`:`${state.minKm}~${state.targetKm}km · ${state.direction==='전체'?'전체 방향':state.direction} · ${state.categories.join(' · ')||'전체 취향'}`);setText('#mapStatus',`후보 ${state.recommendations.length}곳 · ${j.source||'데이터 검색'}`)}catch(e){$('#ranking').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);setStep(4)}}




function applyPatch(patch={}){
  /* 거리 범위는 AI 문장이 아니라 상단 최소/최대 슬라이더가 전담합니다. */
  if(patch.direction&&['전체','북','북동','동','남동','남','남서','서','북서'].includes(patch.direction)){state.direction=patch.direction;syncDirectionUI()}
  if(Array.isArray(patch.categories)){state.categories=[...new Set(patch.categories.filter(x=>categoryLabels.includes(x)))];if(!state.categories.length&&patch.keepEmpty!==true)state.categories=['관광지'];syncCategoriesUI()}
  if(patch.departure)$('#departTime').value=patch.departure;if(patch.returnTime)$('#returnTime').value=patch.returnTime;if(patch.gasPrice)$('#gasPrice').value=patch.gasPrice;updateSchedulePreview();
}
function startAIProgressGauge(){
  const wrap=$('#aiProgress'),fill=$('#aiProgressFill'),label=$('#aiProgressText'),eta=$('#aiEta');
  if(!wrap||!fill)return ()=>{};
  wrap.hidden=false;fill.style.width='4%';if(label)label.textContent='4%';if(eta)eta.textContent='예상 1~3초';
  const started=performance.now();
  const timer=setInterval(()=>{
    const elapsed=(performance.now()-started)/1000;
    const pct=Math.min(88,Math.round(8+elapsed*38));
    fill.style.width=pct+'%';if(label)label.textContent=pct+'%';
    if(eta)eta.textContent=elapsed<1?'약 2초 남음':elapsed<2?'약 1초 남음':'마무리 중';
  },90);
  return (ok=true)=>{
    clearInterval(timer);
    const elapsed=(performance.now()-started)/1000;
    fill.style.width=ok?'100%':'100%';if(label)label.textContent=ok?'100%':'중단';
    if(eta)eta.textContent=ok?`완료 · ${elapsed.toFixed(1)}초`:'검색 실패';
    wrap.classList.toggle('error',!ok);wrap.classList.toggle('done',ok);
    setTimeout(()=>{wrap.hidden=true;wrap.classList.remove('done','error');fill.style.width='0%'},1700);
  };
}
function showAI(result){
  $('#aiConversation').hidden=false;
  setText('#aiMode','여행 전용 AI 가이드');
  setText('#aiReply',result.message||'요청을 처리했습니다.');
  const tags=$('#aiAnalysisTags');
  if(tags){
    const kws=result.analysisKeywords||[];
    tags.innerHTML=kws.map(x=>`<span>${esc(x)}</span>`).join('');
    tags.hidden=!kws.length;
  }
  const choices=result.choices||[];
  $('#aiChoices').innerHTML=choices.map((c,i)=>`<button data-i="${i}">${esc(c.label)}</button>`).join('');
  $('#aiChoices').onclick=e=>{const b=e.target.closest('button');if(!b)return;handleAIChoice(choices[Number(b.dataset.i)])};
  if(result.patch)applyPatch(result.patch);
  if(Array.isArray(result.items)){
    state.recommendations=result.items;state.selected=null;sortRecommendations('recommend',false);renderRanking();drawMap(state.origin,state.recommendations);
    setText('#resultCaption',`AI 요청 반영 · ${state.minKm}~${state.targetKm}km`);
    setStep(4);
    setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),180);
  }
}
function ensureAIOrigin(){
  if(state.origin)return Promise.resolve(state.origin);
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error('현재 위치를 사용할 수 없습니다. 출발지를 먼저 설정해주세요.'));return}
    setText('#resultCaption','AI 추천 · 현재 위치 확인 중');
    $('#ranking').className='ranking empty-state';
    $('#ranking').innerHTML='추천지를 계산하기 위해 현재 위치를 확인하고 있습니다…';
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{
        await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});
        resolve(state.origin);
      }catch(e){reject(e)}
    },()=>reject(new Error('위치 권한이 필요합니다. 위치를 허용하거나 출발지를 직접 설정해주세요.')),{enableHighAccuracy:true,timeout:8000});
  });
}

async function askAI(message,options={}){
  if(!message.trim()||state.aiBusy)return;
  state.lastSearchMode='ai';state.lastAIMessage=message.trim();state.activeDistanceBand=options.distanceBand||null;
  state.aiBusy=true;
  const btn=$('#aiSend'),status=$('#aiSearchStatus'),finishGauge=startAIProgressGauge();
  $('#aiConversation').hidden=false;$('#aiChoices').innerHTML='';
  setText('#aiMode','요청 분석 중');setText('#aiReply','문장에서 여행 취향과 조건을 찾고 있습니다…');
  if(status){status.hidden=false;status.className='ai-search-status working';status.textContent='1/2 · 키워드와 여행 의도 분석 중…'}
  btn.disabled=true;btn.classList.remove('ai-done','ai-error');btn.textContent='분석 중…';

  // AI 검색은 즉시 추천지 페이지로 전환한다.
  state.selected=null;
  setStep(4);
  $('#ranking').className='ranking empty-state';
  $('#ranking').innerHTML='AI가 요청을 분석하고 추천지를 찾고 있습니다…';
  setText('#resultCaption','AI 분석 중 · 잠시만 기다려주세요');
  setText('#mapStatus','AI 추천 준비 중');
  setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),80);

  try{
    await ensureAIOrigin();
    await new Promise(r=>setTimeout(r,520));
    btn.textContent='추천지 찾는 중…';
    if(status)status.textContent='2/2 · 분석한 취향과 조건으로 추천지 계산 중…';

    const result=await api('/api/ai-search',{method:'POST',body:JSON.stringify({message:message.trim(),context:{...currentPayload(),distanceBand:state.activeDistanceBand}})});
    await new Promise(r=>setTimeout(r,520));

    showAI(result);
    const count=Array.isArray(result.items)?result.items.length:0;
    const keys=(result.analysisKeywords||[]).join(' · ');
    if(Array.isArray(result.items)){
      setText('#resultCaption',state.activeDistanceBand?`AI 분석 · 비슷한 거리 ${Math.round(state.activeDistanceBand.min)}~${Math.round(state.activeDistanceBand.max)}km · 추천지 ${count}곳`:keys?`AI 분석: ${keys} · ${state.minKm}~${state.targetKm}km · 추천지 ${count}곳`:`AI 추천지 ${count}곳`);
      setText('#mapStatus',`AI 분석 기반 후보 ${count}곳`);
      setStep(4);
      setTimeout(()=>document.querySelector('#step4')?.scrollIntoView({behavior:'smooth',block:'start'}),100);
    } else {
      $('#ranking').className='ranking empty-state';
      const needsMore=result.intent==='clarify'||result.intent==='off_topic';
      $('#ranking').innerHTML=needsMore
        ? '<div><strong>AI 분석 완료</strong><br><br>여행 조건을 조금 더 알려주면 추천 정확도가 올라갑니다.<br><small>예: “오늘 답답해서 60km 안에서 조용히 바람 쐬고 싶어”</small><br><br><button id="aiRefineBtn" class="btn primary" type="button">AI 검색 다시 입력</button></div>'
        : '<div><strong>AI 분석 완료</strong><br><br>현재 조건으로 추천 가능한 장소가 부족합니다.<br>거리나 상황을 조금 넓혀 다시 검색해보세요.<br><br><button id="aiRefineBtn" class="btn primary" type="button">검색 조건 다시 입력</button></div>';
      setText('#resultCaption',needsMore?'AI 분석 완료 · 조건 보완 필요':'AI 분석 완료 · 추천 조건 조정 필요');
      setText('#mapStatus','AI 분석 완료');
      setStep(4);
      setTimeout(()=>{
        const refine=$('#aiRefineBtn');
        if(refine)refine.onclick=()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),180)};
      },0);
    }

    btn.classList.add('ai-done');
    btn.textContent=count?`추천 완료 ✓ · ${count}곳`:'분석 완료 ✓';
    if(status){status.className='ai-search-status done';status.textContent=count?`완료 · AI 분석을 반영한 추천지 ${count}곳입니다.`:'완료 · 입력 내용을 분석했습니다.'}
    finishGauge(true);
    setTimeout(()=>{if(!state.aiBusy){btn.classList.remove('ai-done');btn.textContent='여행지 찾기'}},1800);
  }catch(e){
    btn.classList.add('ai-error');btn.textContent='검색 실패 · 다시 시도';
    if(status){status.className='ai-search-status error';status.textContent=e.message||'검색 중 문제가 생겼습니다.'}
    $('#ranking').className='ranking empty-state';
    $('#ranking').innerHTML=`<span class="error">${esc(e.message||'AI 추천을 진행하지 못했습니다.')}</span>`;
    setText('#resultCaption','AI 추천을 진행하려면 출발지 또는 위치 권한이 필요합니다.');
    finishGauge(false);showAI({mode:'local',message:e.message||'AI 요청을 처리하지 못했습니다.',analysisKeywords:[],choices:[{label:'출발지 설정하기',action:'goto',step:1},{label:'다시 입력하기',action:'focus'}]});
  }finally{
    state.aiBusy=false;btn.disabled=false;
  }
}
function similarDistanceBand(){
  const min=Math.max(0,Number(state.minKm||0)-20),max=Math.min(400,Number(state.targetKm||100)+20);
  return {min,max};
}
async function searchSimilarDistance(){
  const band=similarDistanceBand();
  state.activeDistanceBand=band;
  $('#noMatchActions').hidden=true;
  if(state.lastSearchMode==='ai'&&state.lastAIMessage){
    await askAI(state.lastAIMessage,{distanceBand:band});
  }else{
    await recommend({distanceBand:band});
  }
}
function handleAIChoice(c){if(!c)return;if(c.action==='search'){if(c.patch)applyPatch(c.patch);recommend(c.focusQuery?{focusQuery:c.focusQuery}:{})}else if(c.action==='goto'){setStep(c.step||2)}else if(c.action==='ai_prompt'){const m=c.message||'';$('#aiInput').value=m;askAI(m)}else if(c.action==='focus'){$('#aiInput').focus()}else if(c.action==='reset'){resetTrip()}}

function currentAISearchMessage(){
  const text=$('#aiInput')?.value.trim()||'';
  return text||'오늘 가기 좋은 여행지를 추천해줘';
}



function bindActions(){
  bindAppActions({state,startFromMainLocation,hideMainLanding,setStep,sortRecommendations,useLocation,searchOrigin,updateSchedulePreview,resetTrip,recommend,searchSimilarDistance,askAI,currentAISearchMessage});
}

function showSafeRuntimeError(){
  const ranking=$('#ranking');
  if(ranking){
    ranking.className='ranking empty-state';
    ranking.innerHTML='<div><strong>화면을 다시 불러오면 정상적으로 사용할 수 있습니다.</strong><br><br><button id="runtimeReloadBtn" class="btn primary" type="button">앱 새로고침</button></div>';
    const b=$('#runtimeReloadBtn');if(b)b.onclick=()=>location.reload();
  }
}
if(typeof window!=='undefined'){
  window.addEventListener('error',e=>{
    console.error('TRIP QUEST runtime error',e.error||e.message);
    if(state.step===4)showSafeRuntimeError();
  });
  window.addEventListener('unhandledrejection',e=>{
    console.error('TRIP QUEST async error',e.reason);
    if(state.step===4)showSafeRuntimeError();
  });
}
async function boot(){initTimes();initMap();validateUIRuntime();bindChoices();bindActions();initPWA();syncDistanceUI();syncDirectionUI();syncCategoriesUI();setStep(1);showMainLanding();try{await loadConfig()}catch{setText('#providerNow','설정 확인 필요')}setInterval(refreshLive,10*60*1000)}
globalThis.__TQ_TEST__={localAI,localRecommend,coursePack,approxRoute,normalizedDistanceRange,refineRoadDistanceResults,roadRoute,activeVehicleProfile,estimateRoundTripToll};
if(typeof document!=='undefined')boot();

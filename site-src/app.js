import { $, all, setText, loading, toast, esc } from './js/core/dom.js';
import { fmtWon, fmtMin, fmtKm } from './js/core/format.js';
import { stepMeta, categoryLabels } from './js/data/ui-options.js';
import { activeVehicleProfile } from './js/services/vehicle-settings.js';
import { estimateRoundTripToll } from './js/domain/trip-cost.js';
import { approxRoute, roadRoute } from './js/services/routing.js';
import { clientWeather, selectWeatherAt } from './js/services/weather.js';
import { localGeocode } from './js/services/geocoding.js';
import { placePopularity, normalizedDistanceRange, localRecommend } from './js/domain/recommendation.js';
import { refineRoadDistanceResults } from './js/usecases/search-destinations.js';
import { localAI } from './js/domain/intent-parser.js';
import { coursePack } from './js/domain/course-planner.js';
import { initMap, drawMap, drawRoute, focusMapPoint, invalidateMainMap } from './js/ui/main-map.js';
import { drawCourseRoute } from './js/ui/course-map.js';
const state={step:1,origin:null,minKm:0,targetKm:100,direction:'전체',categories:['관광지'],recommendations:[],selected:null,selectedCourse:null,selectedCourseData:null,config:null,aiBusy:false,installPrompt:null,sharedTrip:null,sharedPending:false,resultSort:'recommend',lastSearchMode:'ai',lastAIMessage:'',activeDistanceBand:null};



function sortRecommendations(mode=state.resultSort,rerender=true){
  state.resultSort=mode||'recommend';
  const cmp=state.resultSort==='far'
    ?(a,b)=>b.distanceKm-a.distanceKm
    :state.resultSort==='near'
      ?(a,b)=>a.distanceKm-b.distanceKm
      :(a,b)=>((placePopularity(b)*.55)+(b.score||0)*.45)-((placePopularity(a)*.55)+(a.score||0)*.45);
  state.recommendations.sort(cmp);
  all('.result-sort button').forEach(b=>b.classList.toggle('active',b.dataset.sort===state.resultSort));
  if(rerender){renderRanking();drawMap(state.origin,state.recommendations)}
}


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

function initTimes(){
  const now=new Date(); const d=new Date(now); d.setMinutes(Math.ceil(d.getMinutes()/30)*30,0,0); const ret=new Date(d); ret.setHours(ret.getHours()+8);
  const local=x=>{const z=new Date(x.getTime()-x.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)};
  $('#departTime').value=local(d); $('#returnTime').value=local(ret); updateSchedulePreview();
}
function updateSchedulePreview(){
  const dep=new Date($('#departTime').value),ret=new Date($('#returnTime').value);let html='';
  if(!Number.isNaN(dep.valueOf())&&!Number.isNaN(ret.valueOf())&&ret>dep){const mins=(ret-dep)/60000;html=`<span>사용 가능 ${fmtMin(mins)}</span><span>출발 ${dep.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span><span>귀가 ${ret.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}</span>`}
  $('#schedulePreview').innerHTML=html;
}

function naverPlaceSearchUrl(placeName,type){
  return `https://map.naver.com/p/search/${encodeURIComponent(`${placeName} ${type}`)}`;
}
function renderNearbyPlaceLinks(course,type='전체'){
  const el=$('#nearbyPlaces');if(!el)return;
  const stops=course?.stops||[];
  const showCafe=type==='전체'||type==='카페';
  const showFood=type==='전체'||type==='맛집';
  el.innerHTML=stops.map((s,i)=>`<article class="nearby-stop-card">
    <div class="nearby-stop-head"><span>${String(i+1).padStart(2,'0')}</span><div><b>${esc(s.name)}</b><small>이 지점 기준 4km 이내 우선 · 네이버 플레이스 검색</small></div></div>
    <div class="nearby-actions">
      ${showCafe?`<a class="nearby-link cafe" href="${naverPlaceSearchUrl(s.name,'카페')}" target="_blank" rel="noopener">☕ 주변 카페 보기</a>`:''}
      ${showFood?`<a class="nearby-link food" href="${naverPlaceSearchUrl(s.name,'맛집')}" target="_blank" rel="noopener">● 주변 음식점 보기</a>`:''}
    </div>
  </article>`).join('');
  el.hidden=false;
  el.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function renderCourseActionButtons(course){
  if(!course)return;
  let box=document.querySelector('#courseActionButtons');
  if(!box){
    box=document.createElement('div');
    box.id='courseActionButtons';
    box.className='course-action-buttons';
    const panel=document.querySelector('#courseDetailPanel');
    if(panel)panel.insertBefore(box,panel.firstChild);
  }
  box.innerHTML=`
    <button class="btn primary course-nearby-btn" data-type="카페">주변 카페 추천</button>
    <button class="btn primary course-nearby-btn" data-type="맛집">주변 음식점 추천</button>
    <button class="btn secondary course-nearby-btn" data-type="전체">카페 + 음식점 같이 보기</button>
  `;
  box.onclick=e=>{
    const b=e.target.closest('.course-nearby-btn');if(!b)return;
    const type=b.dataset.type;
    renderNearbyPlaceLinks(course,type);
    toast(type==='전체'?'주변 카페와 음식점을 표시했습니다.':type==='맛집'?'주변 음식점을 표시했습니다.':'주변 카페를 표시했습니다.');
  };
}
function showMainLanding(){
  const landing=$('#mainLanding');
  if(!landing)return;
  landing.hidden=false;
  document.body.classList.add('landing-open');
  setText('#mainLocationStatus','내 위치를 확인하면 여행 검색 화면으로 바로 이동합니다.');
  const btn=$('#mainLocateBtn');if(btn){btn.disabled=false;btn.classList.remove('done','error');btn.textContent='내 위치 검색하기'}
}
function hideMainLanding(){
  const landing=$('#mainLanding');if(!landing)return;
  landing.classList.add('leaving');
  setTimeout(()=>{landing.hidden=true;landing.classList.remove('leaving');document.body.classList.remove('landing-open')},260);
}
async function startFromMainLocation(){
  const btn=$('#mainLocateBtn'),status=$('#mainLocationStatus');
  if(!navigator.geolocation){
    btn?.classList.add('error');if(btn)btn.textContent='위치 기능을 사용할 수 없음';
    if(status)status.textContent='출발지를 직접 입력해주세요.';return;
  }
  if(btn){btn.disabled=true;btn.textContent='내 위치 찾는 중…';btn.classList.remove('done','error')}
  if(status)status.textContent='현재 위치 권한을 확인하고 있습니다…';
  navigator.geolocation.getCurrentPosition(async pos=>{
    try{
      await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});
      if(btn){btn.classList.add('done');btn.textContent='위치 확인 완료 ✓'}
      if(status)status.textContent='현재 위치를 찾았습니다. 여행 취향 검색 화면으로 이동합니다.';
      setTimeout(()=>{
        hideMainLanding();
        setStep(2);
        const manual=$('#manualOptions');if(manual)manual.hidden=true;
        const toggle=$('#manualToggle');if(toggle){toggle.setAttribute('aria-expanded','false');toggle.textContent='직접 선택으로 찾기 ↓'}
        setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},180);
      },520);
    }catch(e){
      if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='다시 시도'}
      if(status)status.textContent='위치를 설정하지 못했습니다. 다시 시도해주세요.';
    }
  },()=>{
    if(btn){btn.disabled=false;btn.classList.add('error');btn.textContent='위치 권한 다시 확인'}
    if(status)status.textContent='위치 권한이 꺼져 있습니다. 권한을 허용하거나 출발지를 직접 입력해주세요.';
  },{enableHighAccuracy:true,timeout:9000});
}
async function loadConfig(){
  state.config=await api('/api/config');$('#gasPrice').value=state.config.defaultGasPrice;const p=state.config.providers;
  setText('#providerNow','모바일 즉시실행');setText('#updatedAt','v0.51 · 코스 엔진·지도 모듈 분리 · 기존 기능 유지');
}
async function useLocation(goNext=false){
  if(!navigator.geolocation){toast('브라우저 위치 기능을 사용할 수 없습니다. 출발지를 검색해주세요.');return}
  $('#originLabel').textContent='현재 위치를 확인하고 있습니다…';
  navigator.geolocation.getCurrentPosition(async pos=>{await setOrigin({lat:pos.coords.latitude,lng:pos.coords.longitude,name:'현재 위치'});toast('현재 위치를 설정했습니다.');if(goNext)setStep(2)},()=>{setText('#originLabel','위치 권한이 꺼져 있습니다. 출발지를 직접 검색하세요.');toast('위치 권한을 허용하거나 출발지를 검색해주세요.')},{enableHighAccuracy:true,timeout:8000});
}
async function setOrigin(o){state.origin=o;setText('#originLabel',`${o.name||'출발지'} · ${Number(o.lat).toFixed(5)}, ${Number(o.lng).toFixed(5)}`);focusMapPoint(o,10);drawMap(state.origin,state.recommendations);await refreshLive();if(state.sharedPending&&state.sharedTrip){state.sharedPending=false;setTimeout(()=>recommend({focusQuery:state.sharedTrip.destination.name}),120)}}
async function refreshLive(){if(!state.origin)return;try{const b=await api(`/api/bootstrap?lat=${state.origin.lat}&lng=${state.origin.lng}`);const w=b.weather.current;if(w.source==='fallback'){setText('#weatherNow','날씨 확인 필요');setText('#weatherMeta','날씨 API 연결 대기')}else{setText('#weatherNow',`${w.condition} ${Math.round(w.temperature_2m)}°`);setText('#weatherMeta',`체감 ${Math.round(w.apparent_temperature)}° · 바람 ${Math.round(w.wind_speed_10m)}km/h`)}setText('#trafficNow',b.traffic.label);setText('#trafficMeta',b.traffic.source);setText('#updatedAt',new Date(b.updatedAt).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 갱신')}catch{setText('#weatherNow','업데이트 실패');setText('#trafficNow','업데이트 실패')}}

function setStep(n){
  n=Math.max(1,Math.min(5,n));state.step=n;document.body.dataset.tripStep=String(n);if(n!==2){document.body.classList.remove('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.remove('open');bar.setAttribute('aria-expanded','false')}}all('.step-view').forEach(x=>x.classList.toggle('active',Number(x.dataset.stepView)===n));
  all('.progress-step').forEach(x=>{const s=Number(x.dataset.step);x.classList.toggle('active',s===n);x.classList.toggle('done',s<n)});
  const m=stepMeta[n];setText('#stepEyebrow',m[0]);setText('#stepTitle',m[1]);setText('#stepDescription',m[2]);
  $('#backBtn').disabled=n===1;let label='다음 →',disabled=false,hint='';
  if(n===1){label='위치 확인하고 다음 →';disabled=false;hint=state.origin?'출발지 설정 완료':'현재 위치 또는 출발지를 설정하세요.'}
  if(n===2){label='시간 설정으로 →';disabled=state.categories.length===0;hint=`${state.minKm}~${state.targetKm}km · ${state.direction==='전체'?'방향 상관없음':state.direction} · 취향 ${state.categories.length}개`}
  if(n===3){label='추천지 찾기 →';hint='날씨·교통·거리 조건을 함께 계산합니다.'}
  if(n===4){label=state.selected?'선택 여행지 코스 보기 →':'추천지에서 하나를 선택하세요';disabled=!state.selected;hint=state.selected?`${state.selected.name} 선택됨`:'각 카드의 “이 여행지 선택” 버튼을 누르세요.'}
  if(n===5){label='새 여행 시작';hint=state.selectedCourse?`${state.selectedCourse}코스를 선택했습니다.`:'A 도보 근거리 / B 드라이브 중 선택할 수 있습니다.'}
  $('#nextBtn').textContent=label;$('#nextBtn').disabled=disabled;setText('#actionHint',hint);const simpleSearch=n===2&&!document.body.classList.contains('tq-advanced-open');const target=simpleSearch?$('.ai-hero'):$('.wizard');if(target)window.scrollTo({top:Math.max(0,target.offsetTop-18),behavior:'smooth'});if(n===4)setTimeout(invalidateMainMap,120)
}
function resetTrip(){document.body.classList.remove('tq-advanced-open');const manualBar=$('#openAdvancedSearch');if(manualBar){manualBar.setAttribute('aria-expanded','false');manualBar.classList.remove('open')}state.minKm=0;state.targetKm=100;state.resultSort='recommend';state.activeDistanceBand=null;state.lastSearchMode='ai';state.lastAIMessage='';state.direction='전체';state.categories=['관광지'];state.recommendations=[];state.selected=null;state.selectedCourse=null;state.selectedCourseData=null;state.sharedPending=false;syncDistanceUI();all('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value==='전체'));syncCategoriesUI();$('#ranking').innerHTML='조건을 설정한 뒤 추천지를 찾아보세요.';$('#ranking').className='ranking empty-state';initTimes();setStep(1);showMainLanding();toast('새 여행을 시작합니다.')}

let lastDistanceHaptic={min:state.minKm,max:state.targetKm};
function syncDistanceUI(){
  const r=normalizedDistanceRange({minKm:state.minKm,targetKm:state.targetKm});
  state.minKm=r.min;state.targetKm=r.max;
  setText('#distanceMinValue',r.min);setText('#distanceMaxValue',r.max);
  setText('#distanceHint',`내 위치 기준 ${r.min}~${r.max}km`);
  const minRange=$('#distanceMinRange'),maxRange=$('#distanceMaxRange'),fill=$('#distanceRangeFill');
  if(minRange)minRange.value=r.min;if(maxRange)maxRange.value=r.max;
  if(fill){fill.style.left=(r.min/400*100)+'%';fill.style.right=(100-r.max/400*100)+'%'}
}
function setDistanceBoundary(which,value,haptic=true){
  const v=Math.max(0,Math.min(400,Math.round(Number(value)/10)*10));
  if(which==='min')state.minKm=Math.min(v,state.targetKm-10);
  else state.targetKm=Math.max(v,state.minKm+10);
  const r=normalizedDistanceRange({minKm:state.minKm,targetKm:state.targetKm});
  state.minKm=r.min;state.targetKm=r.max;state.activeDistanceBand=null;syncDistanceUI();
  if(haptic&&r[which]!==lastDistanceHaptic[which]){
    lastDistanceHaptic={min:r.min,max:r.max};
    try{if(navigator.vibrate)navigator.vibrate(8)}catch{}
  }
}
function syncCategoriesUI(){
  all('#categoryChoices button').forEach(b=>b.classList.toggle('selected',state.categories.includes(b.dataset.value)));
  setText('#categoryCount',`${state.categories.length}개 선택`);
}
function syncDirectionUI(){
  all('#directionChoices button').forEach(b=>b.classList.toggle('selected',b.dataset.value===state.direction));
  setText('#directionValue',state.direction==='전체'?'상관없음':state.direction);
}
function validateUIRuntime(){
  const required=[
    ['categoryChoices','#categoryChoices'],
    ['directionChoices','#directionChoices'],
    ['ranking','#ranking'],
    ['resultSort','#resultSort']
  ];
  const missing=required.filter(([,sel])=>!$(sel)).map(([name])=>name);
  if(missing.length)throw new Error('UI 구성요소 누락: '+missing.join(', '));
  if(typeof all!=='function')throw new Error('다중 요소 선택 기능을 초기화하지 못했습니다.');
  return true;
}
function bindChoices(){
  const distanceMin=$('#distanceMinRange'),distanceMax=$('#distanceMaxRange');if(distanceMin)distanceMin.addEventListener('input',e=>setDistanceBoundary('min',e.target.value,true));if(distanceMax)distanceMax.addEventListener('input',e=>setDistanceBoundary('max',e.target.value,true));
  $('#directionChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;state.direction=b.dataset.value;syncDirectionUI()});
  $('#categoryChoices').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;b.classList.toggle('selected');state.categories=all('#categoryChoices button.selected').map(x=>x.dataset.value);syncCategoriesUI();setStep(2)});
}
async function searchOrigin(){const q=$('#originSearch').value.trim();if(!q)return;$('#originResults').innerHTML='<div class="empty-state">출발지를 찾고 있습니다…</div>';try{const j=await api(`/api/geocode?q=${encodeURIComponent(q)}`);if(!j.items.length){$('#originResults').innerHTML='<div class="error">검색 결과가 없습니다.</div>';return}$('#originResults').innerHTML=j.items.map((x,i)=>`<button data-i="${i}"><span><b>${esc(x.name)}</b><br><small>${esc(x.address||'')}</small></span><span>선택 →</span></button>`).join('');$('#originResults').onclick=async e=>{const b=e.target.closest('button');if(!b)return;const x=j.items[Number(b.dataset.i)];await setOrigin({...x,name:x.name});$('#originResults').innerHTML='';$('#originSearch').value='';toast('출발지를 설정했습니다.');setStep(2);const manual=$('#manualOptions');if(manual)manual.hidden=true;setTimeout(()=>{document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});$('#aiInput')?.focus()},160)};}catch(e){$('#originResults').innerHTML=`<span class="error">${esc(e.message)}</span>`}}

function currentPayload(){return {origin:state.origin,minKm:state.minKm,targetKm:state.targetKm,direction:state.direction,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value,gasPrice:Number($('#gasPrice').value||1700)}}
async function recommend(extra={}){state.lastSearchMode='manual';state.activeDistanceBand=extra.distanceBand||null;if(!state.origin){toast('출발지를 먼저 설정하세요.');setStep(1);return}loading(true);setStep(4);$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='여행 후보를 계산하고 있습니다…';$('#noMatchActions').hidden=true;try{const j=await api('/api/recommend',{method:'POST',body:JSON.stringify({...currentPayload(),...extra,distanceBand:state.activeDistanceBand})});state.recommendations=j.items||[];state.selected=null;sortRecommendations('recommend',false);renderRanking();drawMap(state.origin,state.recommendations);setText('#resultCaption',state.activeDistanceBand?`비슷한 거리 ${Math.round(state.activeDistanceBand.min)}~${Math.round(state.activeDistanceBand.max)}km · ${state.direction==='전체'?'전체 방향':state.direction}`:`${state.minKm}~${state.targetKm}km · ${state.direction==='전체'?'전체 방향':state.direction} · ${state.categories.join(' · ')||'전체 취향'}`);setText('#mapStatus',`후보 ${state.recommendations.length}곳 · ${j.source||'데이터 검색'}`)}catch(e){$('#ranking').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);setStep(4)}}
function renderRanking(){
  if(!state.recommendations.length){$('#ranking').className='ranking empty-state';$('#ranking').innerHTML='선택한 거리와 조건에 맞는 장소를 찾지 못했습니다.<br>비슷한 거리 범위에서 다시 찾아볼 수 있습니다.';$('#noMatchActions').hidden=false;return}
  $('#ranking').className='ranking';$('#noMatchActions').hidden=true;
  $('#ranking').innerHTML=state.recommendations.map((p,i)=>{const free=p.availableMin!=null?Math.round(p.availableMin-p.roundTripDriveMin):null;const reason=p.aiReason||[Math.abs(p.distanceKm-state.targetKm)<state.targetKm*.25?'원하는 거리와 가까움':'거리 조건 범위',p.feasible===false?'귀가시간이 빠듯함':free!=null?`귀가 전 여유 약 ${fmtMin(Math.max(0,free))}`:'이동시간 확인',p.category||'여행지'].join(' · ');return `<article class="rank-card" data-i="${i}"><div class="rank-number">${String(i+1).padStart(2,'0')}</div><div><h3>${esc(p.name)}</h3><div class="rank-tags"><span class="tag good">적합도 ${Math.round(p.score)}</span><span class="tag">${esc(p.category||'장소')}</span>${p.feasible===false?'<span class="tag warn">시간 빠듯</span>':''}</div><div class="rank-meta"><span>${p.roadVerified?'도로':'예상 도로'} ${p.distanceKm.toFixed(1)}km</span>${Number.isFinite(p.geoDistanceKm)?`<span>직선 ${p.geoDistanceKm.toFixed(1)}km</span>`:''}${p.routePreview?`<span>편도 ${fmtMin(p.routePreview.timeMin)}</span>`:''}</div><div class="rank-reason">${esc(reason)}</div></div><div class="rank-actions"><button class="btn primary select-place">이 여행지 선택</button>${p.url?`<button class="btn secondary open-place">장소 정보</button>`:'<button class="btn secondary map-focus">지도에서 보기</button>'}</div></article>`}).join('');
  $('#ranking').onclick=e=>{const card=e.target.closest('.rank-card');if(!card)return;const i=Number(card.dataset.i);if(e.target.closest('.select-place'))selectPlace(i,true);else if(e.target.closest('.open-place'))window.open(state.recommendations[i].url,'_blank','noopener');else{const p=state.recommendations[i];focusMapPoint(p,13)}};
}
async function selectPlace(i,goCourse=false){
  state.selected=state.recommendations[i];setText('#selectedPlaceName',state.selected.name);setText('#selectedPlaceMeta',`${state.selected.category||'여행지'} · ${state.selected.address||'주소 정보 없음'}`);$('#tripSummary').className='summary-box empty-state';$('#tripSummary').innerHTML='왕복 경로와 비용을 계산하고 있습니다…';$('#courseList').className='course-list empty-state';$('#courseList').innerHTML='목적지 날씨와 주변 장소를 분석해 코스를 만들고 있습니다…';$('#nextBtn').disabled=false;loading(true);if(goCourse)setStep(5);
  const base={origin:state.origin,destination:state.selected,gasPrice:Number($('#gasPrice').value||1700)};
  try{const [sum,c]=await Promise.all([api('/api/trip-summary',{method:'POST',body:JSON.stringify(base)}),api('/api/courses',{method:'POST',body:JSON.stringify({...base,categories:state.categories,departure:$('#departTime').value,returnTime:$('#returnTime').value})})]);renderSummary(sum);renderCourses(c);drawRoute(sum.outbound.coords);setText('#mapStatus',`${state.selected.name} · 왕복 ${sum.total.distanceKm.toFixed(1)}km`)}catch(e){$('#tripSummary').innerHTML=`<span class="error">${esc(e.message)}</span>`;$('#courseList').innerHTML=`<span class="error">${esc(e.message)}</span>`}finally{loading(false);if(goCourse)setStep(5)}
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
  const openAdvanced=$('#openAdvancedSearch');
  if(openAdvanced)openAdvanced.onclick=()=>{
    const opening=!document.body.classList.contains('tq-advanced-open')||state.step!==2;
    if(opening){
      document.body.classList.add('tq-advanced-open');
      openAdvanced.classList.add('open');
      openAdvanced.setAttribute('aria-expanded','true');
      setStep(2);
      const box=$('#manualOptions'),toggle=$('#manualToggle');
      if(box)box.hidden=false;
      if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='직접 선택 접기 ↑'}
      setTimeout(()=>$('.wizard')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }else{
      document.body.classList.remove('tq-advanced-open');
      openAdvanced.classList.remove('open');
      openAdvanced.setAttribute('aria-expanded','false');
      setTimeout(()=>$('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
    }
  };
  const mainLocate=$('#mainLocateBtn');if(mainLocate)mainLocate.onclick=startFromMainLocation;
  const mainManual=$('#mainManualBtn');if(mainManual)mainManual.onclick=()=>{hideMainLanding();setStep(1);setTimeout(()=>$('#originSearch')?.focus(),320)};
  const manualToggle=$('#manualToggle');if(manualToggle)manualToggle.onclick=()=>{const box=$('#manualOptions');if(!box)return;box.hidden=!box.hidden;manualToggle.setAttribute('aria-expanded',String(!box.hidden));manualToggle.textContent=box.hidden?'직접 선택으로 찾기 ↓':'직접 선택 접기 ↑';if(!box.hidden)setTimeout(()=>box.scrollIntoView({behavior:'smooth',block:'nearest'}),80)};
  const resultSort=$('#resultSort');if(resultSort)resultSort.onclick=e=>{const b=e.target.closest('button[data-sort]');if(!b)return;sortRecommendations(b.dataset.sort,true)};
  $('#locateBtn').onclick=()=>useLocation(false);$('#searchOriginBtn').onclick=searchOrigin;$('#originSearch').addEventListener('keydown',e=>{if(e.key==='Enter')searchOrigin()});
  $('#departTime').addEventListener('change',updateSchedulePreview);$('#returnTime').addEventListener('change',updateSchedulePreview);$('#resetBtn').onclick=resetTrip;$('.brand').onclick=e=>{e.preventDefault();resetTrip()};
  $('#backBtn').onclick=()=>{const target=state.step-1;if(target===2){document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}}setStep(target)};$('#nextBtn').onclick=async()=>{if(state.step===1){document.body.classList.add('tq-advanced-open');if(state.origin)setStep(2);else await useLocation(true)}else if(state.step===2)setStep(3);else if(state.step===3)await recommend();else if(state.step===4){if(state.selected)setStep(5)}else resetTrip()};
  all('.progress-step').forEach(b=>b.onclick=()=>{const n=Number(b.dataset.step);if(n<=state.step||n<=3){if(n===2){document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}}setStep(n)}});$('#editConditionsBtn').onclick=()=>{document.body.classList.add('tq-advanced-open');const bar=$('#openAdvancedSearch');if(bar){bar.classList.add('open');bar.setAttribute('aria-expanded','true')}setStep(2);const box=$('#manualOptions'),toggle=$('#manualToggle');if(box)box.hidden=false;if(toggle){toggle.setAttribute('aria-expanded','true');toggle.textContent='직접 선택 접기 ↑'}};$('#changePlaceBtn').onclick=()=>setStep(4);
  $('#noMatchActions').onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.noMatch==='similar')searchSimilarDistance();else if(b.dataset.noMatch==='refine'){document.querySelector('.ai-hero')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>$('#aiInput')?.focus(),180)}};
  $('#aiSend').onclick=()=>askAI(currentAISearchMessage());$('#aiInput').addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter')askAI(currentAISearchMessage())});
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

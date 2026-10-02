import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=new URL('../site-src/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

const html=read('index.html');
const sw=read('sw.js');
const app=read('app.js');
const chromeJs=read('app-chrome.js');
const baseCss=read('css/base.css');
const productCss=read('css/product.css');
const landingCss=read('css/landing.css');
const searchCss=read('css/search.css');
const chromeCss=productCss+landingCss+searchCss;
const moduleFiles=['js/core/dom.js','js/core/format.js','js/data/places.js','js/data/recommendation-data.js','js/data/course-data.js','js/data/ui-options.js','js/domain/geo.js','js/domain/schedule.js','js/domain/trip-cost.js','js/services/vehicle-settings.js','js/services/routing.js','js/services/weather.js','js/services/geocoding.js','js/data/intent-rules.js','js/domain/recommendation.js','js/domain/intent-parser.js','js/usecases/search-destinations.js','js/domain/course-planner.js','js/ui/main-map.js','js/ui/course-map.js','js/ui/time-controls.js','js/ui/course-actions.js','js/ui/landing.js','js/ui/wizard.js','js/ui/results.js','js/controllers/search-controller.js','js/controllers/origin-controller.js','js/controllers/app-controller.js','js/store/trip-store.js','js/services/travel-service.js','js/services/keep-service.js','js/ui/keep-panel.js'];
for(const file of moduleFiles)assert.ok(fs.existsSync(new URL(file,root)),'missing extracted module: '+file);
assert.ok(app.includes("from './js/core/dom.js'"),'app.js must use core DOM module');
const recommendationModule=read('js/domain/recommendation.js');
const coursePlannerModule=read('js/domain/course-planner.js');
assert.ok(recommendationModule.includes("from '../data/places.js'"),'recommendation module must use places data module');
assert.ok(recommendationModule.includes("from './geo.js'"),'recommendation module must use geo domain module');
assert.ok(coursePlannerModule.includes("from '../data/places.js'"),'course planner must use places data module');
assert.ok(!app.includes('const RAW_PLACES='),'place dataset must be outside app.js');
assert.ok(!app.includes('function geoKm('),'geo calculations must be outside app.js');
assert.ok(!app.includes('function roadRoute('),'routing service must be outside app.js');
assert.ok(!app.includes('function clientWeather('),'weather service must be outside app.js');
assert.ok(!app.includes('function localGeocode('),'geocoding service must be outside app.js');
assert.ok(!app.includes('function activeVehicleProfile('),'vehicle settings must be outside app.js');
assert.ok(!app.includes('function estimateRoundTripToll('),'trip cost logic must be outside app.js');
assert.ok(!app.includes('function localRecommend('),'recommendation engine must be outside app.js');
assert.ok(!app.includes('function refineRoadDistanceResults('),'road-distance verification must be outside app.js');
assert.ok(!app.includes('function localAI('),'intent parser must be outside app.js');
assert.ok(!app.includes('function coursePack('),'course planner must be outside app.js');
assert.ok(!app.includes('function initMap('),'main map implementation must be outside app.js');
assert.ok(!app.includes('function drawCourseRoute('),'course map implementation must be outside app.js');
assert.ok(!app.includes('state.map'),'Leaflet state must not live in app state');
assert.ok(!app.includes('state.courseMap'),'course-map Leaflet state must not live in app state');

assert.equal((html.match(/\\n/g)||[]).length,0,'index.html must not contain literal \\n text');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'HTML ids must be unique');
for(const id of ['mainLanding','mainLocateBtn','mainManualBtn','aiInput','aiSend','advancedDistanceControl','distanceMinRange','distanceMaxRange','openAdvancedSearch','originSearch','ranking','map','courseList','courseMap','toast']){
  assert.ok(ids.includes(id),'required UI id missing: '+id);
}

function q(file,name){
  const safe=name.replaceAll('.','\\.');
  const m=file.match(new RegExp(safe+"\\?v=([^\"']+)"));
  return m?.[1]||'';
}
for(const asset of ['css/base.css','css/product.css','css/landing.css','css/search.css','app.js','app-chrome.js']){
  const hv=q(html,asset),sv=q(sw,asset);
  assert.ok(hv,'missing versioned HTML ref: '+asset);
  assert.equal(sv,hv,'service worker version mismatch: '+asset);
}

for(const m of html.matchAll(/(?:src|href)="\.\/assets\/([^"?]+)(?:\?[^"]*)?"/g)){
  const p=path.join(new URL('.',root).pathname,'assets',m[1]);
  assert.ok(fs.existsSync(p),'missing referenced asset: assets/'+m[1]);
}

assert.ok(landingCss.includes('Landing press lifecycle'),'landing touch lifecycle CSS missing');
assert.ok(searchCss.includes('Search page hierarchy'),'simplified search CSS missing');
assert.ok(searchCss.includes('Distance range and manual-input drawer'),'distance/drawer CSS missing');
assert.ok(landingCss.includes('background-image:url("../assets/tq-cover-main-v044.webp")'),'landing stylesheet must resolve cover relative to /css');
assert.ok(html.includes('id="mainLanding" class="main-landing tq-photo-ready"'),'landing must start photo-ready to prevent fallback flash');
assert.ok(!chromeJs.includes("landing.classList.remove('tq-photo-ready','tq-photo-error')"),'cover probe must not clear photo-ready before load');
assert.ok(!chromeCss.includes('opacity:.001!important'),'transparent image-button hit areas must be removed');
assert.ok(!chromeJs.includes('function bindLandingFallback'),'legacy landing coordinate fallback must be removed');
assert.ok(chromeJs.includes("probe.src='./assets/tq-cover-main-v044.webp'"),'landing preload must use v0.43 cover');
assert.ok(chromeJs.includes('function bindLandingPressFeedback'),'pressed feedback binding missing');
assert.ok(chromeCss.includes('#mainLocateBtn.is-pressed'),'primary pressed state missing');
assert.ok(chromeCss.includes('#mainManualBtn.is-pressed'),'secondary pressed state missing');
assert.ok(chromeCss.includes('#mainLocateBtn.is-held'),'primary hold state missing');
assert.ok(chromeCss.includes('#mainManualBtn.is-held'),'secondary hold state missing');
assert.ok(chromeCss.includes('#mainLocateBtn.is-releasing'),'release rebound state missing');
assert.ok(chromeCss.includes('@keyframes tqLandingButtonRelease'),'release keyframes missing');
assert.ok(chromeJs.includes("btn.dataset.pressState='start'"),'touch start state marker missing');
assert.ok(chromeJs.includes("btn.dataset.pressState='hold'"),'touch hold state marker missing');
assert.ok(chromeJs.includes("btn.dataset.pressState='release'"),'touch release state marker missing');
assert.ok(chromeJs.includes('setPointerCapture'),'pointer capture required for stable touch hold');
assert.ok(chromeJs.includes('suppressClick'),'dragged-out taps must suppress accidental click');
assert.ok(!chromeCss.includes('#mainLocateBtn:disabled{\n  cursor:wait!important;\n  opacity:.88!important;\n  transform:none!important;'),'disabled state must not cancel release rebound');
assert.ok(!chromeJs.includes('tq-cover-action-head'),'extra landing action header must not be injected');
assert.ok(chromeJs.includes("fetch('./fuel-prices.json'"),'runtime fuel-price refresh missing');
const vehicleService=read('js/services/vehicle-settings.js');
const tripCost=read('js/domain/trip-cost.js');
assert.ok(vehicleService.includes('function activeVehicleProfile'),'vehicle profile calculation missing');
assert.ok(tripCost.includes('function estimateRoundTripToll'),'toll estimation missing');
const travelServiceSource=read('js/services/travel-service.js');
const tripStoreSource=read('js/store/trip-store.js');
const searchControllerSource=read('js/controllers/search-controller.js');
assert.ok(travelServiceSource.includes("costLabel:vehicle.fuel==='electric'?'충전비':'연료비'"),'energy cost labels missing');
assert.ok(!app.includes('async function api('),'internal fake API router must be removed');
assert.ok(app.includes('createTravelService()'),'travel service facade must be composed in app.js');
assert.ok(!app.includes('const state={'),'flat global state declaration must be removed');
assert.ok(app.includes('createTripStore()'),'trip store must be composed in app.js');
assert.ok(tripStoreSource.includes('const INITIAL_SECTIONS='),'store must own structured state sections');
assert.ok(tripStoreSource.includes('function resetJourney()'),'store reset lifecycle missing');
assert.ok(searchControllerSource.includes('travelService.recommend('),'search controller must use named travel service');
assert.ok(!searchControllerSource.includes("api('/api/"),'search controller must not route through fake API paths');
const boot=(chromeJs.match(/function bootChrome\(\)\{([^}]*)\}/)||[])[1]||'';
assert.ok(!boot.includes('observeTripSummary()'),'legacy DOM toll patch must not run');

assert.ok(html.includes('오늘 어디로 떠날까요?'),'simplified search title missing');
assert.ok(html.includes('현재 위치에서 취향에 맞는 여행지를 빠르게 찾아드려요.'),'simplified search subtitle missing');
const wizardSource=read('js/ui/wizard.js');
const appControllerSource=read('js/controllers/app-controller.js');
const resultsSource=read('js/ui/results.js');
assert.ok(wizardSource.includes('document.body.dataset.tripStep=String(n)'),'step-aware simple search visibility missing');
assert.ok(!html.includes('quickDistanceChoices'),'quick distance buttons must be removed');
assert.ok(!html.includes('quickThemeChoices'),'quick mood buttons must be removed');
assert.ok(!html.includes('SEARCH RANGE'),'SEARCH RANGE shortcut label must be removed');
assert.ok(!html.includes('QUICK MOOD'),'quick mood section must be removed');
assert.ok(!html.includes('id="distanceAdvancedToggle"'),'distance slider must no longer be hidden behind a toggle');
assert.ok(html.includes('class="ai-distance-control tq-distance-primary"'),'drag distance control must be visible in main search page');
assert.ok(html.includes('class="tq-manual-input-bar"'),'bottom manual-input bar missing');
assert.ok(appControllerSource.includes("const openAdvanced=$('#openAdvancedSearch')"),'manual drawer binding missing');
assert.ok(appControllerSource.includes("openAdvanced.classList.add('open')"),'manual drawer open state missing');
assert.ok(appControllerSource.includes("openAdvanced.classList.remove('open')"),'manual drawer close state missing');
assert.ok(wizardSource.includes("if(n!==2){document.body.classList.remove('tq-advanced-open')"),'manual drawer must collapse when leaving step two');
assert.ok(!app.includes('function renderRanking('),'results rendering must be outside app.js');
assert.ok(!app.includes('async function selectPlace('),'search selection controller must be outside app.js');
assert.ok(!app.includes('async function searchOrigin('),'origin controller must be outside app.js');
assert.ok(!app.includes("const openAdvanced=$('#openAdvancedSearch')"),'event implementation must be outside app.js');
assert.ok(resultsSource.includes('function renderCourses('),'course result rendering module missing');
assert.ok(searchControllerSource.includes('function sortRecommendations('),'search controller sorting missing');
assert.ok(chromeCss.includes('body[data-trip-step="2"]:not(.tq-advanced-open) .wizard'),'simple search must hide advanced wizard at step two');
console.log('TRIP QUEST v1.3.0 UI/runtime smoke tests passed');

const mainMapSource=read('js/ui/main-map.js');
const courseMapSource=read('js/ui/course-map.js');
const originControllerSource=read('js/controllers/origin-controller.js');
assert.ok(mainMapSource.includes('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),'current OSM tile endpoint required');
assert.ok(mainMapSource.includes('openstreetmap.org/copyright'),'OSM attribution link required');
assert.ok(courseMapSource.includes('openstreetmap.org/copyright'),'course map OSM attribution link required');
assert.ok(originControllerSource.includes('OpenStreetMap / Nominatim'),'geocoder attribution required');
assert.ok(originControllerSource.includes('Open-Meteo'),'weather attribution required');
assert.ok(resultsSource.includes('OSRM 도로 경로'),'routing provider disclosure required');

assert.ok(html.includes('TRIP QUEST · v1.3.0'),'v1.0.0 footer/version marker missing');
assert.ok(chromeJs.includes("footer.textContent='TRIP QUEST · v1.3.0'"),'chrome footer version missing');

const keepServiceSource=read('js/services/keep-service.js');
const keepPanelSource=read('js/ui/keep-panel.js');
assert.ok(resultsSource.includes('course-keep-toggle'),'course cards must expose KEEP star toggles');
assert.ok(resultsSource.includes('keepService.toggle('),'course KEEP star must toggle persistence');
assert.ok(keepServiceSource.includes("const KEEP_KEY='tq_keep_courses_v1'"),'KEEP storage key missing');
assert.ok(keepServiceSource.includes("window.dispatchEvent(new CustomEvent('tripquest:keep-change'"),'KEEP change event missing');
assert.ok(keepPanelSource.includes("tripquest:open-keep"),'bottom KEEP panel open event missing');
assert.ok(keepPanelSource.includes('tq-keep-detail'),'KEEP detail view missing');
assert.ok(keepPanelSource.includes('data-remove-id'),'KEEP detail removal missing');
assert.ok(chromeJs.includes('data-tab="keep"'),'bottom KEEP tab missing');
assert.ok(chromeJs.includes('tq-keep-badge'),'KEEP badge missing');
assert.ok(!chromeJs.includes('data-tab="home"'),'legacy bottom home tab must be removed');
assert.ok(!chromeJs.includes('data-tab="plan"'),'legacy bottom plan tab must be removed');

assert.ok(app.includes('function applyPatch(patch={})'),'AI patch application function must exist');
assert.ok(app.includes("if(result.patch)applyPatch(result.patch)"),'AI result patch must be applied safely');
assert.ok(keepPanelSource.includes('← KEEP 목록'),'KEEP detail list return must be clearly labeled');
assert.ok(keepPanelSource.includes('코스 바로가기 →'),'KEEP detail course shortcut missing');
assert.ok(keepPanelSource.includes('DESTINATION'),'KEEP destination context block missing');
assert.ok(keepPanelSource.includes("stops.length<=1?'단일 장소'"),'single-stop KEEP course must not display misleading zero distance');

assert.ok(!app.includes('drawMap('),'app.js must not directly call map rendering after controller split');
assert.ok(searchControllerSource.includes('function presentRecommendations('),'search controller recommendation presenter missing');
assert.ok(searchControllerSource.includes('function openKeptCourse('),'saved-course reopen controller missing');
assert.ok(resultsSource.includes('function renderSavedCourse('),'saved-course Step 5 renderer missing');
assert.ok(keepPanelSource.includes('data-open-course-id'),'KEEP course shortcut target missing');
assert.ok(keepPanelSource.includes('onOpenCourse(id,item)'),'KEEP course shortcut callback missing');
assert.ok(app.includes('initKeepPanel({onOpenCourse:openKeptCourse})'),'KEEP panel must be wired to in-app course page');

const myPageSource=read('js/ui/my-page.js');
const profileSource=read('js/services/profile-service.js');
const attendanceSource=read('js/services/attendance-service.js');
const historySource=read('js/services/history-service.js');
assert.ok(chromeJs.includes('data-tab="my"'),'MY bottom tab missing');
assert.ok(!chromeJs.includes('data-tab="settings"'),'settings must move inside MY page');
assert.ok(myPageSource.includes('MY PAGE'),'MY page heading missing');
assert.ok(myPageSource.includes('임시 여행자 ID'),'temporary traveler ID disclosure missing');
assert.ok(myPageSource.includes('type="file" accept="image/*"'),'profile image picker missing');
assert.ok(myPageSource.includes('출석 캘린더'),'attendance card missing');
assert.ok(myPageSource.includes('내가 다녀온 곳'),'travel history section missing');
assert.ok(myPageSource.includes("tripquest:open-vehicle-settings"),'vehicle settings must be nested inside MY');
assert.ok(profileSource.includes("indexedDB.open(AVATAR_DB,1)"),'profile avatar must use IndexedDB');
assert.ok(attendanceSource.includes("const ATTENDANCE_KEY='tq_attendance_v1'"),'attendance persistence missing');
assert.ok(historySource.includes("const HISTORY_KEY='tq_travel_history_v1'"),'travel-history persistence missing');
assert.ok(resultsSource.includes('id=\'tripCompletionCard\'')||resultsSource.includes("card.id='tripCompletionCard'"),'travel completion card missing');
assert.ok(resultsSource.includes("historyService.complete(state.selected||{},course)"),'travel completion action missing');
assert.ok(app.includes('initMyPage({onOpenHistoryCourse:openHistoryCourse})'),'MY page must initialize with history course handler');

const userDataSource=read('js/services/user-data-service.js');
assert.ok(myPageSource.includes('출석 캘린더'),'attendance calendar UI missing');
assert.ok(myPageSource.includes('최장'),'longest attendance streak missing');
assert.ok(myPageSource.includes('코스 다시보기 →'),'travel-history course reopen missing');
assert.ok(myPageSource.includes('기록 삭제'),'travel-history delete action missing');
assert.ok(myPageSource.includes('백업 파일 만들기'),'user-data backup UI missing');
assert.ok(myPageSource.includes('백업 불러오기'),'user-data restore UI missing');
assert.ok(myPageSource.includes('모든 로컬 데이터 초기화'),'user-data reset UI missing');
assert.ok(profileSource.includes('compressProfileAvatar'),'profile image compression missing');
assert.ok(profileSource.includes('canvas.toBlob'),'compressed avatar blob generation missing');
assert.ok(attendanceSource.includes('function longestStreak()'),'attendance longest streak missing');
assert.ok(attendanceSource.includes('function monthCalendar('),'attendance calendar service missing');
assert.ok(historySource.includes('function remove(id)'),'history delete service missing');
assert.ok(historySource.includes('function stats('),'history stats service missing');
assert.ok(searchControllerSource.includes('function openHistoryCourse('),'history course reopen controller missing');
assert.ok(app.includes('initMyPage({onOpenHistoryCourse:openHistoryCourse})'),'MY history reopen wiring missing');
assert.ok(userDataSource.includes("const BACKUP_FORMAT='trip-quest-user-backup'"),'backup format marker missing');
assert.ok(userDataSource.includes('exportUserData'),'user-data export missing');
assert.ok(userDataSource.includes('importUserData'),'user-data import missing');

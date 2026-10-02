import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=new URL('../site-src/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

const html=read('index.html');
const sw=read('sw.js');
const app=read('app.js');
const chromeJs=read('app-chrome.js');
const chromeCss=read('app-chrome.css');
const moduleFiles=['js/core/dom.js','js/core/format.js','js/data/places.js','js/data/recommendation-data.js','js/data/course-data.js','js/data/ui-options.js','js/domain/geo.js','js/domain/schedule.js','js/domain/trip-cost.js','js/services/vehicle-settings.js','js/services/routing.js','js/services/weather.js','js/services/geocoding.js','js/data/intent-rules.js','js/domain/recommendation.js','js/domain/intent-parser.js','js/usecases/search-destinations.js','js/domain/course-planner.js','js/ui/main-map.js','js/ui/course-map.js','js/ui/time-controls.js','js/ui/course-actions.js','js/ui/landing.js','js/ui/wizard.js','js/ui/results.js','js/controllers/search-controller.js','js/controllers/origin-controller.js','js/controllers/app-controller.js'];
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
for(const asset of ['styles.css','app.js','app-chrome.css','app-chrome.js','landing-touch-fix.css']){
  const hv=q(html,asset),sv=q(sw,asset);
  assert.ok(hv,'missing versioned HTML ref: '+asset);
  assert.equal(sv,hv,'service worker version mismatch: '+asset);
}

for(const m of html.matchAll(/(?:src|href)="\.\/assets\/([^"?]+)(?:\?[^"]*)?"/g)){
  const p=path.join(new URL('.',root).pathname,'assets',m[1]);
  assert.ok(fs.existsSync(p),'missing referenced asset: assets/'+m[1]);
}

assert.ok(chromeCss.includes('v0.45 — natural touch lifecycle for landing buttons'),'landing touch lifecycle CSS missing');
assert.ok(chromeCss.includes('v0.46 — simplified second-page search hierarchy'),'simplified search CSS missing');
assert.ok(chromeCss.includes('v0.47 — restore drag distance UX + bottom manual-input drawer'),'v0.47 distance/drawer CSS missing');
assert.ok(chromeCss.includes('background-image:url("./assets/tq-cover-main-v044.webp")'),'clean cover asset must be used');
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
assert.ok(app.includes("costLabel:vehicle.fuel==='electric'?'충전비':'연료비'"),'energy cost labels missing');
const boot=(chromeJs.match(/function bootChrome\(\)\{([^}]*)\}/)||[])[1]||'';
assert.ok(!boot.includes('observeTripSummary()'),'legacy DOM toll patch must not run');

assert.ok(html.includes('오늘 어디로 떠날까요?'),'simplified search title missing');
assert.ok(html.includes('현재 위치에서 취향에 맞는 여행지를 빠르게 찾아드려요.'),'simplified search subtitle missing');
const wizardSource=read('js/ui/wizard.js');
const appControllerSource=read('js/controllers/app-controller.js');
const resultsSource=read('js/ui/results.js');
const searchControllerSource=read('js/controllers/search-controller.js');
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
console.log('TRIP QUEST v0.52 UI/controller modular smoke tests passed');

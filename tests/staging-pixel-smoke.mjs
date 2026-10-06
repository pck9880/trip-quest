import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../site-src/test/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

const html=read('index.html');
const sw=read('sw.js');
const frame=read('phase4-app-frame.css');
const finalCss=read('phase5-final.css');
const finalJs=read('js/ui/phase5-polish.js');
const selectorJs=read('js/ui/quest-selector.js');
const travelService=read('js/services/travel-service.js');
const liveSearch=read('js/services/live-place-search.js');
const chromeJs=read('app-chrome.js');
const authJs=read('auth.js');
const authCss=read('auth.css');
const landingCss=read('css/landing.css');
const coverFinalCss=read('cover-phase3-final.css');
const manifest=read('manifest.webmanifest');
const wizardJs=read('js/ui/wizard.js');
const appControllerJs=read('js/controllers/app-controller.js');
const searchControllerJs=read('js/controllers/search-controller.js');
const noScrollCss=read('no-scroll-app.css');
const noScrollJs=read('js/ui/no-scroll-app.js');

for(const [name,source] of [
  ['phase4-app-frame.css',frame],
  ['phase5-final.css',finalCss],
  ['no-scroll-app.css',noScrollCss]
]){
  assert.equal(
    (source.match(/\{/g)||[]).length,
    (source.match(/\}/g)||[]).length,
    'unbalanced CSS braces: '+name
  );
}

for(const id of [
  'authGate','loginForm','signupForm','mainLanding','mainLocateBtn',
  'regionLevel1','regionLevel2','regionLevel3','placeChoices',
  'ranking','wizardActions','backBtn','nextBtn','toast'
]){
  assert.ok(html.includes('id="'+id+'"'),'staging required UI id missing: '+id);
}

for(const asset of [
  './phase1-pixel.css?v=20261006-phase1',
  './phase2-pixel.css?v=20261006-phase2',
  './phase3-world.css?v=20261006-phase3',
  './phase4-app-frame.css?v=20261006-phase4a',
  './phase5-final.css?v=20261006-phase5b',
  './js/ui/phase2-pixel.js?v=20261006-phase2',
  './js/ui/phase5-polish.js?v=20261006-phase5',
  './no-scroll-app.css?v=20261006-nearbyscroll1',
  './js/ui/no-scroll-app.js?v=20261006-noscroll2'
]){
  assert.ok(html.includes(asset),'staging HTML asset missing: '+asset);
}

assert.ok(frame.includes('env(safe-area-inset-top'),'top safe-area protection missing');
assert.ok(frame.includes('env(safe-area-inset-bottom'),'bottom safe-area protection missing');
assert.ok(frame.includes('.topbar.tq-appbar'),'fixed appbar rule missing');
assert.ok(frame.includes('position:fixed!important'),'fixed app frame rule missing');
assert.ok(frame.includes('.tq-bottom-nav'),'fixed bottom navigation rule missing');
assert.ok(frame.includes('overflow:hidden!important'),'document scroll lock missing');
assert.ok(frame.includes('.wizard>.step-view'),'internal step viewport missing');
assert.ok(noScrollCss.includes('.wizard>.step-view'),'no-scroll step viewport rule missing');
assert.ok(noScrollCss.includes('overflow:hidden!important'),'no-scroll overflow lock missing');

for(const token of [
  '.p5-screen-wipe',
  'prefers-reduced-motion',
  ':focus-visible',
  'touch-action:manipulation',
  '.toast.p5-success',
  '.toast.p5-error'
]){
  assert.ok(finalCss.includes(token),'phase5 polish token missing: '+token);
}

assert.ok(finalJs.includes('MutationObserver'),'phase5 visual observer missing');
assert.ok(finalJs.includes("attributeFilter:['data-trip-step']"),'step transition observer missing');
assert.ok(!finalJs.includes('preventDefault('),'phase5 visual layer must not intercept default actions');
assert.ok(!finalJs.includes('stopPropagation('),'phase5 visual layer must not stop event propagation');
assert.ok(!finalJs.includes('stopImmediatePropagation('),'phase5 visual layer must not block app handlers');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'staging HTML ids must remain unique');

for(const ref of [
  './phase4-app-frame.css?v=20261006-phase4a',
  './phase5-final.css?v=20261006-phase5b',
  './js/ui/phase5-polish.js?v=20261006-phase5'
]){
  assert.ok(sw.includes(ref),'staging service worker cache missing: '+ref);
}

assert.ok(selectorJs.includes('localRegionChildren'),'region selector must use bundled local hierarchy');
assert.ok(selectorJs.includes('markRegionReady'),'local region ready transition missing');
assert.ok(!selectorJs.includes('resolveRegion'),'region selection must not geocode over network');
assert.ok(!selectorJs.includes('regionChildren'),'region selection must not query Overpass hierarchy');
assert.ok(!selectorJs.includes('travelService.prepareRegion'),'region selection must not pre-search all place categories');
assert.ok(!travelService.includes('async function prepareRegion'),'travel service pre-analysis must be removed');
assert.ok(travelService.includes('ensureLiveBoundary'),'live boundary must resolve lazily during place search');
assert.ok(chromeJs.includes("'<strong>TRIP QUEST</strong>'"),'simplified enlarged header title missing');

assert.ok(authJs.includes('accountBar.hidden=true'),'account debug overlay must stay hidden after login');
assert.ok(authCss.includes('.tq-test-account{display:none!important}'),'account debug overlay CSS hide rule missing');

assert.ok(html.includes('./assets/tq-cover-main-v044.webp?v=20261006-pixelcover1'),'approved pixel cover preload missing');
assert.ok(landingCss.includes('../assets/tq-cover-main-v044.webp?v=20261006-pixelcover1'),'approved pixel cover CSS missing');
assert.ok(chromeJs.includes("probe.src='./assets/tq-cover-main-v044.webp?v=20261006-pixelcover1'"),'approved pixel cover probe missing');
assert.ok(sw.includes('./assets/tq-cover-main-v044.webp?v=20261006-pixelcover1'),'approved pixel cover cache key missing');

assert.ok(!html.includes('id="resetBtn"'),'instant reset button must stay removed');
assert.ok(!wizardJs.includes("label='새 TRIP QUEST'"),'final-step instant reset label must stay removed');
assert.ok(wizardJs.includes("$('#nextBtn').hidden=n===4"),'final step action must stay hidden');
assert.ok(!appControllerJs.includes("$('#resetBtn').onclick=resetTrip"),'reset button binding must stay removed');
assert.ok(!appControllerJs.includes("preventDefault();resetTrip()"),'brand click must not reset the trip');

assert.ok(html.includes('class="tq-cover-title-fx"'),'cover title fx layer missing');
assert.ok(html.includes('class="tq-title-q-star"'),'Q star effect node missing');
assert.ok(html.includes('class="tq-title-i-dot"'),'I dot effect node missing');
assert.ok(landingCss.includes('TRIP QUEST COVER TITLE FX'),'title fx stylesheet block missing');
assert.ok(landingCss.includes('pointer-events:none!important'),'title fx must never intercept cover controls');
assert.ok(landingCss.includes('@keyframes tqQStarPulse'),'Q star animation missing');
assert.ok(landingCss.includes('@keyframes tqIDotPulse'),'I dot pulse animation missing');
assert.ok(landingCss.includes('@keyframes tqTitleGlint'),'pixel glint animation missing');
assert.ok(landingCss.includes('@media(prefers-reduced-motion:reduce)'),'cover title fx reduced-motion guard missing');
assert.ok(landingCss.includes('.main-landing:not(.tq-photo-ready) .tq-cover-title-fx'),'title fx must hide when artwork fails');
assert.ok(sw.includes('./css/landing.css?v=20261006-titlefx2'),'title fx stylesheet cache version missing');
assert.ok(sw.includes('./app-chrome.js?v=20261006-searchfix1'),'title fx app chrome cache version missing');

assert.ok(html.includes('./cover-phase3-final.css?v=20261006-coverfinal3'),'final cover QA stylesheet missing');
assert.ok(sw.includes('./cover-phase3-final.css?v=20261006-coverfinal3'),'final cover QA stylesheet cache missing');
assert.ok(sw.includes('./app-chrome.js?v=20261006-searchfix1'),'final cover runtime cache version missing');
assert.ok(sw.includes('./auth.js?v=20261006-searchfix1'),'final cover auth cache version missing');
assert.ok(coverFinalCss.includes('env(safe-area-inset-bottom,0px)'),'final cover bottom safe area missing');
assert.ok(coverFinalCss.includes('env(safe-area-inset-left,0px)'),'final cover left safe area missing');
assert.ok(coverFinalCss.includes('env(safe-area-inset-right,0px)'),'final cover right safe area missing');
assert.ok(coverFinalCss.includes('pointer-events:none!important'),'final cover fx must remain non-interactive');
assert.ok(coverFinalCss.includes('@media(max-height:700px)'),'short-phone cover rules missing');
assert.ok(coverFinalCss.includes('@media(max-width:390px)'),'narrow-phone cover rules missing');
assert.ok(manifest.includes('"orientation": "portrait-primary"'),'installed PWA must prefer portrait orientation');

assert.ok(chromeJs.includes('COVER_SOURCE={w:941,h:1672}'),'cover source coordinate mapping missing');
assert.ok(chromeJs.includes('q:[486,236]'),'Q star source anchor missing');
assert.ok(chromeJs.includes('dot:[318,178]'),'I dot source anchor missing');
assert.ok(chromeJs.includes('scale=Math.max(w/COVER_SOURCE.w,h/COVER_SOURCE.h)'),'cover geometry scale mapping missing');
assert.ok(chromeJs.includes('window.visualViewport?.addEventListener'),'visual viewport resize correction missing');
assert.ok(chromeJs.includes('requestAnimationFrame(syncCoverTitleFx)'),'title fx post-load alignment missing');

assert.ok(html.includes('./no-scroll-app.css?v=20261006-nearbyscroll1'),'no-scroll HTML asset missing');
assert.ok(html.includes('./js/ui/no-scroll-app.js?v=20261006-noscroll2'),'no-scroll pagination script missing');
assert.ok(sw.includes('./no-scroll-app.css?v=20261006-nearbyscroll1'),'no-scroll CSS cache missing');
assert.ok(sw.includes('./js/ui/no-scroll-app.js?v=20261006-noscroll2'),'no-scroll JS cache missing');
assert.ok(sw.includes('./app.js?v=20261006-searchfix1'),'no-scroll app runtime cache missing');
assert.ok(sw.includes('./app-chrome.js?v=20261006-searchfix1'),'no-scroll chrome runtime cache missing');
assert.ok(sw.includes('./auth.js?v=20261006-searchfix1'),'no-scroll auth loader cache missing');

assert.ok(noScrollCss.includes('html,\nbody'),'document-level scroll lock missing');
assert.ok(noScrollCss.includes('.tq-auth-gate'),'auth one-screen rule missing');
assert.ok(noScrollCss.includes('#placeChoices'),'place fixed-grid rule missing');
assert.ok(noScrollCss.includes('#ranking.ranking-with-popular'),'result fixed-page rule missing');
assert.ok(noScrollCss.includes('#nearbyChoiceList'),'nearby fixed-page rule missing');
assert.ok(noScrollCss.includes('#courseTimeline'),'course fixed-page rule missing');
assert.ok(noScrollCss.includes('.tq-page-controls'),'pager UI rule missing');

assert.ok(noScrollJs.includes("pageSize:6,label:'PLACE'"),'place 6-item pagination missing');
assert.ok(noScrollJs.includes("pageSize:3,label:'RESULT'"),'result 3-item pagination missing');
assert.ok(noScrollJs.includes("pageSize:3,label:'NEARBY'"),'nearby 3-item pagination missing');
assert.ok(noScrollJs.includes("pageSize:3,label:'ROUTE'"),'route 3-stop pagination missing');
assert.ok(noScrollJs.includes('function buildCoursePages()'),'two-page course layout missing');
assert.ok(noScrollJs.includes("dataset.tqCoursePage='nearby'"),'course nearby page missing');
assert.ok(noScrollJs.includes("dataset.tqCoursePage='plan'"),'course plan page missing');
assert.ok(!noScrollJs.includes('preventDefault('),'pagination layer must not intercept business clicks');
assert.ok(!noScrollJs.includes('stopPropagation('),'pagination layer must not block app handlers');
assert.ok(!noScrollJs.includes('state.categories'),'pagination layer must not mutate category state');

assert.ok(!wizardJs.includes('scrollIntoView'),'wizard must not request page scrolling');
assert.ok(!searchControllerJs.includes('scrollIntoView'),'search/course flow must not request page scrolling');

assert.ok(noScrollCss.includes('REGION TOUCH + UX AUDIT FIX'),'region UX repair block missing');
assert.ok(noScrollCss.includes('pointer-events:auto!important'),'native region select touch layer missing');
assert.ok(noScrollCss.includes('-webkit-appearance:auto!important'),'native select appearance repair missing');
assert.ok(noScrollCss.includes('font-size:16px!important'),'mobile native select anti-zoom size missing');
assert.ok(noScrollCss.includes('body[data-trip-step="1"]:not(.tq-auth-locked) .wizard>.wizard-actions'),'duplicate region action row must be hidden');
assert.ok(noScrollCss.includes('[data-step-view="1"]>.selector-section-head'),'duplicate region heading must be removed');
assert.ok(noScrollCss.includes('.app-shell>main>.selector-intro'),'phone intro duplication must be removed');
assert.ok(!noScrollJs.includes('visualViewport?.addEventListener'),'no-scroll layer must not write viewport during native select use');
assert.ok(!noScrollJs.includes('scrollTop=0'),'no-scroll layer must not force viewport position');

assert.ok(liveSearch.includes('let primaryError=null'),'region boundary fallback state missing');
assert.ok(liveSearch.includes("label:'지역 경계'"),'region boundary Overpass fallback missing');
assert.ok(liveSearch.includes('name:ko'),'Korean region-name fallback query missing');

assert.ok(travelService.includes('Phase A: bundled/official data always runs first'),'local-first search phase missing');
assert.ok(travelService.includes('const neededLive='),'supplemental live category calculation missing');
assert.ok(travelService.includes('ensureLiveBoundary(criteria)'),'lazy live boundary lookup missing');
assert.ok(travelService.includes("9000,\n          {items:[],source:'지도 보조 시간 제한'}"),'supplemental live timeout guard missing');
assert.ok(searchControllerJs.includes('while(scopeIndex>=0)'),'automatic hierarchical range expansion missing');
assert.ok(searchControllerJs.includes('결과 부족으로'),'automatic range expansion UX message missing');
assert.ok(liveSearch.includes("timeoutMs:2800,label:category"),'live category endpoint timeout recovery missing');

assert.ok(noScrollCss.includes('NEARBY SELECT VISIBILITY FIX'),'nearby visibility repair missing');
assert.ok(noScrollCss.includes('overflow-y:auto!important'),'nearby variable result area must scroll internally');
assert.ok(noScrollCss.includes('touch-action:pan-y!important'),'nearby touch scrolling missing');
assert.ok(noScrollCss.includes('-webkit-overflow-scrolling:touch'),'iOS nearby momentum scrolling missing');

console.log('TRIP QUEST staging pixel/app-frame regression checks passed');

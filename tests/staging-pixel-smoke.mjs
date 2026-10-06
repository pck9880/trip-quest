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

for(const [name,source] of [
  ['phase4-app-frame.css',frame],
  ['phase5-final.css',finalCss]
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
  './js/ui/phase5-polish.js?v=20261006-phase5'
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
assert.ok(frame.includes('overflow-y:auto'),'internal long-content scrolling missing');

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
  './phase5-final.css?v=20261006-phase5',
  './js/ui/phase5-polish.js?v=20261006-phase5'
]){
  assert.ok(sw.includes(ref),'staging service worker cache missing: '+ref);
}

assert.ok(selectorJs.includes('prepareSelectedRegion'),'eupmyeondong completion must trigger region preparation');
assert.ok(selectorJs.includes('travelService.prepareRegion'),'selector must call actual region analysis');
assert.ok(selectorJs.includes('regionReady=false'),'region ready state guard missing');
assert.ok(travelService.includes('async function prepareRegion'),'travel service region pre-analysis missing');
assert.ok(travelService.includes('regionPrepCache'),'region pre-analysis cache missing');
assert.ok(liveSearch.includes('onProgress=null'),'live place search progress callback missing');
assert.ok(chromeJs.includes("'<strong>TRIP QUEST</strong>'"),'simplified enlarged header title missing');

console.log('TRIP QUEST staging pixel/app-frame regression checks passed');

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

assert.equal((html.match(/\\n/g)||[]).length,0,'index.html must not contain literal \\n text');

const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'HTML ids must be unique');
for(const id of ['mainLanding','mainLocateBtn','mainManualBtn','aiInput','aiSend','originSearch','ranking','map','courseList','courseMap','toast']){
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

assert.ok(chromeCss.includes('v0.43 — clean artwork + native landing controls'),'v0.43 native landing CSS missing');
assert.ok(chromeCss.includes('background-image:url("./assets/tq-cover-main-v043.webp")'),'clean cover asset must be used');
assert.ok(chromeCss.includes('.tq-cover-action-head'),'native landing action header missing');
assert.ok(!chromeCss.includes('opacity:.001!important'),'transparent image-button hit areas must be removed');
assert.ok(!chromeJs.includes('function bindLandingFallback'),'legacy landing coordinate fallback must be removed');
assert.ok(chromeJs.includes("probe.src='./assets/tq-cover-main-v043.webp'"),'landing preload must use v0.43 cover');
assert.ok(chromeJs.includes('tq-cover-action-head'),'native landing action header injection missing');
assert.ok(chromeJs.includes("fetch('./fuel-prices.json'"),'runtime fuel-price refresh missing');
assert.ok(app.includes('function activeVehicleProfile'),'vehicle profile calculation missing');
assert.ok(app.includes('function estimateRoundTripToll'),'toll estimation missing');
assert.ok(app.includes("costLabel:vehicle.fuel==='electric'?'충전비':'연료비'"),'energy cost labels missing');
const boot=(chromeJs.match(/function bootChrome\(\)\{([^}]*)\}/)||[])[1]||'';
assert.ok(!boot.includes('observeTripSummary()'),'legacy DOM toll patch must not run');

console.log('TRIP QUEST v0.43 UI/runtime smoke tests passed');

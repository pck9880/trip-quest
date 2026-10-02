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
  const m=file.match(new RegExp(safe+'\\?v=([^"\\']+)'));
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

assert.ok(chromeCss.includes('v0.42 — landing interaction hardening'),'landing interaction hardening CSS missing');
assert.ok(chromeJs.includes('function bindLandingFallback'),'landing tap fallback missing');
assert.ok(chromeJs.includes("fetch('./fuel-prices.json'"),'runtime fuel-price refresh missing');
assert.ok(app.includes('function activeVehicleProfile'),'vehicle profile calculation missing');
assert.ok(app.includes('function estimateRoundTripToll'),'toll estimation missing');
assert.ok(app.includes("costLabel:vehicle.fuel==='electric'?'충전비':'연료비'"),'energy cost labels missing');
const boot=(chromeJs.match(/function bootChrome\(\)\{([^}]*)\}/)||[])[1]||'';
assert.ok(!boot.includes('observeTripSummary()'),'legacy DOM toll patch must not run');

console.log('TRIP QUEST v0.42 UI/runtime smoke tests passed');

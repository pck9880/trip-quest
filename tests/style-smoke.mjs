import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../site-src/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');
const files=['css/base.css','css/product.css','css/landing.css','css/search.css'];
const css=files.map(read);

for(const [i,source] of css.entries()){
  assert.equal((source.match(/\{/g)||[]).length,(source.match(/\}/g)||[]).length,'unbalanced CSS braces: '+files[i]);
  assert.equal((source.match(/\/\*\s*v0\./g)||[]).length,0,'version-patch comments must not remain: '+files[i]);
}
const importantCount=css.reduce((sum,source)=>sum+(source.match(/!important/g)||[]).length,0);
assert.ok(importantCount<=60,'CSS important budget exceeded: '+importantCount);
const combined=css.join('\n');
for(const token of ['tq-drive-scene','tq-cinematic-scene','tq-moving-car','tq-road-speed','tq-search-shortcuts','tq-quick-chips','tq-advanced-search-btn']){
  assert.ok(!combined.includes(token),'obsolete CSS token remains: '+token);
}
for(const oldFile of ['styles.css','app-chrome.css','landing-touch-fix.css']){
  assert.ok(!fs.existsSync(new URL(oldFile,root)),'legacy stylesheet should be removed: '+oldFile);
}
assert.ok(read('css/landing.css').includes('@keyframes tqLandingButtonRelease'),'landing release animation missing');
assert.ok(read('css/search.css').includes('@keyframes tqManualDrawerIn'),'manual drawer animation missing');
console.log('TRIP QUEST v0.54 semantic CSS and style-budget tests passed');

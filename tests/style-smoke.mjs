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
const landing=read('css/landing.css');
assert.ok(landing.includes('@keyframes tqLandingButtonRelease'),'landing release animation missing');
assert.ok(landing.includes('url("../assets/tq-cover-main-v044.webp")'),'cover path must resolve from css/landing.css');
assert.ok(fs.existsSync(new URL('./assets/tq-cover-main-v044.webp',root)),'active cover asset missing');
assert.ok(read('css/search.css').includes('.tq-category-screen'),'category screen styles missing');
assert.ok(read('css/base.css').includes('.dual-distance-range'),'dual distance base styles missing');
assert.ok(read('css/search.css').includes('.ai-distance-range.is-snapping'),'magnetic snap feedback styles missing');
assert.ok(read('css/product.css').includes('.tq-linked-place-overlay'),'course-linked place sheet styles missing');
console.log('TRIP QUEST v1.9.0 semantic CSS and style-budget tests passed');

assert.ok(read('css/base.css').includes('.course-keep-toggle'),'course KEEP star styles missing');
assert.ok(read('css/product.css').includes('.tq-keep-overlay'),'KEEP bottom sheet styles missing');
assert.ok(read('css/product.css').includes('.tq-keep-badge'),'KEEP nav badge styles missing');

const keepProduct=read('css/product.css');
assert.ok(keepProduct.includes('.tq-keep-back{min-height:42px'),'KEEP list return tap target is too small');
assert.ok(keepProduct.includes('.tq-keep-detail-go'),'KEEP detail shortcut style missing');
assert.ok(keepProduct.includes('.tq-keep-place-info'),'KEEP destination info style missing');

const myProduct=read('css/product.css');
assert.ok(myProduct.includes('.tq-my-overlay'),'MY page overlay styles missing');
assert.ok(myProduct.includes('.tq-profile-card'),'profile card styles missing');
assert.ok(myProduct.includes('.tq-attendance-card'),'attendance card styles missing');
assert.ok(myProduct.includes('.tq-history-section'),'travel-history styles missing');
assert.ok(myProduct.includes('.trip-completion-card'),'trip completion styles missing');

const myDetails=read('css/product.css');
assert.ok(myDetails.includes('.tq-attendance-calendar'),'attendance calendar styles missing');
assert.ok(myDetails.includes('.tq-history-actions'),'history action styles missing');
assert.ok(myDetails.includes('.tq-data-page'),'data-management styles missing');
assert.ok(myDetails.includes('.tq-month-trip-strip'),'monthly trip summary styles missing');

const questCss=read('css/product.css');
assert.ok(questCss.includes('.tq-quest-overlay'),'QUEST panel styles missing');
assert.ok(questCss.includes('.tq-gps-status'),'GPS live status styles missing');
assert.ok(questCss.includes('.course-quest-card'),'course-linked QUEST card styles missing');
assert.ok(questCss.includes('.tq-title-page'),'MY title styles missing');
assert.ok(questCss.includes('grid-template-columns:repeat(4,1fr)'),'four-tab bottom nav layout missing');

assert.ok(questCss.includes('.tq-gps-toggle'),'MY GPS toggle styles missing');
assert.ok(questCss.includes('.tq-quest-empty'),'course QUEST empty state styles missing');
assert.ok(questCss.includes('.tq-quest-reward-pending'),'pending reward styles missing');

assert.ok(questCss.includes('.tq-quest-island'),'active course island styles missing');
assert.ok(questCss.includes('.tq-course-ready-popup'),'course-ready popup styles missing');
assert.ok(questCss.includes('.tq-quest-reward-popup'),'reward denial popup styles missing');

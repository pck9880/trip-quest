import fs from 'node:fs';
import assert from 'node:assert/strict';
await import('../site-src/app.js');
const {localAI,localRecommend,coursePack,normalizedDistanceRange,refineRoadDistanceResults}=globalThis.__TQ_TEST__;
assert.ok(localAI&&localRecommend&&coursePack&&normalizedDistanceRange&&refineRoadDistanceResults,'test hooks missing');

const context={
  origin:{lat:35.18,lng:128.10,name:'테스트 출발지'},
  minKm:20,targetKm:100,direction:'전체',categories:['관광지'],
  departure:'',returnTime:'',gasPrice:1700
};

assert.deepEqual(normalizedDistanceRange({minKm:30,targetKm:120}),{min:30,max:120});
assert.deepEqual(normalizedDistanceRange({minKm:200,targetKm:100}),{min:100,max:200});
assert.deepEqual(normalizedDistanceRange({minKm:400,targetKm:400}),{min:390,max:400});

const complex=localAI('오늘 비 오는데 파도치는 것도 보고 따뜻한 라떼 마시고 싶어. 사람이 많지 않은 카페면 좋겠어.',context);
assert.equal(complex.intent,'travel_search');
assert.equal(complex.semanticProfile.flags.wave,true);
assert.equal(complex.semanticProfile.flags.wantsCafe,true);
assert.equal(complex.semanticProfile.flags.quiet,true);
assert.ok(complex.semanticProfile.hardCategories.includes('바다'));

const baseItems=localRecommend({...context,...complex.patch,semanticProfile:complex.semanticProfile});
assert.ok(baseItems.length>0,'complex query should return candidates');
assert.ok(baseItems.every(x=>x.category==='바다'),'wave intent should prioritize sea destinations');
assert.ok(!baseItems.some(x=>x.name==='진주성'),'irrelevant historic tourist spot must not appear for wave query');

const roadItems=await refineRoadDistanceResults(baseItems,{...context,...complex.patch});
assert.ok(roadItems.every(x=>x.distanceKm>=19.999&&x.distanceKm<=100.001),'road-refined results must stay in min/max range');

const stars=localAI('별 잘 보이고 조용한 곳',{...context,minKm:0,targetKm:150});
const starItems=localRecommend({...context,minKm:0,targetKm:150,...stars.patch,semanticProfile:stars.semanticProfile});
assert.ok(starItems.every(x=>['산','캠핑','바다','공원'].includes(x.category)),'stargazing should exclude generic tourist spots');

const destination={id:'test-d',name:'테스트',category:'바다',lat:34.7441,lng:127.7655};
const pack=await coursePack({...context,destination,categories:['바다']},{condition:'맑음',precipitation_probability:0});
assert.equal(pack.length,3,'three course variants required');
for(const c of pack){
  if(c.mode==='drive'&&c.stops.length>1)assert.ok(c.maxLocalLegKm<=4.001,'drive course legs must stay within 4km');
}

const bandQuery=localAI('조용한 바다를 보고 싶어',{...context,minKm:80,targetKm:100});
const bandItems=localRecommend({...context,minKm:80,targetKm:100,distanceBand:{min:60,max:120},...bandQuery.patch,semanticProfile:bandQuery.semanticProfile});
const bandRoad=await refineRoadDistanceResults(bandItems,{...context,minKm:80,targetKm:100,distanceBand:{min:60,max:120}});
assert.ok(bandRoad.every(x=>x.distanceKm>=59.999&&x.distanceKm<=120.001),'expanded ±20km band must be respected');

const appSource=fs.readFileSync(new URL('../site-src/app.js',import.meta.url),'utf8');
const htmlSource=fs.readFileSync(new URL('../site-src/index.html',import.meta.url),'utf8');
assert.ok(appSource.includes("$$('.result-sort button').forEach"),'sort selector must support multiple buttons');
assert.ok(!/(^|[^$])\$\([^\n;]+\)\.forEach/m.test(appSource),'no single-element $() selector may call forEach');
assert.ok(htmlSource.includes('id="distanceMinRange"')&&htmlSource.includes('id="distanceMaxRange"'),'dual distance sliders required');
assert.ok(htmlSource.includes('data-sort="recommend"')&&htmlSource.includes('추천순'),'default sort must be recommendation order');
assert.ok(appSource.includes('async function roadRoute('),'road route helper required');
assert.ok(appSource.includes("source:'osrm'"),'road route source marker required');
console.log('TRIP QUEST v0.19 smoke/regression tests passed');

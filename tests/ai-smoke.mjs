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
const complex=localAI('오늘 비 오는데 파도치는 것도 보고 따뜻한 라떼 마시고 싶어.',context);
assert.equal(complex.intent,'travel_search');
const baseItems=localRecommend({...context,...complex.patch,semanticProfile:complex.semanticProfile});
assert.ok(baseItems.length>0,'AI search needs candidates');
const roadItems=await refineRoadDistanceResults(baseItems,{...context,...complex.patch});
assert.ok(roadItems.every(x=>x.distanceKm>=19.999&&x.distanceKm<=100.001),'road-refined min/max range required');

const destination={id:'test-d',name:'테스트',category:'바다',lat:34.7441,lng:127.7655};
const pack=await coursePack({...context,destination,categories:['바다']},{condition:'맑음',precipitation_probability:0});
assert.equal(pack.length,2,'only A and B courses should exist');
assert.deepEqual(pack.map(x=>x.id),['A','B'],'course ids must be A/B only');
assert.equal(pack[0].mode,'walk','A must be walking course');
assert.equal(pack[1].mode,'drive','B must be drive course');
assert.ok(pack[0].title.includes('도보 근거리'),'A title must say walking near-distance');
assert.ok(pack[1].title.includes('드라이브'),'B title must say drive');
assert.ok(pack.every(x=>!x.title.includes('RAIN')&&!x.title.includes('TASTE')),'C-style variants must be removed');
if(pack[1].stops.length>1)assert.ok(pack[1].maxLocalLegKm<=4.001,'B drive legs must stay within 4km');
assert.ok(pack.every(x=>!x.route.coords?.some(c=>Math.abs(c[0]-context.origin.lat)<1e-6&&Math.abs(c[1]-context.origin.lng)<1e-6)),'course map route must exclude trip origin');

const appSource=fs.readFileSync(new URL('../site-src/app.js',import.meta.url),'utf8');
const htmlSource=fs.readFileSync(new URL('../site-src/index.html',import.meta.url),'utf8');
assert.ok(appSource.includes("$$('.result-sort button').forEach"),'sort selector regression');
assert.ok(!/(^|[^$])\$\([^\n;]+\)\.forEach/m.test(appSource),'single $ selector may not call forEach');
assert.ok(appSource.includes("const COURSE_PLACE_META="),'course map place metadata required');
assert.ok(appSource.includes("stops.forEach((p,i)=>addCourseMarker(p,i+1))"),'course map must mark local stops only');
assert.ok(!htmlSource.includes('A / B / C'),'C course UI must be removed');
assert.ok(htmlSource.includes('A 도보 근거리 / B 드라이브'),'A/B course description required');
console.log('TRIP QUEST v0.20 smoke/regression tests passed');

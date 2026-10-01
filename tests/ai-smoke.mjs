import fs from 'node:fs';
import assert from 'node:assert/strict';
await import('../site-src/app.js');
const {localAI,localRecommend,coursePack}=globalThis.__TQ_TEST__;
assert.ok(localAI&&localRecommend&&coursePack,'test hooks missing');

const context={
  origin:{lat:35.18,lng:128.10,name:'테스트 출발지'},
  targetKm:100,direction:'전체',categories:['관광지'],
  departure:'',returnTime:'',gasPrice:1700
};

const complex=localAI('오늘 비 오는데 파도치는 것도 보고 따뜻한 라떼 마시고 싶어. 사람이 많지 않은 카페면 좋겠어.',context);
assert.equal(complex.intent,'travel_search');
assert.equal(complex.semanticProfile.flags.wave,true);
assert.equal(complex.semanticProfile.flags.wantsCafe,true);
assert.equal(complex.semanticProfile.flags.quiet,true);
assert.equal(complex.semanticProfile.flags.rain,true);
assert.ok(complex.semanticProfile.hardCategories.includes('바다'));
assert.ok(!complex.semanticProfile.hardCategories.includes('관광지'),'generic 관광지 must not override wave intent');
assert.equal(complex.semanticProfile.distance.mode,'max');

const complexItems=localRecommend({...context,...complex.patch,semanticProfile:complex.semanticProfile});
assert.ok(complexItems.length>0,'complex query should return destinations');
assert.ok(complexItems.every(x=>x.category==='바다'),'wave intent should prioritize sea destinations only');
assert.ok(complexItems.every(x=>x.distanceKm<=100.001),'100km 이내 condition must be respected');
assert.ok(!complexItems.some(x=>x.name==='진주성'),'진주성 must not appear for wave/cafe/quiet query');

const stars=localAI('별 잘 보이고 조용한 곳', {...context,targetKm:150});
const starItems=localRecommend({...context,...stars.patch,semanticProfile:stars.semanticProfile});
assert.ok(starItems.length>0,'stargazing query should return results');
assert.ok(starItems.every(x=>['산','캠핑','바다','공원'].includes(x.category)),'stargazing should exclude generic tourist spots');

const history=localAI('역사 문화재 보고 싶어', {...context,targetKm:80});
assert.ok(history.semanticProfile.hardCategories.includes('관광지'),'history query should allow tourist heritage destinations');

const destination={id:'test-d',name:'테스트',category:'바다',lat:34.7441,lng:127.7655};
const pack=coursePack({...context,destination,categories:['바다']},{condition:'맑음',precipitation_probability:0});
for(const c of pack){
  if(c.stops.length>1)assert.ok(c.maxLocalLegKm<=4.001,'local course legs must stay within 4km');
}
console.log('TRIP QUEST smoke tests passed');

const relaxedContext={...context,origin:{lat:36.48,lng:127.29,name:'세종 테스트'},targetKm:20};
const relaxedQuery=localAI('20km 안에서 조용히 쉬고 싶어 공원이나 자연이면 좋겠어',relaxedContext);
const relaxedItems=localRecommend({...relaxedContext,...relaxedQuery.patch,semanticProfile:relaxedQuery.semanticProfile});
assert.ok(relaxedItems.length>0,'AI valid travel query should not silently return zero results');
assert.ok(relaxedItems.some(x=>['공원','산','바다','캠핑'].includes(x.category)),'quiet query should return nature-oriented results');
console.log('less-famous / fallback recommendation test passed');

const ambiguous=localAI('오늘 그냥 바람 쐬고 싶어. 60km 안에서 편하게 갈 곳 찾아줘',context);
assert.equal(ambiguous.intent,'travel_search','ambiguous travel request should still be treated as travel');
const ambiguousItems=localRecommend({...context,...ambiguous.patch,semanticProfile:ambiguous.semanticProfile});
assert.ok(ambiguousItems.length>0,'ambiguous travel request should return recommendations');
assert.ok(ambiguousItems.some(x=>x.category!=='관광지'),'AI generic search must not be locked to default tourist category');

const unknown=localAI('새 노트북 사양 비교해줘',context);
assert.equal(unknown.intent,'clarify','non-travel unknown request should end in clarify state');
console.log('ambiguous travel request / clarify state test passed');

const radius50=localAI('조용히 바람 쐬고 싶어', {...context,targetKm:50});
const radiusItems=localRecommend({...context,targetKm:50,...radius50.patch,semanticProfile:radius50.semanticProfile});
assert.ok(radiusItems.every(x=>x.distanceKm<=50.001),'slider radius must be a hard maximum');

const radius400=localAI('바다나 공원으로 기분전환하고 싶어', {...context,targetKm:400});
const radius400Items=localRecommend({...context,targetKm:400,...radius400.patch,semanticProfile:radius400.semanticProfile});
assert.ok(radius400Items.every(x=>x.distanceKm<=400.001),'maximum slider radius must stay within 400km');

const nearZero=localAI('가까운 곳에서 잠깐 쉬고 싶어', {...context,targetKm:0});
assert.equal(nearZero.semanticProfile.distance.km,10,'0km slider should mean immediate 10km neighborhood');
console.log('distance slider radius test passed');

const bandQuery=localAI('조용한 바다를 보고 싶어', {...context,targetKm:100});
const bandItems=localRecommend({...context,targetKm:100,distanceBand:{min:80,max:120},...bandQuery.patch,semanticProfile:bandQuery.semanticProfile});
assert.ok(bandItems.every(x=>x.distanceKm>=79.999&&x.distanceKm<=120.001),'similar-distance results must stay inside ±20km band');
console.log('similar-distance band fallback test passed');

const appSource=fs.readFileSync(new URL('../site-src/app.js',import.meta.url),'utf8');
assert.ok(appSource.includes("$$('.result-sort button').forEach"),'result sort must use the multi-element selector helper');
assert.ok(!appSource.includes("$(' .result-sort button').forEach"),'single-element selector must not be used for result sort');
assert.ok(!/(^|[^$])\$\('\.result-sort button'\)\.forEach/m.test(appSource),'result sort single-selector forEach regression detected');
console.log('result-sort selector regression test passed');

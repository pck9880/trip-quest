import assert from 'node:assert/strict';
await import('../site-src/app.js');
const {localAI,localRecommend,coursePack}=globalThis.__TQ_TEST__;
assert.ok(localAI&&localRecommend&&coursePack,'test hooks missing');

const context={
  origin:{lat:35.18,lng:128.10,name:'테스트 출발지'},
  targetKm:100,direction:'전체',categories:['관광지'],
  departure:'',returnTime:'',gasPrice:1700
};

const complex=localAI('오늘 비 오는데 파도치는 것도 보고 따뜻한 라떼 마시고 싶어. 사람이 많지 않은 카페면 좋겠어. 100km 안쪽으로 찾아줘',context);
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

const stars=localAI('별 잘 보이고 조용한 곳 150km 이내',context);
const starItems=localRecommend({...context,...stars.patch,semanticProfile:stars.semanticProfile});
assert.ok(starItems.length>0,'stargazing query should return results');
assert.ok(starItems.every(x=>['산','캠핑','바다','공원'].includes(x.category)),'stargazing should exclude generic tourist spots');

const history=localAI('역사 문화재 보고 싶어 80km 안쪽',context);
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

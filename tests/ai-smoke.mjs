import fs from 'node:fs';
import assert from 'node:assert/strict';
await import('../site-src/app.js');
const {localAI,localRecommend,coursePack,normalizedDistanceRange}=globalThis.__TQ_TEST__;
assert.ok(localAI&&localRecommend&&coursePack&&normalizedDistanceRange,'test hooks missing');

const context={
  origin:{lat:35.18,lng:128.10,name:'테스트 출발지'},
  minKm:0,targetKm:150,direction:'전체',categories:['관광지'],
  departure:'',returnTime:'',gasPrice:1700
};

const cases=[
  ['힙한 장소 가고 싶어','trendy','힙·트렌디'],
  ['요즘 뜨는 핫플 말고 찐로컬 숨은 곳','localhidden','로컬·숨은명소'],
  ['빈티지하고 레트로한 동네 감성','retro','레트로·빈티지'],
  ['복합문화공간이나 디자인 좋은 곳','artspace','예술·공간'],
  ['건축 예쁘고 공간미 좋은 곳','architecture','건축·공간미'],
  ['골목길 걷고 구도심 구경하고 싶어','alley','골목·마을'],
  ['독립서점이나 책방 감성 좋아','bookish','책·서점감성'],
  ['오션뷰 제대로 보이는 곳','oceanview','오션뷰·바다뷰'],
  ['호수나 수변공원에서 쉬고 싶어','waterside','수변·호수'],
  ['돗자리 펴고 피크닉하기 좋은 곳','picnic','피크닉·잔디'],
  ['필카로 스냅 찍기 좋은 포토스팟','photo','사진·스냅'],
  ['도시뷰랑 스카이라인 예쁜 곳','cityview','도시뷰·시티감성'],
  ['이색적이고 색다른 곳','unique','이색·특이한곳'],
  ['탁 트이고 뻥 뚫린 곳','openair','탁트인·개방감']
];
for(const [q,id,label] of cases){
  const r=localAI(q,context);
  assert.equal(r.intent,'travel_search',q+' should be travel_search');
  assert.ok(r.semanticProfile.matches.some(x=>x.id===id),q+' should match '+id);
  assert.ok(r.analysisKeywords.includes(label),q+' should expose '+label);
}
const hip=localAI('힙한 장소 추천해줘',context);
const hipItems=localRecommend({...context,...hip.patch,semanticProfile:hip.semanticProfile});
assert.ok(hipItems.length>0,'hip query should return recommendations');
assert.ok(hipItems.some(x=>['뮤지엄','체험마을','관광지','공원'].includes(x.category)),'hip query should favor culture/local place types');

const appSource=fs.readFileSync(new URL('../site-src/app.js',import.meta.url),'utf8');
const htmlSource=fs.readFileSync(new URL('../site-src/index.html',import.meta.url),'utf8');
assert.ok(appSource.includes("id:'trendy'"),'trendy semantic rule required');
assert.ok(appSource.includes("id:'localhidden'"),'local hidden semantic rule required');
assert.ok(appSource.includes("id:'retro'"),'retro semantic rule required');
assert.ok(htmlSource.includes('힙한 로컬 장소'),'placeholder should show modern-language example');

const destination={id:'test-d',name:'테스트',category:'바다',lat:34.7441,lng:127.7655};
const pack=await coursePack({...context,destination,categories:['바다']},{condition:'맑음',precipitation_probability:0});
assert.deepEqual(pack.map(x=>x.id),['A','B'],'A/B course regression');
console.log('TRIP QUEST v0.21 expanded keyword tests passed');

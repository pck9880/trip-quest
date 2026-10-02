import fs from 'node:fs';
import assert from 'node:assert/strict';
await import('../site-src/app.js');
const {localAI,localRecommend,coursePack,activeVehicleProfile,estimateRoundTripToll}=globalThis.__TQ_TEST__;
assert.ok(localAI&&localRecommend&&coursePack&&activeVehicleProfile&&estimateRoundTripToll,'test hooks missing');
const defaultVehicle=activeVehicleProfile({gasPrice:1858});
assert.equal(defaultVehicle.vehicleLabel,'캐스퍼');
assert.equal(defaultVehicle.efficiency,11);
assert.equal(defaultVehicle.fuel,'gasoline');
assert.equal(estimateRoundTripToll(20,false),0);
assert.ok(estimateRoundTripToll(200,false)>0,'long round trip should have estimated toll');

const context={
  origin:{lat:35.1796,lng:129.0756,name:'부산 테스트'},
  minKm:0,targetKm:200,direction:'전체',categories:['관광지'],
  departure:'',returnTime:'',gasPrice:1700
};

const hip=localAI('힙한 번화가 가고 싶어. 젊은 사람 많고 카페랑 쇼핑할 곳 많은 곳',context);
assert.equal(hip.intent,'travel_search');
assert.equal(hip.semanticProfile.flags.trendy,true);
assert.equal(hip.semanticProfile.flags.urbanHotspot,true);
assert.ok(hip.semanticProfile.hardCategories.includes('번화가'),'urban hotspot should be a hard urban category');
const hipItems=localRecommend({...context,...hip.patch,semanticProfile:hip.semanticProfile});
assert.ok(hipItems.length>0,'hip urban query should return results');
assert.ok(hipItems.slice(0,8).every(x=>['번화가','카페거리','문화거리','쇼핑거리'].includes(x.category)),'top hip results must be urban hotspot categories');
assert.ok(hipItems.some(x=>['부산 서면 젊음의거리','부산 전포카페거리','경주 황리단길','대구 동성로'].includes(x.name)),'known youth hotspot should appear');

const hipOnly=localAI('힙한 장소 추천해줘',context);
const hipOnlyItems=localRecommend({...context,...hipOnly.patch,semanticProfile:hipOnly.semanticProfile});
assert.ok(hipOnlyItems.slice(0,5).every(x=>['번화가','카페거리','문화거리','쇼핑거리'].includes(x.category)),'generic hip query must prefer urban hotspot data');

const seomyeon={id:'test-seomyeon',name:'부산 서면 젊음의거리',category:'번화가',lat:35.1578,lng:129.0595,routeGroup:'busan-seomyeon'};
const pack=await coursePack({...context,destination:seomyeon,categories:['번화가']},{condition:'맑음',precipitation_probability:0});
assert.deepEqual(pack.map(x=>x.id),['A','B']);
assert.deepEqual(pack[0].stops.map(x=>x.name),['부산 서면 젊음의거리','부산 전포카페거리','부산 삼정타워'],'Busan A course must be linked walk route');
assert.deepEqual(pack[1].stops.map(x=>x.name),['부산 서면 젊음의거리','부산 남포동 BIFF광장','부산 자갈치시장'],'Busan B course must be linked drive route');

const hwang={id:'test-hwang',name:'경주 황리단길',category:'번화가',lat:35.8387,lng:129.2093,routeGroup:'gyeongju-hwangridan'};
const gpack=await coursePack({...context,destination:hwang,categories:['번화가']},{condition:'맑음',precipitation_probability:0});
assert.deepEqual(gpack[0].stops.map(x=>x.name),['경주 황리단길','경주 대릉원','경주 첨성대']);
assert.deepEqual(gpack[1].stops.map(x=>x.name),['경주 황리단길','경주 동궁과월지','경주 보문호수']);

const source=fs.readFileSync(new URL('../site-src/app.js',import.meta.url),'utf8');
assert.ok(source.includes("const CURATED_COURSES="),'curated nationwide route graph required');
assert.ok(source.includes("'seoul-hongdae'"),'Hongdae route preset required');
assert.ok(source.includes("'daegu-dongseong'"),'Daegu route preset required');
assert.ok(source.includes("'gwangju-dongmyeong'"),'Gwangju route preset required');
assert.ok(source.includes("'suwon-haengni'"),'Suwon route preset required');
assert.ok(source.includes("const all=s=>Array.from(document.querySelectorAll(s))"),'plural selector stability helper required');
console.log('TRIP QUEST v0.46 urban hotspot, route, and vehicle tests passed');

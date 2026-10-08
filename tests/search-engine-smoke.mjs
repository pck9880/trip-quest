import assert from 'node:assert/strict';
import fs from 'node:fs';
import { regionMatches, mergePlaces } from '../site-src/test/js/services/search-normalization.js';

const base=new URL('../site-src/test/',import.meta.url);
const originalFetch=globalThis.fetch;
let manifestFailures=0;
globalThis.fetch=async(input)=>{
  const url=String(input);
  if(!url.startsWith('./data/national/'))throw new Error('External map provider intentionally offline during this test');
  if(url.endsWith('runtime-manifest.json')&&manifestFailures>0){
    manifestFailures--;
    throw new Error('Simulated temporary manifest outage');
  }
  const file=new URL(url.slice(2),base);
  const bytes=fs.readFileSync(file);
  return new Response(bytes,{status:200});
};

try{
  const area={sido:'서울특별시',sigungu:'동대문구',eupmyeondong:'용두동',address:'서울특별시 동대문구 용두동'};
  assert.equal(regionMatches(area,['서울특별시','동대문구']),true);
  assert.equal(regionMatches(area,['서울','동대문구']),true);
  assert.equal(regionMatches(area,['서울특별시','동대문구','용두제1동']),true);
  assert.equal(regionMatches(area,['서울특별시','강동구']),false);
  assert.equal(regionMatches(area,['서울특별시','강서구']),false);
  assert.equal(regionMatches({...area,sigungu:'강서구',address:'서울특별시 강서구 화곡동'},['서울특별시','서구']),false);
  assert.equal(regionMatches(area,['부산광역시','동대문구']),false);
  assert.equal(regionMatches({sido:'전남광주통합특별시',sigungu:'동구',address:'광주광역시 동구'},['광주광역시','동구']),true);
  assert.equal(regionMatches({sido:'전남광주통합특별시',sigungu:'목포시',address:'전라남도 목포시'},['광주광역시']),false);

  const p={id:'official-1',name:'서울숲',category:'공원',lat:37.5445,lng:127.0374};
  assert.deepEqual(mergePlaces([p],[{...p,id:'osm-1'}]),[p],'official source wins during duplicate merging');

  manifestFailures=1;
  const store=await import('../site-src/test/js/services/national-place-store.js?search-retry-smoke=1');
  await assert.rejects(store.loadNationalDataset(),/Simulated temporary manifest outage/);
  const dataset=await store.loadNationalDataset();
  assert.ok(dataset.items.length>=20000,'national dataset should be loaded after retry');
  const gu=await store.localRegionChildren(['서울특별시']);
  assert.ok(gu.includes('동대문구'),'Dongdaemun should exist in the local district selector');
  const raw=dataset.items.filter(x=>regionMatches(x,['서울특별시','동대문구']));
  const picked=await store.searchOfficialPlaces({regionPath:['서울특별시','동대문구'],categories:['공원','전통시장','대형도서관','카페거리','쇼핑거리']});
  console.log('Dongdaemun fixture: raw='+raw.length+', selected='+picked.items.length+', categories='+JSON.stringify([...new Set(picked.items.map(x=>x.category))]));
  assert.ok(raw.length>0,'Dongdaemun must be represented in national DB');
  assert.ok(picked.items.length>0,'Dongdaemun must return at least one suitable local place');

  const { createTravelService }=await import('../site-src/test/js/services/travel-service.js');
  const service=createTravelService();
  const local=await service.selectionSearch({regionPath:['서울특별시','동대문구'],categories:['공원'],facilities:[]});
  assert.ok(local.items.length>0,'service must preserve available local results even when external map is offline');
  assert.ok(['ok','partial'].includes(local.status),'local place results should remain usable');
  const unavailable=await service.selectionSearch({regionPath:['서울특별시','없는구'],categories:['박물관미술관'],facilities:[]});
  assert.equal(unavailable.items.length,0);
  assert.equal(unavailable.status,'unavailable','provider outage must not be misreported as a genuinely empty district');
  assert.ok(unavailable.failures.some(x=>x.provider==='osm'));
  console.log('TRIP QUEST national-first region/fallback runtime search tests passed');
}finally{
  globalThis.fetch=originalFetch;
}

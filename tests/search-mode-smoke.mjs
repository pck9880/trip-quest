import assert from 'node:assert/strict';
import { createTripStore } from '../site-src/js/store/trip-store.js';
import { createPlaceSearchService, SEARCH_MODE_CONFIGS, MOOD_OPTIONS } from '../site-src/js/services/place-search-service.js';
import { localGeocode, reverseGeocode } from '../site-src/js/services/geocoding.js';

const store=createTripStore();
assert.equal(store.state.searchMode,'travel');
assert.equal(store.state.localMinRadiusKm,0);
assert.equal(store.state.localRadiusKm,2);
assert.deepEqual(store.state.moodKeywords,[]);
store.state.searchMode='cafe';
store.state.searchRegion={name:'가야동',lat:35.151,lng:129.032};
store.state.moodKeywords=['조용한','감성'];
store.resetJourney();
assert.equal(store.state.searchMode,'travel');
assert.equal(store.state.searchRegion,null);
assert.deepEqual(store.state.moodKeywords,[]);

assert.equal(SEARCH_MODE_CONFIGS.cafe.categoryCode,'CE7');
assert.equal(SEARCH_MODE_CONFIGS.food.categoryCode,'FD6');
assert.equal(SEARCH_MODE_CONFIGS.travel.code,'TRIP');
assert.equal(SEARCH_MODE_CONFIGS.travel.distance.step,50);
assert.equal(SEARCH_MODE_CONFIGS.travel.distance.max,450);
assert.ok(MOOD_OPTIONS.cafe.includes('조용한'));
assert.ok(MOOD_OPTIONS.food.includes('로컬'));

let requestedUrl='';
const service=createPlaceSearchService({
  fetchRef:async url=>{
    requestedUrl=String(url);
    return {
      ok:true,
      async json(){
        return [{
          place_id:101,
          display_name:'테스트 로스터리, 가야동, 부산진구, 부산광역시, 대한민국',
          lat:'35.1515',
          lon:'129.0325',
          type:'cafe',
          importance:0.8
        }];
      }
    };
  }
});
const result=await service.searchPlaces({
  mode:'cafe',
  query:'로스터리',
  region:{name:'가야동',address:'부산광역시 부산진구 가야동',lat:35.151,lng:129.032},
  radiusMinKm:0,
  radiusKm:2,
  moods:['조용한','감성']
});
assert.match(requestedUrl,/nominatim\.openstreetmap\.org\/search/);
assert.equal(result.items.length,1);
assert.equal(result.items[0].name,'테스트 로스터리');
assert.equal(result.items[0].type,'cafe');
assert.equal(result.providerPlan.secureProxyConnected,false);
assert.equal(result.providerPlan.ratingReviewConnected,false);
assert.ok(Number.isFinite(result.items[0].popularityScore));
assert.equal(result.items[0].reviewCount,null);
assert.match(result.source,/fallback/);

const originalFetch=globalThis.fetch;
let resolverUrls=[];
globalThis.fetch=async url=>{
  resolverUrls.push(String(url));
  if(String(url).includes('/reverse?')){
    return {ok:true,async json(){return {display_name:'가야동, 부산진구, 부산광역시, 대한민국',address:{city:'부산광역시',borough:'부산진구',suburb:'가야동'}}}};
  }
  if(String(url).includes('사상역')){
    return {ok:true,async json(){return [{place_id:201,display_name:'사상역, 사상구, 부산광역시, 대한민국',lat:'35.1628',lon:'128.9846',type:'station',class:'railway',importance:.7}]}};
  }
  if(String(url).includes('가야공원')){
    return {ok:true,async json(){return [{place_id:202,display_name:'가야공원, 부산진구, 부산광역시, 대한민국',lat:'35.151',lon:'129.022',type:'park',class:'leisure',importance:.6}]}};
  }
  return {ok:true,async json(){return [{place_id:203,display_name:'테스트 놀이공원, 부산광역시, 대한민국',lat:'35.19',lon:'129.21',type:'theme_park',class:'tourism',importance:.8}]}};
};

const current=await reverseGeocode(35.151,129.032);
assert.equal(current.name,'부산광역시 부산진구 가야동');
assert.match(current.address,/가야동/);

const park=await localGeocode('가야공원');
assert.equal(park[0].name,'가야공원');
assert.equal(park[0].placeTypeLabel,'공원');

const sasang=await localGeocode('사상번화가거리');
assert.equal(sasang[0].name,'사상역 번화가');
assert.equal(sasang[0].placeType,'commercial_area');
assert.ok(resolverUrls.some(x=>x.includes('사상역')),'informal commercial-area alias must resolve to a real place query');

const theme=await localGeocode('부산 놀이공원');
assert.equal(theme[0].placeTypeLabel,'놀이공원');

globalThis.fetch=originalFetch;
console.log('TRIP-only linked-place / resolver smoke: ok');

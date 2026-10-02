import assert from 'node:assert/strict';
import { createTripStore } from '../site-src/js/store/trip-store.js';
import { createPlaceSearchService, SEARCH_MODE_CONFIGS, MOOD_OPTIONS } from '../site-src/js/services/place-search-service.js';

const store=createTripStore();
assert.equal(store.state.searchMode,'travel');
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

console.log('search-mode smoke: ok');

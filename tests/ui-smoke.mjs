import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../site-src/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,root),'utf8');

const html=read('index.html');
const app=read('app.js');
const chrome=read('app-chrome.js');
const searchCss=read('css/search.css');
const productCss=read('css/product.css');
const landingCss=read('css/landing.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
const geoExplorer=read('js/ui/geo-explorer.js');
const geocoding=read('js/services/geocoding.js');
const travelService=read('js/services/travel-service.js');
const searchFlow=read('js/ui/search-flow.js');
const appController=read('js/controllers/app-controller.js');
const tripStore=read('js/store/trip-store.js');

for(const id of ['mainLanding','mainLocateBtn','mainManualBtn','tripExplorer','geoCanvas','geoTarget','geoVector','geoLocationPopup','geoPopupTitle','geoPopupUse','geoSearchSheet','geoStartLabel','geoStartQuickGps','geoStartChange','aiInput','aiSend','geoResults']){
  assert.ok(html.includes(`id="${id}"`),`required UI id missing: ${id}`);
}

assert.ok(html.includes('TRIP GEO'),'GEO canvas heading missing');
assert.ok(html.includes('EXPLORE VECTOR'),'GEO canvas vector label missing');
assert.ok(html.includes('어디로 떠나고 싶나요?'),'AI trip search title missing');

assert.ok(geoExplorer.includes('const KOREA='),'South Korea map bounds missing');
assert.ok(geoExplorer.includes('installKoreaCanvas'),'South Korea map layer missing');
assert.ok(geoExplorer.includes('korea-land'),'South Korea silhouette missing');
assert.ok(geoExplorer.includes('jeju'),'Jeju map shape missing');
assert.ok(geoExplorer.includes('geoToXY')&&geoExplorer.includes('xyToGeo'),'Korea coordinate projection missing');
assert.ok(geoExplorer.includes('setPointerCapture'),'drag pointer capture missing');
assert.ok(geoExplorer.includes('travelService.reverseGeocode'),'drag-end place analysis missing');
assert.ok(geoExplorer.includes(".tq-geo-search-sheet{transform:none !important;transition:none !important}"),'AI search panel must be fixed');
assert.ok(geoExplorer.includes('.tq-geo-sheet-handle,.tq-geo-sheet-expand{display:none !important}'),'search panel drag controls must be disabled');
assert.ok(!geoExplorer.includes('L.map('),'primary GEO canvas must not use Leaflet tiles');

assert.ok(geocoding.includes('export async function reverseGeocode'),'reverse geocoder missing');
assert.ok(geocoding.includes('PLACE_ALIASES'),'place alias resolver missing');
assert.ok(geocoding.includes('가야공원'),'park alias support missing');
assert.ok(geocoding.includes('사상역 번화가'),'commercial-area alias support missing');
assert.ok(travelService.includes('reverseGeocode'),'travel-service reverse geocoder facade missing');
assert.ok(travelService.includes('aiSearch'),'AI trip search service missing');

assert.ok(searchFlow.includes('initGeoExplorer'),'GEO explorer flow integration missing');
assert.ok(appController.includes("startTripSearch?.('gps')"),'GPS launch flow missing');
assert.ok(appController.includes("startTripSearch?.('manual')"),'manual launch flow missing');
assert.ok(app.includes('createTripStore()'),'trip store composition missing');
assert.ok(app.includes('createTravelService()'),'travel service composition missing');
assert.ok(tripStore.includes('const INITIAL_SECTIONS='),'structured trip state missing');
assert.ok(tripStore.includes('function resetJourney()'),'trip reset lifecycle missing');

assert.ok(searchCss.includes('.tq-geo-explorer'),'GEO explorer styles missing');
assert.ok(searchCss.includes('.tq-geo-target'),'GEO target styles missing');
assert.ok(productCss.includes('.tq-bottom-nav'),'bottom navigation styles missing');
assert.ok(landingCss.includes('.main-landing'),'landing styles missing');
assert.ok(sw.includes("const CACHE='trip-quest-v1.10.0-geo-canvas-20261003'"),'service worker GEO cache version missing');
assert.equal(manifest.display,'standalone','PWA display must be standalone');
assert.ok(Array.isArray(manifest.icons)&&manifest.icons.length>=2,'PWA icons missing');
assert.ok(chrome.includes("probe.src='./assets/tq-cover-main-v044.webp'"),'landing artwork preload missing');

console.log('TRIP QUEST v1.10 South Korea GEO canvas, fixed AI search panel, and PWA smoke tests passed');

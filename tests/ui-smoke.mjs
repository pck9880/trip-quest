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
const pixelCss=read('css/pixel.css');
const sw=read('sw.js');
const manifest=JSON.parse(read('manifest.webmanifest'));
const geoExplorer=read('js/ui/geo-explorer.js');
const geocoding=read('js/services/geocoding.js');
const travelService=read('js/services/travel-service.js');
const searchFlow=read('js/ui/search-flow.js');
const appController=read('js/controllers/app-controller.js');
const tripStore=read('js/store/trip-store.js');

for(const id of ['mainLanding','mainLocateBtn','mainManualBtn','tripExplorer','geoSearchSheet','geoStartLabel','geoStartQuickGps','geoStartChange','aiInput','aiSend','geoResults']){
  assert.ok(html.includes(`id="${id}"`),`required UI id missing: ${id}`);
}
for(const removed of ['geoCanvas','geoTarget','geoVector','geoJoystick','geoStickKnob','geoScanBtn','geoLocationPopup'])assert.ok(!html.includes(`id="${removed}"`),`map-game UI must be removed: ${removed}`);
assert.ok(html.includes('SEARCH QUEST'),'pixel search heading missing');
assert.ok(html.includes('어디로 떠나고 싶나요?'),'AI trip search title missing');
assert.ok(!html.includes('TRIP GEO')&&!html.includes('SCAN')&&!html.includes('TARGET LOCK'),'map-game copy must be removed');

assert.ok(geoExplorer.includes('const REGIONS=['),'17-region source missing');
assert.equal((geoExplorer.match(/\['[^']+','[^']+',\d/g)||[]).length,17,'all 17 first-level regions must be defined');
assert.ok(!geoExplorer.includes('const KOREA=')&&!geoExplorer.includes('installKoreaCanvas')&&!geoExplorer.includes('startStick')&&!geoExplorer.includes('scanTarget'),'map-game implementation must be removed');
assert.ok(geoExplorer.includes("gpsService.current({enableHighAccuracy:true,timeout:20000,maximumAge:0})"),'current-location flow must use fresh high-accuracy GPS');
assert.ok(geoExplorer.includes('tq-start-region-list'),'scrollable region picker missing');
assert.ok(geoExplorer.includes("displayRegion:r[0]"),'selected region must become START display region');
assert.ok(geoExplorer.includes('origin.displayRegion=cityLabel(origin)'),'GPS origin must resolve to a city/region START label');
assert.ok(geoExplorer.includes('tq-search-only-panel'),'clean search-only panel styles missing');
assert.ok(!geoExplorer.includes('L.map('),'search panel must not create a map');

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
assert.ok(geoExplorer.includes('.tq-search-only-panel'),'search-only layout style missing');
assert.ok(productCss.includes('.tq-bottom-nav'),'bottom navigation styles missing');
assert.ok(landingCss.includes('.main-landing'),'landing styles missing');
assert.ok(sw.includes("const CACHE='trip-quest-v1.15.0-board-match-20261003'"),'service worker v1.15.0 cache version missing');
assert.ok(sw.includes('./css/pixel.css?v=1500'),'pixel design system must be cached');
assert.equal(manifest.display,'standalone','PWA display must be standalone');
assert.ok(Array.isArray(manifest.icons)&&manifest.icons.length>=2,'PWA icons missing');
assert.ok(chrome.includes("probe.src='./assets/tq-pixel-night-drive-v114.svg'"),'redesigned pixel landing artwork preload missing');
assert.ok(html.includes('./assets/tq-pixel-night-drive-v114.svg'),'pixel cover preload missing');
assert.ok(pixelCss.includes('BOARD MATCH'),'pixel travel design system marker missing');
assert.ok(pixelCss.includes('tq-pixel-night-drive-v114.svg'),'pixel cover background missing');
assert.ok(pixelCss.includes('.tq-bottom-nav'),'bottom navigation pixel treatment missing');
assert.ok(pixelCss.includes('.tq-quest-island-main'),'mission HUD pixel treatment missing');
assert.ok(pixelCss.includes('.tq-setup-card'),'setup modal pixel treatment missing');

assert.ok(chrome.includes("footer.textContent='TRIP QUEST · v1.15.0'"),'chrome runtime version must match v1.15.0');
console.log('TRIP QUEST v1.15.0 board-match redesign, search, chrome, mission UI, GPS, recommendations, and PWA smoke tests passed');

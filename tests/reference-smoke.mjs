import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../site-src/',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const app=read('app.js');

const imports=[...app.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g)]
  .flatMap(match=>match[1].split(',').map(part=>part.trim().split(/\s+as\s+/).pop()));
const locals=[...app.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(match=>match[1]);

const modularSymbols=[
  'drawMap','drawRoute','focusMapPoint','invalidateMainMap',
  'drawCourseRoute','renderCourseActionButtons',
  'localRecommend','localAI','coursePack','geoKm','roadRoute',
  'clientWeather','localGeocode','activeVehicleProfile','estimateRoundTripToll',
  'placePopularity'
];

const unresolved=modularSymbols.filter(name=>{
  const used=new RegExp('\\b'+name+'\\s*\\(').test(app);
  return used&&!imports.includes(name)&&!locals.includes(name);
});
assert.deepEqual(unresolved,[],'unresolved modular function references in app.js: '+unresolved.join(', '));
assert.ok(!/\bdrawMap\s*\(/.test(app),'map rendering must stay behind search controller');
assert.ok(read('js/controllers/search-controller.js').includes("import { drawMap, drawRoute } from '../ui/main-map.js';"),'search controller must own main-map dependency');

console.log('TRIP QUEST v1.1.2 modular reference checks passed');

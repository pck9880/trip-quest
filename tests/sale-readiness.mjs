import fs from 'node:fs';
import assert from 'node:assert/strict';

const root=new URL('../',import.meta.url);
const site=new URL('../site-src/',import.meta.url);
const read=url=>fs.readFileSync(url,'utf8');

const requiredDocs=[
  'LICENSE.md','CHANGELOG.md',
  'docs/README.md','docs/BUYER_OVERVIEW.md','docs/ARCHITECTURE.md','docs/DEPLOYMENT.md',
  'docs/DATA.md','docs/THIRD_PARTY.md','docs/COMMERCIAL_READINESS.md',
  'docs/ASSET_PROVENANCE.md','docs/KNOWN_LIMITATIONS.md','docs/TRANSFER_CHECKLIST.md','docs/RELEASE_PROCESS.md'
];
for(const file of requiredDocs)assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),'sale-readiness document missing: '+file);

for(const legacy of ['deploy','site','index.html','manifest.webmanifest','sw.js']){
  assert.ok(!fs.existsSync(new URL('../'+legacy,import.meta.url)),'legacy root artifact must be removed: '+legacy);
}

const assets=fs.readdirSync(new URL('./assets/',site)).filter(x=>/^tq-cover-main-.*\.webp$/.test(x));
assert.deepEqual(assets,['tq-cover-main-v044.webp'],'only the active cover should remain');

const pkg=JSON.parse(read(new URL('../package.json',import.meta.url)));
assert.equal(pkg.version,'1.11.0');

const app=read(new URL('./app.js',site));
assert.ok(app.length<20000,'app.js should remain an orchestration entrypoint');
assert.ok(!app.includes("'/api/"),'fake API routes must not return');
assert.ok(!app.includes('OPENAI_API_KEY'),'static app must not include OpenAI secrets');

const thirdParty=read(new URL('../docs/THIRD_PARTY.md',import.meta.url));
for(const provider of ['Leaflet','OpenStreetMap','Nominatim','OSRM','Open-Meteo','Opinet']){
  assert.ok(thirdParty.includes(provider),'third-party disclosure missing: '+provider);
}
const commercial=read(new URL('../docs/COMMERCIAL_READINESS.md',import.meta.url));
assert.ok(commercial.includes('Open-Meteo Free API'),'commercial weather limitation must be disclosed');
const provenance=read(new URL('../docs/ASSET_PROVENANCE.md',import.meta.url));
assert.ok(provenance.includes('provenance should be confirmed'),'cover provenance disclosure missing');

console.log('TRIP QUEST v1.11.0 sale-readiness checks passed');

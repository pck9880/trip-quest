const CACHE='trip-quest-test-v1.9.4-pages-recovery-20261006';
const SHELL=['./js/ui/quest-selector.js','./js/data/selection-taxonomy.js','./selector.css?v=20261006-course1','./','./index.html','./auth.css?v=20261006-account-hidden','./phase1-pixel.css?v=20261006-phase1','./phase2-pixel.css?v=20261006-phase2','./phase3-world.css?v=20261006-phase3','./phase4-app-frame.css?v=20261006-phase4a','./phase5-final.css?v=20261006-phase5b','./cover-phase3-final.css?v=20261006-coverfinal3','./no-scroll-app.css?v=20261006-placescroll1','./js/ui/phase2-pixel.js?v=20261006-phase2','./js/ui/phase5-polish.js?v=20261006-phase5','./js/ui/no-scroll-app.js?v=20261006-course3fix1','./auth.js?v=20261006-course3fix1','./css/base.css?v=110','./css/product.css?v=112','./css/landing.css?v=20261006-titlefx2','./css/search.css?v=100','./app.js?v=20261006-course3fix1','./app-chrome.js?v=20261006-course3fix1','./assets/tq-cover-main-v044.webp?v=20261006-pixelcover1','./js/core/dom.js','./js/core/format.js','./js/data/ui-options.js','./js/domain/geo.js','./js/domain/schedule.js','./js/domain/trip-cost.js','./js/services/vehicle-settings.js','./js/services/routing.js','./js/services/weather.js','./js/services/live-place-search.js','./js/services/national-place-store.js','./data/national/runtime-manifest.json','./data/national/national-v2.part00.bin','./data/national/national-v2.part01.bin','./data/national/national-v2.part02.bin','./data/national/national-v2.part03.bin','./data/national/national-v2.part04.bin','./data/national/national-v2.part05.bin','./data/national/national-v2.part06.bin','./data/national/national-v2.part07.bin','./js/domain/course-planner.js','./js/domain/popularity.js','./js/ui/landing.js','./js/ui/wizard.js','./js/ui/results.js','./js/controllers/search-controller.js','./js/controllers/app-controller.js','./js/store/trip-store.js','./js/services/travel-service.js','./js/services/keep-service.js','./js/ui/keep-panel.js','./manifest.webmanifest','../icons/icon-192.png','../icons/icon-512.png','../icons/apple-touch-icon.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match('./index.html')));
    return;
  }
  e.respondWith(
    fetch(e.request,{cache:'no-store'}).then(r=>{
      const x=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,x));
      return r;
    }).catch(()=>caches.match(e.request))
  );
});

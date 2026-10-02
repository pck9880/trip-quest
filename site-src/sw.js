const CACHE='trip-quest-v1.2.0-my-page-20261002';
const SHELL=['./','./index.html','./css/base.css?v=110','./css/product.css?v=120','./css/landing.css?v=101','./css/search.css?v=100','./app.js?v=20261002-v120','./app-chrome.js?v=120','./assets/tq-cover-main-v044.webp','./js/core/dom.js','./js/core/format.js','./js/data/ui-options.js','./js/data/places.js','./js/data/recommendation-data.js','./js/data/course-data.js','./js/data/intent-rules.js','./js/domain/geo.js','./js/domain/schedule.js','./js/domain/trip-cost.js','./js/domain/recommendation.js','./js/domain/intent-parser.js','./js/services/vehicle-settings.js','./js/services/routing.js','./js/services/weather.js','./js/services/geocoding.js','./js/usecases/search-destinations.js','./js/domain/course-planner.js','./js/ui/main-map.js','./js/ui/course-map.js','./js/ui/time-controls.js','./js/ui/course-actions.js','./js/ui/landing.js','./js/ui/wizard.js','./js/ui/results.js','./js/controllers/search-controller.js','./js/controllers/origin-controller.js','./js/controllers/app-controller.js','./js/store/trip-store.js','./js/services/travel-service.js','./js/services/keep-service.js','./js/ui/keep-panel.js','./js/services/profile-service.js','./js/services/attendance-service.js','./js/services/history-service.js','./js/ui/my-page.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];

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

async function decorateNavigation(response){
  if(!response||!response.ok)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  let html=await response.text();
  html=html.replace(/\s*<link rel="stylesheet" href="\.\/(?:styles|app-chrome|landing-touch-fix)\.css\?v=[^"']+" \/>\s*/g,'\n');
  if(!html.includes('./css/base.css'))html=html.replace('</head>','  <link rel="stylesheet" href="./css/base.css?v=110" />\n  <link rel="stylesheet" href="./css/product.css?v=120" />\n  <link rel="stylesheet" href="./css/landing.css?v=101" />\n  <link rel="stylesheet" href="./css/search.css?v=100" />\n</head>');
  html=html.replace(/\.\/css\/base\.css\?v=[^"']+/g,'./css/base.css?v=110');
  html=html.replace(/\.\/css\/product\.css\?v=[^"']+/g,'./css/product.css?v=120');
  html=html.replace(/\.\/css\/landing\.css\?v=[^"']+/g,'./css/landing.css?v=101');
  html=html.replace(/\.\/css\/search\.css\?v=[^"']+/g,'./css/search.css?v=100');
  html=html.replace(/\.\/app\.js\?v=[^"']+/g,'./app.js?v=20261002-v120');
  html=html.replace(/\.\/app-chrome\.js\?v=[^"']+/g,'./app-chrome.js?v=120');
  if(!html.includes('app-chrome.js'))html=html.replace('</body>','  <script src="./app-chrome.js?v=120" defer></script>\n</body>');
  return new Response(html,{status:response.status,statusText:response.statusText,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  if(e.request.mode==='navigate'){
    e.respondWith((async()=>{
      try{return await decorateNavigation(await fetch(e.request,{cache:'no-store'}))}
      catch{
        const fallback=await caches.match('./index.html');
        return fallback?decorateNavigation(fallback):Response.error();
      }
    })());
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

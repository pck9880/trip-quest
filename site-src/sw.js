const CACHE='trip-quest-v0.46-simple-search-20261002';
const SHELL=['./','./index.html','./styles.css?v=20261002-1300','./app.js?v=20261002-1600','./app-chrome.css?v=046','./app-chrome.js?v=046','./landing-touch-fix.css?v=20261002-1300','./assets/tq-cover-main-v044.webp','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];

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
  html=html.replace(/\.\/styles\.css\?v=[^"']+/g,'./styles.css?v=20261002-1300');
  html=html.replace(/\.\/app\.js\?v=[^"']+/g,'./app.js?v=20261002-1600');
  html=html.replace(/\.\/app-chrome\.css\?v=[^"']+/g,'./app-chrome.css?v=046');
  html=html.replace(/\.\/app-chrome\.js\?v=[^"']+/g,'./app-chrome.js?v=046');
  html=html.replace(/\.\/landing-touch-fix\.css\?v=[^"']+/g,'./landing-touch-fix.css?v=20261002-1300');
  if(!html.includes('app-chrome.css'))html=html.replace('</head>','  <link rel="stylesheet" href="./app-chrome.css?v=046" />\n</head>');
  if(!html.includes('app-chrome.js'))html=html.replace('</body>','  <script src="./app-chrome.js?v=046" defer></script>\n</body>');
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

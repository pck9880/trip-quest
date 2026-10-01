const CACHE='trip-quest-v0.24-hotfix-20261002-0845';
const SHELL=['./','./index.html','./styles.css?v=20261002-0838','./app.js?v=20261002-0838','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
  await self.clients.claim();
  // iOS/Safari가 이전 app.js를 메모리에 유지하는 경우 새 서비스워커 활성화 직후
  // 열린 TRIP QUEST 화면을 한 번만 다시 탐색해 최신 HTML/JS로 교체한다.
  const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  await Promise.all(clients.map(c=>{
    try{
      const u=new URL(c.url);
      if(u.origin!==self.location.origin)return Promise.resolve();
      u.searchParams.set('_tqv','0240845');
      return c.navigate(u.href).catch(()=>{});
    }catch{return Promise.resolve()}
  }));
})()));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(
    fetch(e.request,{cache:'no-store'})
      .then(r=>{
        const x=r.clone();
        caches.open(CACHE).then(c=>c.put(e.request,x));
        return r;
      })
      .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
  );
});

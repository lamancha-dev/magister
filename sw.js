/* MAGISTER 4.5 — funciona sem Internet, mas vai SEMPRE buscar primeiro a versão mais recente. */
const CACHE='magister-v4-5';
const ASSETS=['./','./index.html','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./aejd-logo.png','./drive-sync.js','./fonte/poppins-magister.woff'];
self.addEventListener('install',event=>{
  // cache:'reload' obriga a ir ao servidor, em vez de usar cópias antigas guardadas pelo navegador
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(ASSETS.map(u=>fetch(new Request(u,{cache:'reload'})).then(r=>{if(r.ok)return cache.put(u,r)})))).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(
    fetch(new Request(req.url,{cache:'no-cache',credentials:'same-origin'})).then(response=>{
      if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(req,clone))}
      return response;
    }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('./index.html')))
  );
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c)return c.focus()}return self.clients.openWindow('./index.html')}));
});

const CACHE='bryggis-shell-v8-capacity-1';
const ASSETS=['./styles.css','./app.js','./domain.mjs','./icons.mjs','./app-icon.png','./signup-qr.png','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('bryggis-shell-')||k.startsWith('stammis-shell-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    const scope=new URL('./',self.location.href).pathname;
    if(![scope,scope+'index.html'].includes(url.pathname))return;
    event.respondWith(fetch(event.request).then(async response=>{
      if(response.ok&&(response.headers.get('content-type')||'').includes('text/html')){
        const copy=response.clone(),html=await copy.text();
        if(html.includes('name="bryggis-build" content="8"')){const cache=await caches.open(CACHE);await cache.put('./offline-shell',response.clone());}
      }
      return response;
    }).catch(async()=>await caches.match('./offline-shell')||new Response('Öppna Bryggis en gång med internet för att använda demon offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}})));
    return;
  }
  if(!ASSETS.some(p=>new URL(p,self.location.href).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request)));
});

const BUILD=11;
const CACHE=`bryggis-shell-v${BUILD}`;
const SHELL_KEY='./offline-shell';
const shellUrl=new URL('./',self.location.href);
const ASSETS=['./styles.css','./app.js','./domain.mjs','./icons.mjs','./bryggis-logo.png','./favicon.png','./app-icon.png','./app-icon-maskable.png','./signup-qr.png','./manifest.webmanifest'];

async function cacheShell(cache,response){
  if(!response.ok||!response.headers.get('content-type')?.includes('text/html'))return false;
  const html=await response.clone().text();
  if(!html.includes(`name="bryggis-build" content="${BUILD}"`))return false;
  await cache.put(SHELL_KEY,response.clone());
  return true;
}

self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    await cache.addAll(ASSETS);
    const response=await fetch(shellUrl,{cache:'reload'});
    if(!await cacheShell(cache,response))throw new Error('Bryggis startsida matchar inte den här versionen.');
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('bryggis-shell-')||k.startsWith('stammis-shell-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==shellUrl.origin)return;
  if(event.request.mode==='navigate'){
    if(![shellUrl.pathname,shellUrl.pathname+'index.html'].includes(url.pathname))return;
    event.respondWith(fetch(event.request).then(async response=>{
      await caches.open(CACHE).then(cache=>cacheShell(cache,response)).catch(()=>{});
      return response;
    }).catch(async()=>{
      const cache=await caches.open(CACHE);
      return await cache.match(SHELL_KEY)||new Response('Öppna Bryggis en gång med internet för att använda demon offline.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }));
    return;
  }
  if(!ASSETS.some(p=>new URL(p,shellUrl).pathname===url.pathname))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,clone));}return response;}).catch(()=>caches.match(event.request)));
});

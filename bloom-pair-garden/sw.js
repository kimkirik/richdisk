const APP_BASE="/richdisk/bloom-pair-garden/";
const CACHE='bloom-pair-static-v1';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Cache only public static files. HTML stays on the network for current releases.
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith(APP_BASE)||!/^\/(images|icons|assets)\//.test(url.pathname.slice(APP_BASE.length-1)))return;
 event.respondWith(fetch(event.request).then(response=>{if(response.ok&&response.type==='basic'){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)))}return response}).catch(async()=>{const saved=await caches.match(event.request);return saved||Response.error()}));
});

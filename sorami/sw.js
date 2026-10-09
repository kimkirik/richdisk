const CACHE='sorami-gh-static-66da4b0a2e40',DICTIONARY='sorami-gh-dictionary-v1';
const SHELL=['./','./index.html','./app-66da4b0a2e40.js','./app-66da4b0a2e40.css','./reading-worker.js','./freedom-icon.svg','./freedom-180.png','./freedom-192.png','./freedom-512.png','./freedom-maskable-512.png','./manifest.webmanifest','./privacy.html'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sorami-gh-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.location.href).pathname)||event.request.method!=='GET')return;
 if(url.pathname.endsWith('/thai-ipa-v1.json')||url.pathname.includes('/vendor/espeak-v0.1.2/')||url.pathname.endsWith('/english-dict-v1.json')||url.pathname.includes('/dict/')||url.pathname.endsWith('/vendor/kuromoji.js')){
  event.respondWith(caches.open(DICTIONARY).then(async cache=>{const hit=await cache.match(event.request);if(hit)return hit;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response;}));return;
 }
 if(event.request.mode!=='navigate'&&!/\.(js|css|svg|png|webmanifest|html)$/.test(url.pathname))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{try{const response=await fetch(event.request,{cache:'no-cache'});if(response.ok)await cache.put(event.request,response.clone());return response;}catch(error){const hit=await cache.match(event.request);if(hit)return hit;if(event.request.mode==='navigate')return cache.match('./index.html');throw error;}}));
});

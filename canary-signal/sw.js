const ROOT = new URL('./', self.location.href);
const PREFIX = `canary-signal:${ROOT.pathname}:`;
const CACHE = `${PREFIX}v2.1`;
const ASSETS = ['./', './index.html', './style.css?v=2.1', './app.js?v=2.1', './data.js?v=2.1', './manifest.webmanifest', './favicon.png', './canary-icon.png', './icon-192.png', './icon-512.png', './apple-touch-icon.png'].map(path => new URL(path, ROOT).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Never intercept other apps or cache live API responses.
  if (event.request.method !== 'GET' || url.origin !== ROOT.origin || !url.pathname.startsWith(ROOT.pathname)) return;
  if (event.request.mode === 'navigate' && [ROOT.pathname, `${ROOT.pathname}index.html`].includes(url.pathname)) {
    event.respondWith(fetch(event.request).then(response => {
      if (!response.ok) throw new Error('Navigation unavailable');
      return response;
    }).catch(() => caches.open(CACHE).then(cache => cache.match(ROOT.href))));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(cached => cached || fetch(event.request)));
  }
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(clients => {
    const client = clients.find(item => { const url = new URL(item.url); return url.origin === ROOT.origin && url.pathname.startsWith(ROOT.pathname); });
    return client ? client.focus() : self.clients.openWindow(ROOT.href);
  }));
});

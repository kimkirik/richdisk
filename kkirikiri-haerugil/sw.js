const APP_BASE = "/richdisk/kkirikiri-haerugil";
const CACHE_NAME = "kkirikiri-pages-shell-v1";
const STATIC_ASSETS = [
  `${APP_BASE}/`,
  `${APP_BASE}/calendar/`,
  `${APP_BASE}/manifest.webmanifest`,
  `${APP_BASE}/kkirikiri-icon-safe-v2-192.png`,
  `${APP_BASE}/kkirikiri-icon-safe-v2-512.png`,
  `${APP_BASE}/kkirikiri-icon-safe-v2-maskable-512.png`,
  `${APP_BASE}/apple-touch-icon-safe-v2.png`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = url.pathname.startsWith(`${APP_BASE}/assets/static/`)
    || url.pathname.startsWith(`${APP_BASE}/assets/`)
    || /\.(?:png|svg|ico|webmanifest|woff2?)$/i.test(url.pathname);

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok && response.type === "basic" && !response.headers.get("Cache-Control")?.includes("no-store")) {
          const copy = response.clone();
          return caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).then(() => response);
        }
        return response;
      })),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match(`${APP_BASE}/`))));
  }
});

const CACHE_PREFIX = "season-typing-garden-";
const CACHE_NAME = `${CACHE_PREFIX}2026-09-11-v2`;
const OFFLINE_URL = "/richdisk/season-typing-garden/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([
    OFFLINE_URL, "/richdisk/season-typing-garden/icons/icon-192.png", "/richdisk/season-typing-garden/icons/icon-512.png", "/richdisk/season-typing-garden/manifest.webmanifest",
  ])));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    // Always open the current live app; a cached sign-in or stale HTML is never substituted.
    event.respondWith(fetch(request).catch(async () => {
      const offline = await caches.match(OFFLINE_URL);
      // Static hosting may redirect .html URLs. Clear that redirect flag for navigation responses.
      if (offline) return new Response(offline.body, { status: offline.status, headers: offline.headers });
      return new Response("인터넷 연결 후 다시 열어 주세요.", {
        status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }));
  }
});

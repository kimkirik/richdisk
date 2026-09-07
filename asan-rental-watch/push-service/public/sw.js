const CACHE_NAME = "asan-rental-independent-v1";
const PUSH_API = new URL("api", self.registration.scope).href;
const BASE_URL = new URL("./", self.registration.scope);
const APP_URL = BASE_URL.href;
const DATA_URL = new URL("data/notices.json", BASE_URL);
const ICON_URL = new URL("icon-192.png", BASE_URL).href;
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([APP_URL, new URL("manifest.webmanifest", BASE_URL).href, ICON_URL])).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("asan-rental-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("push", event => {
  event.waitUntil((async () => {
    let payload;
    try { payload = event.data?.json(); } catch { payload = null; }
    const title = typeof payload?.title === "string" ? payload.title.slice(0, 160) : "아산집 알리미";
    const body = typeof payload?.body === "string" ? payload.body.slice(0, 1000) : "앱을 열어 새 공고를 확인해 주세요.";
    await self.registration.showNotification(title, {
      body, icon: ICON_URL, badge: ICON_URL,
      tag: typeof payload?.eventId === "string" ? "asan-push:" + payload.eventId : "asan-push",
      renotify: false, requireInteraction: true, vibrate: [200, 100, 200],
      data: { url: APP_URL }, actions: [{ action: "open", title: "공고 확인" }],
    });
    if (payload?.deviceId && payload?.eventId && payload?.receiptToken) {
      // A receipt means showNotification completed, not that the person read it.
      try { await fetch(PUSH_API + "/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ deviceId: payload.deviceId, eventId: payload.eventId, receiptToken: payload.receiptToken }), signal: AbortSignal.timeout(10000) }); } catch { /* The notification remains visible even when receipt delivery fails. */ }
    }
  })());
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clients => {
    const existing = clients.find(client => client.url.startsWith(APP_URL) && "focus" in client);
    return existing ? existing.focus() : self.clients.openWindow(APP_URL);
  }));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== BASE_URL.origin || !url.pathname.startsWith(BASE_URL.pathname) || url.pathname === DATA_URL.pathname || url.pathname.startsWith(new URL("api/", BASE_URL).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const key = event.request.mode === "navigate" ? APP_URL : event.request;
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(key, response.clone());
      return response;
    } catch {
      return await cache.match(key) || new Response("오프라인입니다. 연결 후 다시 열어 주세요.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
    }
  })());
});

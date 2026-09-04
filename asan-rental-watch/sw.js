const CACHE_NAME = "asan-rental-shell-v3";
const STATE_CACHE = "asan-rental-notice-state-v2";
const BASE_URL = new URL("./", self.registration.scope);
const STATE_URL = new URL("__asan-rental-known-notices__", BASE_URL).href;
const APP_URL = BASE_URL.href;
const DATA_URL = new URL("data/notices.json", BASE_URL);
const ICON_URL = new URL("icon-192.png", BASE_URL).href;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll([APP_URL, new URL("manifest.webmanifest", BASE_URL).href, ICON_URL]),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("asan-rental-shell-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function readKnownIds() {
  const cache = await caches.open(STATE_CACHE);
  const response = await cache.match(STATE_URL);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function saveKnownIds(ids) {
  const cache = await caches.open(STATE_CACHE);
  await cache.put(
    STATE_URL,
    new Response(JSON.stringify(Array.from(new Set(ids)).slice(-100)), {
      headers: { "Content-Type": "application/json" },
    }),
  );
}

async function checkForNotices() {
  const requestUrl = new URL(DATA_URL);
  requestUrl.searchParams.set("t", String(Date.now()));
  const response = await fetch(requestUrl, { cache: "no-store" });
  if (!response.ok) return;
  const data = await response.json();
  const notices = Array.isArray(data.notices) ? data.notices : [];
  const ids = notices.map((notice) => notice.alertKey || notice.id).filter(Boolean);
  const known = await readKnownIds();

  if (!known) {
    await saveKnownIds(ids);
    return;
  }

  const additions = notices.filter((notice) => !known.includes(notice.alertKey || notice.id));
  await saveKnownIds([...known, ...ids]);

  await Promise.all(
    additions.slice(0, 3).map((notice) =>
      self.registration.showNotification("아산 임대주택 새 공고", {
        body: notice.title,
        icon: ICON_URL,
        badge: ICON_URL,
        tag: "asan-rental-" + (notice.alertKey || notice.id),
        data: { url: notice.url || "/" },
      }).catch(() => undefined),
    ),
  );
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SEED_NOTICE_IDS" && Array.isArray(event.data.ids)) {
    event.waitUntil(saveKnownIds(event.data.ids));
  }
  if (event.data?.type === "CHECK_NOW") {
    event.waitUntil(checkForNotices());
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "asan-rental-notice-check") {
    event.waitUntil(checkForNotices());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || APP_URL;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => "focus" in client);
      if (existing && target === APP_URL) return existing.focus();
      return self.clients.openWindow(target);
    }),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("/", clone));
          return response;
        })
        .catch(() => caches.match(APP_URL)),
    );
  }
});

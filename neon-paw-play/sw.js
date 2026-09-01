"use strict";

const CACHE_NAME = "neon-paw-play-v1";
const SCOPE_URL = self.registration.scope;
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./icons/paw-192.png",
  "./icons/paw-512.png",
  "./icons/paw-maskable-512.png",
  "./icons/apple-touch-icon.png"
].map((path) => new URL(path, SCOPE_URL).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith("neon-paw-play-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(SCOPE_URL, copy)));
          }
          return response;
        })
        .catch(async () =>
          (await caches.match(request)) ||
          (await caches.match(SCOPE_URL)) ||
          new Response("오프라인 상태예요. 인터넷 연결 후 다시 열어주세요.", {
            status: 503,
            headers: { "content-type": "text/plain; charset=utf-8" }
          })
        )
    );
    return;
  }

  if (["style", "script", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
            }
            return response;
          })
          .catch(() => cached || new Response("Offline", { status: 503, statusText: "Offline" }));
        return cached || network;
      })
    );
  }
});

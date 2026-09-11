self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const diary = event.notification.data?.type === "diary";
      const openClient = clients.find((client) => client.url.startsWith(self.registration.scope) && "focus" in client);
      if (openClient) {
        if (diary) openClient.postMessage({ type: "healthy-pet:open-today" });
        return openClient.focus();
      }
      return self.clients.openWindow(new URL(diary ? "./?diary=today" : "./", self.registration.scope).href);
    }),
  );
});

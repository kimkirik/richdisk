const APP_BASE="/richdisk/paw-village-rescue/";
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data?.json() || {}; } catch { /* Display the default reminder. */ }
  event.waitUntil(self.registration.showNotification(data.title || '아이들이 울고 있어요 🐶', {
    body: data.body || '보호소로 돌아와 아이들을 돌봐 주세요.',
    tag: data.tag === 'paw-test' ? 'paw-test' : 'paw-missing-you',
    icon: '/richdisk/paw-village-rescue/favicon.svg',
    data: { url: '/richdisk/paw-village-rescue/' },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && new URL(client.url).pathname.startsWith(APP_BASE)) { await client.focus(); return; }
    }
    await self.clients.openWindow(APP_BASE);
  })());
});

importScripts(new URL('signal-alerts.js', self.registration.scope).toString());
const PUBLIC_API_ORIGIN = 'https://global-shock-tracker.kimkirik.chatgpt.site';
async function checkMarketSignal(kind) {
  if (!ShockAlerts.KINDS.includes(kind)) return;
  const base = self.registration.scope;
  const cache = await caches.open(ShockAlerts.CACHE);
  const enabled = await cache.match(new URL(`__market_signal_alert_enabled__/${kind}`, base).toString());
  if (!enabled || await enabled.text() !== 'on') return;
  const endpoint = new URL('/api/market-signals', PUBLIC_API_ORIGIN);
  endpoint.searchParams.set('client', 'github-pages-v1');
  endpoint.searchParams.set('signals', '3');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
    if (!response.ok) return;
    await ShockAlerts.send(kind, await response.json(), self.registration, base);
  } catch {} finally { clearTimeout(timer); }
}
self.addEventListener('periodicsync', event => {
  const kind = event.tag === 'gold-signal-check' ? 'gold' : event.tag.replace('market-signal-', '');
  if (ShockAlerts.KINDS.includes(kind)) event.waitUntil(checkMarketSignal(kind));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const scope = new URL(self.registration.scope);
  let candidate;
  try { candidate = new URL(event.notification.data?.url || '#gold-signal', scope); } catch { candidate = scope; }
  const target = candidate.origin === scope.origin && candidate.pathname.startsWith(scope.pathname) ? candidate.toString() : new URL('#gold-signal',scope).toString();
  event.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(clients => {
    const existing = clients.find(client => client.url.startsWith(scope.toString()));
    return existing ? existing.focus().then(() => existing.navigate(target)) : self.clients.openWindow(target);
  }));
});
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

// Encrypted Web Push wakes the worker even when no page is open.
self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let message;try {message=event.data?.json();}catch{}
    const base=self.registration.scope;
    const safe=message?.version===1 && (ShockAlerts.KINDS.includes(message.kind) || message.kind==='test') && typeof message.title==='string' && typeof message.body==='string';
    const title=safe?message.title.slice(0,160):'투자 신호 알림';
    const body=safe?message.body.slice(0,2600):'사이트에서 최신 신호와 알림 연결 상태를 확인해주세요.';
    let url=new URL('#gold-signal',base);
    if(safe)try{const target=new URL(message.url);if(target.origin===url.origin && target.pathname.startsWith(new URL(base).pathname))url=target;}catch{}
    const cache=await caches.open(ShockAlerts.CACHE);
    const id=safe && typeof message.id==='string' ? message.id.slice(0,250) : String(Date.now());
    const receipt=new URL('__market_signal_last_push__',base).toString();
    const previous=await cache.match(receipt);let last;try{last=await previous?.json();}catch{}
    if(last?.id===id)return;
    await self.registration.showNotification(title,{body,icon:new URL('shockwave-app-icon-192.png',base).toString(),badge:new URL('shockwave-app-icon-192.png',base).toString(),tag:`shock-push-${safe?message.kind:'notice'}`,data:{url:url.toString()},renotify:true});
    await cache.put(receipt,new Response(JSON.stringify({id,at:new Date().toISOString(),title})));
  })());
});

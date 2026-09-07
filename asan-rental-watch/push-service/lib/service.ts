import { buildPushPayload, type PushSubscription } from '@block65/webcrypto-web-push';
import { APP_URL, buildAlerts, validSnapshot, day, type Alert } from './alerts.ts';
export type Bindings = { DB: D1Database; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string };
type Device = { id: string; token_hash: string; subscription: string };
type EventRow = { id: string; title: string; body: string; expires_at: number };
const UPSTREAM = 'https://raw.githubusercontent.com/kimkirik/richdisk/main/asan-rental-watch/data/notices.json';
const bytes = (value: string) => new TextEncoder().encode(value);
export async function hash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes(value)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function receiptToken(env: Bindings, device: string, event: string) {
  const key = await crypto.subtle.importKey('raw', bytes(env.VAPID_PRIVATE_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes(device + ':' + event)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function getState(env: Bindings, key: string) {
  const row = await env.DB.prepare('SELECT value FROM state WHERE key=?').bind(key).first<{ value: string }>();
  return row ? JSON.parse(row.value) : null;
}
async function setState(env: Bindings, key: string, value: unknown) {
  await env.DB.prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, JSON.stringify(value)).run();
}
export async function throttle(env: Bindings, key: string, interval: number) {
  const now = Date.now();
  return !!await env.DB.prepare('INSERT INTO state(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value WHERE CAST(state.value AS INTEGER) < ? RETURNING key').bind(key, String(now), now - interval).first();
}
export async function authDevice(env: Bindings, request: Request) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return env.DB.prepare('SELECT * FROM devices WHERE token_hash=?').bind(await hash(token)).first<Device>();
}
export async function putEvent(env: Bindings, alert: Alert) {
  await env.DB.prepare('INSERT OR IGNORE INTO events(id,title,body,created_at,expires_at,audience) VALUES(?,?,?,?,?,?)')
    .bind(alert.id, alert.title, alert.body, alert.createdAt, alert.expiresAt, alert.audience || null).run();
}
export async function deliver(env: Bindings, device: Device, event: EventRow) {
  const now = Date.now();
  const lease = await env.DB.prepare('INSERT INTO deliveries(device_id,event_id,attempts,next_attempt_at) VALUES(?,?,1,?) ON CONFLICT(device_id,event_id) DO UPDATE SET attempts=deliveries.attempts+1,next_attempt_at=excluded.next_attempt_at WHERE deliveries.sent_at IS NULL AND deliveries.next_attempt_at<=? RETURNING attempts')
    .bind(device.id, event.id, now + 120000, now).first<{ attempts: number }>();
  if (!lease) return 'skipped';
  try {
    const request = await buildPushPayload({ data: { eventId: event.id, deviceId: device.id, title: event.title, body: event.body, url: APP_URL,
      receiptToken: await receiptToken(env, device.id, event.id) }, options: { ttl: Math.max(1, Math.min(86400, Math.floor((event.expires_at - now) / 1000))), urgency: 'high' } },
    JSON.parse(device.subscription) as PushSubscription, { subject: APP_URL, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
    // Workers supports manual redirects; any 3xx is rejected below without forwarding push credentials.
    const response = await fetch(JSON.parse(device.subscription).endpoint, { ...request, redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (response.status === 404 || response.status === 410) {
      await env.DB.prepare('DELETE FROM devices WHERE id=?').bind(device.id).run();
      return 'expired';
    }
    if (!response.ok) throw new Error('push-http-' + response.status);
    await env.DB.prepare('UPDATE deliveries SET sent_at=?,last_error=NULL WHERE device_id=? AND event_id=?').bind(Date.now(), device.id, event.id).run();
    return 'accepted';
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown-error';
    const safeDetail = detail.split(env.VAPID_PRIVATE_KEY || '[unset]').join('[secret]').replace(/https?:\/\/\S+/g, '[endpoint]').slice(0, 240);
    const message = error instanceof Error && /^push-http-\d+$/.test(error.message) ? error.message : 'push-runtime: ' + safeDetail;
    console.error('Web Push delivery failed', { provider: new URL(JSON.parse(device.subscription).endpoint).hostname, error: message });
    await env.DB.prepare('UPDATE deliveries SET next_attempt_at=?,last_error=? WHERE device_id=? AND event_id=?')
      .bind(now + Math.min(3600000, 60000 * 2 ** Math.min(lease.attempts, 6)), message, device.id, event.id).run();
    return 'retrying';
  }
}
export async function acknowledge(env: Bindings, data: { deviceId?: string; eventId?: string; receiptToken?: string }) {
  if (!data.deviceId || !data.eventId || !data.receiptToken || data.eventId.length > 1000) return false;
  const expected = await receiptToken(env, data.deviceId, data.eventId);
  if (expected.length !== data.receiptToken.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ data.receiptToken.charCodeAt(i);
  if (diff) return false;
  await env.DB.prepare('UPDATE deliveries SET received_at=? WHERE device_id=? AND event_id=?').bind(Date.now(), data.deviceId, data.eventId).run();
  return true;
}
export async function tick(env: Bindings) {
  if (!await throttle(env, 'tick-lock', 60000)) return { status: 'already-checked' };
  const now = Date.now();
  let health: Record<string, unknown>;
  try {
    const response = await fetch(UPSTREAM + '?t=' + now, { cache: 'no-store', signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('upstream-http');
    const snapshot = await response.json();
    if (!validSnapshot(snapshot) || Date.parse(snapshot.checkedAt) > now + 300000) throw new Error('invalid-data');
    const stale = now - Date.parse(snapshot.checkedAt) > 90 * 60000;
    health = { checkedAt: new Date(now).toISOString(), dataCheckedAt: snapshot.checkedAt, stale, healthySourceCount: snapshot.healthySourceCount, sourceCount: snapshot.sourceCount };
    if (!stale) {
      const next = buildAlerts(snapshot, await getState(env, 'known'), now);
      for (const alert of next.alerts) await putEvent(env, alert);
      await setState(env, 'known', next.known);
    }
    if (stale || snapshot.healthySourceCount < snapshot.sourceCount) await putEvent(env, {
      id: 'health:' + day(now), title: '아산집 알리미 · 공고 확인 지연', body: '일부 공식 사이트 확인이 지연되고 있어요. 앱에서 마지막 확인 시각과 공식 공고를 확인해 주세요.', createdAt: now, expiresAt: now + 86400000,
    });
  } catch {
    health = { checkedAt: new Date(now).toISOString(), error: '공고 데이터를 확인하지 못했습니다', stale: true };
    await putEvent(env, { id: 'health:' + day(now), title: '아산집 알리미 · 공고 확인 지연', body: '자동 확인이 지연되고 있어요. 앱에서 공식 사이트를 확인해 주세요.', createdAt: now, expiresAt: now + 86400000 });
  }
  await setState(env, 'health', health);
  if (health.stale === false && health.healthySourceCount === health.sourceCount) {
    // Do not send an old outage warning to a newly registered device after recovery.
    await env.DB.prepare("UPDATE events SET expires_at=? WHERE id LIKE 'health:%' AND expires_at>?").bind(now, now).run();
  }
  const pending = await env.DB.prepare('SELECT d.id AS device_id,e.id AS event_id FROM devices d JOIN events e ON (e.audience IS NULL OR e.audience=d.id) LEFT JOIN deliveries l ON l.device_id=d.id AND l.event_id=e.id WHERE e.expires_at>? AND l.sent_at IS NULL AND COALESCE(l.next_attempt_at,0)<=? ORDER BY COALESCE(l.next_attempt_at,0),e.created_at LIMIT 200').bind(now, now).all<{ device_id: string; event_id: string }>();
  const counts: Record<string, number> = {};
  for (let i = 0; i < pending.results.length; i += 8) {
    await Promise.all(pending.results.slice(i, i + 8).map(async row => {
      const device = await env.DB.prepare('SELECT * FROM devices WHERE id=?').bind(row.device_id).first<Device>();
      const event = await env.DB.prepare('SELECT * FROM events WHERE id=?').bind(row.event_id).first<EventRow>();
      if (device && event) { const result = await deliver(env, device, event); counts[result] = (counts[result] || 0) + 1; }
    }));
  }
  await setState(env, 'lastDelivery', { at: new Date().toISOString(), ...counts });
  return { status: 'checked', ...health, delivery: counts };
}

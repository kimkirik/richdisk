import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createECDH, hkdfSync, createDecipheriv } from 'node:crypto';
import { buildAlerts, validateSubscription } from '../server/alerts.ts';
import { acknowledge, deliver, hash, putEvent, throttle, tick, type Bindings } from '../server/service.ts';

const now = Date.parse('2026-09-07T12:00:00+09:00');
const n = { id: 'a', title: '아산 공고', alertKey: 'a:v1', applicationStartAt: '2026-09-07T10:00:00+09:00', applicationEndAt: '2026-09-09T16:00:00+09:00' };
const snapshot = { checkedAt: new Date(now).toISOString(), notices: [n], healthySourceCount: 5, sourceCount: 5 };
test('baseline, changed notices and exact Korean deadlines', () => {
  assert.equal(buildAlerts(snapshot, null, now).alerts.filter(a => a.id.startsWith('notice')).length, 0);
  assert.equal(buildAlerts(snapshot, [], now).alerts.length, 2);
  assert.equal(buildAlerts(snapshot, ['a:v1'], now).alerts.length, 1);
  const deadline = buildAlerts(snapshot, ['a:v1'], Date.parse('2026-09-09T15:59:00+09:00')).alerts;
  assert.equal(deadline[0].title, '오늘 신청 마감 · 아산집 알리미');
  assert.equal(buildAlerts(snapshot, [], Date.parse('2026-09-09T16:01:00+09:00')).alerts.length, 0);
  assert.equal(buildAlerts({ ...snapshot, notices: [{ ...n, needsVerification: true }] }, [], now).alerts.length, 0);
});
test('more than three new notices all enter the queue', () => {
  const notices = Array.from({ length: 12 }, (_, i) => ({ id: String(i), title: '공고 ' + i }));
  assert.equal(buildAlerts({ ...snapshot, notices }, [], now).alerts.length, 12);
});
function fixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
  const prepare = (sql: string, args: unknown[] = []): any => ({
    bind: (...values: unknown[]) => prepare(sql, values),
    first: async () => db.prepare(sql).get(...args as any[]) || null,
    all: async () => ({ results: db.prepare(sql).all(...args as any[]) }),
    run: async () => db.prepare(sql).run(...args as any[]),
  });
  const vapid = createECDH('prime256v1'); vapid.generateKeys();
  const receiver = createECDH('prime256v1'); receiver.generateKeys();
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/test-device', expirationTime: null, keys: { p256dh: receiver.getPublicKey().toString('base64url'), auth: Buffer.from(auth).toString('base64url') } };
  const env = { APP_URL: 'https://asan.example/', DB: { prepare }, VAPID_PUBLIC_KEY: vapid.getPublicKey().toString('base64url'), VAPID_PRIVATE_KEY: vapid.getPrivateKey().toString('base64url') } as unknown as Bindings;
  return { db, env, subscription, receiver, auth };
}
test('reject arbitrary hosts, credentials and malformed subscription keys', () => {
  const { subscription } = fixture();
  assert.equal(validateSubscription(subscription), true);
  assert.equal(validateSubscription({ ...subscription, endpoint: 'https://web.push.apple.com/test-device' }), true);
  for (const endpoint of ['https://127.0.0.1/api', 'https://fcm.googleapis.com.evil.test/x', 'http://fcm.googleapis.com/x', 'https://user:pass@fcm.googleapis.com/x']) assert.equal(validateSubscription({ ...subscription, endpoint }), false);
  assert.equal(validateSubscription({ ...subscription, keys: { auth: 'bad', p256dh: 'bad' } }), false);
});
test('source recovery cancels queued outage warnings without losing notice history', async () => {
  const { db, env } = fixture(), oldFetch = globalThis.fetch;
  const current = { ...snapshot, checkedAt: new Date().toISOString(), notices: [{ id: 'active', title: '아산 수시모집' }] };
  try {
    db.prepare('INSERT INTO state(key,value) VALUES(?,?)').run('snapshot', JSON.stringify({ ...current, healthySourceCount: 4 }));
    await tick(env);
    assert.equal(db.prepare("SELECT count(*) AS n FROM events WHERE id LIKE 'health:%' AND expires_at>?").get(Date.now())!.n, 1);
    db.prepare("UPDATE state SET value='0' WHERE key='tick-lock'").run();
    db.prepare('UPDATE state SET value=? WHERE key=?').run(JSON.stringify(current), 'snapshot');
    await tick(env);
    assert.equal(db.prepare("SELECT count(*) AS n FROM events WHERE id LIKE 'health:%' AND expires_at>?").get(Date.now())!.n, 0);
    assert.match(String(db.prepare("SELECT value FROM state WHERE key='known'").get()!.value), /active/);
  } finally { globalThis.fetch = oldFetch; db.close(); }
});
test('durable delivery, encrypted payload receipt, duplicate suppression and retry', async () => {
  const { db, env, subscription, receiver, auth } = fixture();
  const device = { id: 'device', token_hash: await hash('token'), subscription: JSON.stringify(subscription) };
  db.prepare('INSERT INTO devices VALUES(?,?,?,?,?)').run(device.id, device.token_hash, device.subscription, now, now);
  const alert = { id: 'test:event', title: '시험 알림', body: '안드로이드 테스트', createdAt: Date.now(), expiresAt: Date.now() + 3600000 };
  await putEvent(env, alert);
  const event = { ...alert, expires_at: alert.expiresAt };
  const oldFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(init?.redirect, 'manual', 'Cloudflare Workers must reject redirects without unsupported redirect:error');
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('Content-Encoding'), 'aes128gcm');
    assert.ok(headers.get('Authorization')?.startsWith('vapid '));
    const body = Buffer.from(init!.body as ArrayBuffer);
    const salt = body.subarray(0, 16), publicKey = body.subarray(21, 21 + body[20]);
    const shared = receiver.computeSecret(publicKey);
    const info = Buffer.concat([Buffer.from('WebPush: info\0'), receiver.getPublicKey(), publicKey]);
    const ikm = hkdfSync('sha256', shared, auth, info, 32);
    const cek = hkdfSync('sha256', Buffer.from(ikm), salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16);
    const nonce = hkdfSync('sha256', Buffer.from(ikm), salt, Buffer.from('Content-Encoding: nonce\0'), 12);
    const encrypted = body.subarray(21 + body[20]);
    const decipher = createDecipheriv('aes-128-gcm', Buffer.from(cek), Buffer.from(nonce));
    decipher.setAuthTag(encrypted.subarray(-16));
    const plain = Buffer.concat([decipher.update(encrypted.subarray(0, -16)), decipher.final()]);
    const payload = JSON.parse(plain.subarray(0, plain.lastIndexOf(2)).toString());
    assert.equal(payload.body, alert.body);
    assert.equal(await acknowledge(env, { ...payload, receiptToken: '0'.repeat(64) }), false);
    assert.equal(await acknowledge(env, payload), true);
    return new Response('', { status: 201 });
  };
  try {
    assert.equal(await deliver(env, device, event), 'accepted');
    assert.equal(await deliver(env, device, event), 'skipped');
    assert.equal(calls, 1);
    const row = db.prepare('SELECT * FROM deliveries').get()!;
    assert.ok(row.sent_at); assert.ok(row.received_at);
    globalThis.fetch = async () => new Response('', { status: 307, headers: { Location: 'https://example.com/' } });
    assert.equal(await deliver(env, device, { ...event, id: 'redirect' }), 'retrying');
    assert.equal(db.prepare('SELECT sent_at FROM deliveries WHERE event_id=?').get('redirect')!.sent_at, null);
    globalThis.fetch = async () => new Response('', { status: 503 });
    const retry = { ...event, id: 'retry' };
    assert.equal(await deliver(env, device, retry), 'retrying');
    assert.equal(await deliver(env, device, retry), 'skipped');
    db.prepare('UPDATE deliveries SET next_attempt_at=0 WHERE event_id=?').run('retry');
    globalThis.fetch = async () => new Response('', { status: 410 });
    assert.equal(await deliver(env, device, retry), 'expired');
    assert.equal(db.prepare('SELECT count(*) AS n FROM devices').get()!.n, 0);
    assert.equal(await throttle(env, 'lock', 60000), true);
    assert.equal(await throttle(env, 'lock', 60000), false);
  } finally { globalThis.fetch = oldFetch; db.close(); }
});

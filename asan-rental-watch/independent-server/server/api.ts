import { validateSubscription } from './alerts.ts';
import { acknowledge, authDevice, deliver, getState, hash, putEvent, throttle, tick, type Bindings } from './service.ts';
const origins = new Set(['https://asan-rental-push.kimkirik.chatgpt.site', 'http://localhost:5173']);
function reply(request: Request, data: unknown, status = 200) {
  const origin = request.headers.get('Origin') || '';
  const sameOrigin = origin === new URL(request.url).origin;
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'Vary': 'Origin',
    ...(sameOrigin || origins.has(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
export async function OPTIONS(request: Request) { return reply(request, {}); }
export async function handle(request: Request, e: Bindings) {
  const action = new URL(request.url).pathname.split('/').pop();
  try {
    if (request.headers.get('Origin') && request.headers.get('Origin') !== new URL(e.APP_URL).origin && !origins.has(request.headers.get('Origin')!)) return reply(request, { error: 'origin-not-allowed' }, 403);
    if (request.method === 'GET' && action === 'config') return reply(request, { publicKey: e.VAPID_PUBLIC_KEY, senderReady: !!e.VAPID_PUBLIC_KEY && !!e.VAPID_PRIVATE_KEY, health: await getState(e, 'health'), platform: 'android', pollMinutes: 30, automaticMonitoring: true });
    if (request.method === 'POST' && action === 'tick') return reply(request, await tick(e));
    if (request.method === 'POST' && action === 'subscribe') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
      const raw = await request.text();
      if (raw.length > 10000 || !/^[a-f0-9]{64}$/.test(token)) return reply(request, { error: 'invalid-registration' }, 400);
      const subscription = JSON.parse(raw);
      if (!validateSubscription(subscription)) return reply(request, { error: 'invalid-subscription' }, 400);
      const tokenHash = await hash(token), id = await hash(subscription.endpoint);
      const existing = await e.DB.prepare('SELECT token_hash FROM devices WHERE id=?').bind(id).first<{ token_hash: string }>();
      if (existing && existing.token_hash !== tokenHash) return reply(request, { error: 'device-token-mismatch' }, 409);
      const ipHash = await hash(request.headers.get('CF-Connecting-IP') || 'unknown');
      if (!existing && !await throttle(e, 'register:' + ipHash, 10000)) return reply(request, { error: 'try-later' }, 429);
      const now = Date.now();
      await e.DB.prepare('INSERT INTO devices(id,token_hash,subscription,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription,updated_at=excluded.updated_at').bind(id, tokenHash, JSON.stringify(subscription), now, now).run();
      return reply(request, { id, connected: true });
    }
    if (request.method === 'POST' && action === 'receipt') {
      const raw = await request.text();
      if (raw.length > 4000) return reply(request, { error: 'invalid-receipt' }, 400);
      const ok = await acknowledge(e, JSON.parse(raw));
      return reply(request, { received: ok }, ok ? 200 : 403);
    }
    const device = await authDevice(e, request);
    if (!device) return reply(request, { error: 'device-not-connected' }, 401);
    if (request.method === 'GET' && action === 'device') {
      const receipts = await e.DB.prepare('SELECT e.id,e.title,l.sent_at,l.received_at,l.last_error FROM events e JOIN deliveries l ON l.event_id=e.id WHERE l.device_id=? ORDER BY e.created_at DESC LIMIT 10').bind(device.id).all();
      return reply(request, { connected: true, id: device.id, receipts: receipts.results, health: await getState(e, 'health') });
    }
    if (request.method === 'DELETE' && action === 'device') {
      await e.DB.batch([e.DB.prepare('DELETE FROM devices WHERE id=?').bind(device.id), e.DB.prepare('DELETE FROM deliveries WHERE device_id=?').bind(device.id)]);
      return reply(request, { connected: false });
    }
    if (request.method === 'POST' && action === 'test') {
      if (!await throttle(e, 'test:' + device.id, 30000)) return reply(request, { error: '30초 뒤 다시 시험해 주세요' }, 429);
      const now = Date.now(), id = 'test:' + crypto.randomUUID();
      const event = { id, title: '아산집 알리미 · 시험 알림', body: '이 기기의 알림 연결을 확인했어요. 신규·중요 변경 공고와 신청 일정을 이 앱에서 알려드릴게요.', createdAt: now, expiresAt: now + 3600000, audience: device.id };
      await putEvent(e, event);
      const status = await deliver(e, device, { ...event, expires_at: event.expiresAt });
      return reply(request, { eventId: id, status, ...(status === 'accepted' ? {} : { error: status === 'expired' ? '기기 알림 연결이 만료됐습니다. 알림을 다시 연결해 주세요.' : '시험 알림을 발송하지 못했습니다. 서버가 재시도하며, 기기에 표시되기 전에는 수신 확인이 완료되지 않습니다.' }) }, status === 'accepted' ? 200 : 503);
    }
    return reply(request, { error: 'not-found' }, 404);
  } catch { return reply(request, { error: '알림 서버 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, 500); }
}

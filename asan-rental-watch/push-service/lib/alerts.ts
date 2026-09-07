export type Notice = { id: string; title: string; alertKey?: string; status?: string; archivedAt?: string; needsVerification?: boolean; applicationStartAt?: string; applicationEndAt?: string; closeAt?: string };
export type Snapshot = { checkedAt: string; notices: Notice[]; healthySourceCount: number; sourceCount: number };
export type Alert = { id: string; title: string; body: string; createdAt: number; expiresAt: number; audience?: string };
export const APP_URL = 'https://kimkirik.github.io/richdisk/asan-rental-watch/';
export const day = (time: number) => new Date(time + 9 * 3600000).toISOString().slice(0, 10);
export const endTime = (n: Notice) => n.applicationEndAt ? Date.parse(n.applicationEndAt) : n.closeAt ? Date.parse(n.closeAt + 'T23:59:59.999+09:00') : Infinity;
export function validSnapshot(value: unknown): value is Snapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Snapshot;
  return Number.isFinite(Date.parse(s.checkedAt)) && Array.isArray(s.notices) && s.notices.length <= 5000 &&
    Number.isInteger(s.healthySourceCount) && Number.isInteger(s.sourceCount) && s.sourceCount > 0 &&
    s.notices.every(n => typeof n.id === 'string' && typeof n.title === 'string' && n.title.length < 4000);
}
export function buildAlerts(snapshot: Snapshot, known: string[] | null, now: number) {
  const alerts: Alert[] = [];
  const active = snapshot.notices.filter(n => !n.archivedAt && !/마감|취소|종료/.test(n.status || '') && endTime(n) >= now);
  const keys = active.filter(n => !n.needsVerification).map(n => n.alertKey || n.id);
  const add = (id: string, title: string, n: Notice, expiresAt = Math.min(endTime(n), now + 7 * 86400000)) =>
    alerts.push({ id, title, body: n.title.slice(0, 600), createdAt: now, expiresAt });
  for (const n of active.filter(n => !n.needsVerification)) {
    const key = n.alertKey || n.id;
    if (known && !known.includes(key)) add('notice:' + key, '아산 임대주택 신규·중요 변경', n);
    const end = endTime(n);
    if (Number.isFinite(end)) {
      const days = Math.round((Date.parse(day(end)) - Date.parse(day(now))) / 86400000);
      if ([0, 1, 3].includes(days)) add(`deadline:${n.id}:${end}:${days}`, days === 0 ? '오늘 신청 마감 · 아산집 알리미' : `신청 마감 ${days}일 전 · 아산집 알리미`, n, Math.min(end, Date.parse(day(now) + 'T23:59:59.999+09:00')));
    }
    const start = Date.parse(n.applicationStartAt || '');
    if (Number.isFinite(start) && now >= start && day(start) === day(now)) add(`start:${n.id}:${start}`, '오늘 신청 시작 · 아산집 알리미', n, Date.parse(day(now) + 'T23:59:59.999+09:00'));
  }
  return { alerts, known: [...new Set([...(known || []), ...keys])] };
}
export function validateSubscription(value: unknown): boolean {
  try {
    const s = value as { endpoint: string; keys: { p256dh: string; auth: string } };
    const url = new URL(s.endpoint);
    const allowed = url.hostname === 'fcm.googleapis.com' || url.hostname.endsWith('.push.services.mozilla.com') || url.hostname.endsWith('.push.apple.com') || url.hostname.endsWith('.notify.windows.com');
    const decode = (key: string) => atob(key.replace(/-/g, '+').replace(/_/g, '/')).length;
    return allowed && url.protocol === 'https:' && !url.username && !url.password && !url.port && s.endpoint.length < 4096 &&
      /^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.p256dh) && decode(s.keys.p256dh) === 65 &&
      /^[A-Za-z0-9_-]+={0,2}$/.test(s.keys.auth) && decode(s.keys.auth) === 16;
  } catch { return false; }
}

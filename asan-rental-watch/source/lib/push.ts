export const PUSH_API = 'https://asan-rental-push.kimkirik.chatgpt.site/api';
const TOKEN_KEY = 'asan-rental-push-device-v1';
export type PushReceipt = { id: string; title: string; sent_at: number | null; received_at: number | null; last_error: string | null };
export type PushDevice = { connected: boolean; receipts: PushReceipt[]; health?: { checkedAt?: string; stale?: boolean; error?: string } };
export function deviceToken(create = false) {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token && create) {
    token = [...crypto.getRandomValues(new Uint8Array(32))].map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}
export async function pushRequest<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = deviceToken();
  const response = await fetch(PUSH_API + path, { method, cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(response.status === 401 ? '알림 서버에 기기가 연결되지 않았습니다. 알림 연결 버튼을 다시 눌러 주세요.' : data.error || '알림 서버에 연결하지 못했습니다.');
  return data;
}
export async function connectPush(registration: ServiceWorkerRegistration) {
  const installing = registration.installing || registration.waiting;
  if (installing && installing.state !== 'activated') await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => { installing.removeEventListener('statechange', changed); reject(new Error('앱 업데이트 중입니다. 잠시 후 알림 연결을 다시 눌러 주세요.')); }, 20000);
    const changed = () => { if (installing.state === 'activated') { window.clearTimeout(timer); installing.removeEventListener('statechange', changed); resolve(); } };
    installing.addEventListener('statechange', changed);
    changed();
  });
  const hadToken = deviceToken();
  deviceToken(true);
  const { publicKey } = await pushRequest<{ publicKey: string }>('/config');
  if (!publicKey) throw new Error('알림 서버 준비 상태를 확인해 주세요.');
  const key = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !hadToken) { await subscription.unsubscribe(); subscription = null; }
  if (!subscription) subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  await pushRequest('/subscribe', 'POST', subscription.toJSON());
}
export async function disconnectPush(registration?: ServiceWorkerRegistration) {
  // Remove the server subscription first; if offline, do not falsely report success.
  await pushRequest('/device', 'DELETE');
  await (await registration?.pushManager.getSubscription())?.unsubscribe();
  localStorage.removeItem(TOKEN_KEY);
}

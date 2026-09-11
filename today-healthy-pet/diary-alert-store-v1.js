export const DEFAULT_SETTINGS = { enabled: true, time: '21:00' };
export const ALERT_DB = 'healthy-pet-diary-alerts';
export const RECORD_DB = 'healthy-pet-diary';
export const RECORD_STORE = 'health-records';

export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function validSettings(value) {
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : true,
    time: /^([01]\d|2[0-3]):[0-5]\d$/.test(value?.time) ? value.time : '21:00',
  };
}

export function isDue(settings, now = new Date()) {
  const [hour, minute] = settings.time.split(':').map(Number);
  return settings.enabled && now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute;
}

function openDatabase(name, store, options) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, options);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('다른 창에서 저장소를 사용 중이에요.'));
  });
}

export async function hasRecord(day) {
  const db = await openDatabase(RECORD_DB, RECORD_STORE, { keyPath: 'date' });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(RECORD_STORE, 'readonly');
    const request = tx.objectStore(RECORD_STORE).count(day);
    tx.oncomplete = () => { db.close(); resolve(request.result > 0); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function readState(key) {
  const db = await openDatabase(ALERT_DB, 'state');
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readonly');
    const request = tx.objectStore('state').get(key);
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function writeState(key, value) {
  const db = await openDatabase(ALERT_DB, 'state');
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(value, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

// A single read/write transaction prevents two open tabs from alerting together.
export async function claimDay(day, now = Date.now()) {
  const db = await openDatabase(ALERT_DB, 'state');
  return new Promise((resolve, reject) => {
    let claimed = false;
    const tx = db.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    const request = store.get('delivery');
    request.onsuccess = () => {
      const previous = request.result;
      if (previous?.day === day && (previous.delivered || previous.leaseUntil > now)) return;
      claimed = true;
      store.put({ day, delivered: false, leaseUntil: now + 60000 }, 'delivery');
    };
    tx.oncomplete = () => { db.close(); resolve(claimed); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

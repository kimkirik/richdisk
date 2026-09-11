import { localDay, validSettings, isDue, hasRecord, readState, writeState, claimDay } from './diary-alert-store-v1.js';

let settings = validSettings();
let checking = false;
let settingsCard;
let banner;
let savedToday = null;
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('healthy-pet-diary-alerts') : null;
const canNotify = () => 'Notification' in window && Notification.permission === 'granted';

function setStatus(text) {
  const status = settingsCard?.querySelector('[data-diary-status]');
  if (status) status.textContent = text;
}

function renderSettings() {
  if (!settingsCard) return;
  if (!settingsCard.querySelector('form').dataset.dirty) {
    settingsCard.querySelector('#diary-alert-enabled').checked = settings.enabled;
    settingsCard.querySelector('#diary-alert-time').value = settings.time;
  }
  const permission = settingsCard.querySelector('[data-diary-permission]');
  const allow = settingsCard.querySelector('[data-diary-allow]');
  allow.hidden = canNotify();
  if (canNotify()) permission.textContent = '이 기기의 시스템 알림이 허용되어 있어요.';
  else if ('Notification' in window && Notification.permission === 'denied') {
    permission.textContent = '시스템 알림이 차단되어 있어요. 브라우저의 사이트 설정에서 알림을 허용해주세요. 앱 안의 알림은 계속 표시돼요.';
    allow.hidden = true;
  } else permission.textContent = '아이폰은 홈 화면에 추가한 앱에서 알림을 허용해주세요. 허용 전에는 앱 안에서 알려드려요.';
  if (savedToday === null) setStatus('오늘 기록을 확인하고 있어요.');
  else if (savedToday) setStatus('오늘 일지 저장 완료 · 오늘은 알림이 울리지 않아요.');
  else if (!settings.enabled) setStatus('일지 알림이 꺼져 있어요.');
  else setStatus(`오늘 일지 미작성 · 매일 ${settings.time} 이후 하루 한 번 알려드려요.`);
}

function openDiary() {
  banner?.remove();
  banner = null;
  window.dispatchEvent(new CustomEvent('healthy-pet:open-today'));
}

function showBanner(test = false) {
  banner?.remove();
  banner = document.createElement('aside');
  banner.className = 'diary-alert-banner';
  banner.dataset.day = localDay();
  banner.setAttribute('aria-label', test ? '일지 알림 테스트' : '오늘 일지 작성 알림');
  banner.innerHTML = '<img src="./icons/rich-care-v1-192.png" alt="" width="44" height="44"><div><strong></strong><p></p><button type="button" class="diary-alert-write">지금 기록하기</button></div><button type="button" class="diary-alert-dismiss" aria-label="일지 알림 닫기">×</button>';
  banner.querySelector('strong').textContent = test ? '일지 알림 테스트예요' : '오늘 일지, 아직 안 쓰셨나요?';
  const text = banner.querySelector('p');
  text.setAttribute('role', 'status');
  text.textContent = test ? '알림은 이렇게 표시돼요.' : '리치의 오늘 컨디션을 짧게 남겨주세요.';
  banner.querySelector('.diary-alert-write').addEventListener('click', openDiary);
  banner.querySelector('.diary-alert-dismiss').addEventListener('click', () => { banner.remove(); banner = null; });
  document.body.append(banner);
}

async function notify(day, test = false) {
  if (!canNotify() || !('serviceWorker' in navigator)) return false;
  // Avoid waiting forever for a failed service-worker registration.
  let timeout;
  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('알림 연결 지연')), 5000); }),
    ]);
    await registration.showNotification(test ? '오늘도 건강하개 · 테스트 알림' : '오늘 일지를 기록해주세요 🐾', {
      body: test ? '일지 미작성 알림은 이렇게 도착해요.' : '아직 오늘 일지가 저장되지 않았어요. 리치의 하루를 남겨주세요.',
      icon: new URL('./icons/rich-care-v1-192.png', location.href).href,
      tag: test ? 'healthy-pet-diary-test' : `healthy-pet-diary-${day}`,
      data: { type: 'diary', day },
    });
    return true;
  } finally { clearTimeout(timeout); }
}

async function closeAlerts(day) {
  banner?.remove();
  banner = null;
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration('./');
  if (!registration) return;
  for (const notification of await registration.getNotifications({ tag: `healthy-pet-diary-${day}` })) notification.close();
}

async function check() {
  if (checking) return;
  checking = true;
  try {
    const now = new Date();
    const day = localDay(now);
    if (banner && banner.dataset.day !== day) { banner.remove(); banner = null; }
    settings = validSettings(await readState('settings'));
    savedToday = await hasRecord(day);
    renderSettings();
    if (savedToday || !settings.enabled) { await closeAlerts(day); return; }
    if (!isDue(settings, now)) return;
    if (document.visibilityState !== 'visible' && !canNotify()) return;
    if (!await claimDay(day)) return;
    // Recheck after the claim so a save from another tab cancels the reminder.
    if (await hasRecord(day)) return;
    let shown = false;
    if (document.visibilityState === 'visible') { showBanner(); shown = true; }
    try { shown = await notify(day) || shown; } catch { /* Visible banner remains usable. */ }
    await writeState('delivery', { day, delivered: shown, leaseUntil: 0 });
  } catch {
    // A failed database read is not evidence that the diary is missing.
    savedToday = null;
    setStatus('기록을 확인하지 못했어요. 저장 공간과 브라우저 설정을 확인해주세요.');
  } finally { checking = false; }
}

async function saveSettings(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const next = validSettings({ enabled: form.querySelector('#diary-alert-enabled').checked, time: form.querySelector('#diary-alert-time').value });
  try {
    await writeState('settings', next);
    delete form.dataset.dirty;
    settings = next;
    channel?.postMessage({ type: 'settings' });
    await check();
    setStatus(`저장했어요 · ${settings.enabled ? `매일 ${settings.time}, 미작성일에만 알림` : '일지 알림 끄기'}`);
  } catch { setStatus('알림 설정을 저장하지 못했어요. 다시 시도해주세요.'); }
}

async function allowNotifications() {
  if (!('Notification' in window)) {
    setStatus('이 브라우저는 시스템 알림을 지원하지 않아요. 홈 화면에 추가한 앱 또는 기본 브라우저에서 다시 열어주세요.');
    return;
  }
  try {
    const permission = await Notification.requestPermission();
    renderSettings();
    setStatus(permission === 'granted' ? '알림을 허용했어요. 알림 테스트로 확인할 수 있어요.' : '앱 안의 알림은 계속 표시돼요. 시스템 알림은 브라우저 설정에서 허용해주세요.');
  } catch { setStatus('알림 권한을 열지 못했어요. 기본 브라우저에서 다시 시도해주세요.'); }
}

async function testNotification() {
  try {
    if (await notify(localDay(), true)) setStatus('테스트 알림을 보냈어요. 기기의 알림을 확인해주세요.');
    else {
      setStatus('시스템 알림을 허용하면 기기에서도 받을 수 있어요.');
      showBanner(true);
    }
  } catch { setStatus('시스템 알림을 보내지 못했어요. 기기의 알림 설정을 확인해주세요.'); }
}

function mount() {
  const bell = document.querySelector('.header-actions .icon-button');
  if (bell && bell.getAttribute('aria-label') !== '일지·산책 알림 설정') bell.setAttribute('aria-label', '일지·산책 알림 설정');
  const scroll = document.querySelector('.reminder-scroll');
  if (!scroll || scroll.querySelector('.diary-alert-settings')) return;
  settingsCard = document.createElement('section');
  settingsCard.className = 'diary-alert-settings';
  settingsCard.setAttribute('aria-labelledby', 'diary-alert-heading');
  settingsCard.innerHTML = `<div class="diary-alert-heading"><img src="./icons/rich-care-v1-192.png" alt="" width="42" height="42"><div><p>하루 3분, 잊지 않도록</p><h3 id="diary-alert-heading">일지 미작성 알림</h3></div></div>
    <form><label class="diary-alert-toggle"><span>일지를 안 쓴 날에만 알림</span><input id="diary-alert-enabled" type="checkbox" role="switch"></label>
    <label class="diary-alert-time">매일 알림 시간<input id="diary-alert-time" type="time" required value="21:00"></label>
    <p class="diary-alert-status" data-diary-status role="status"></p>
    <button type="submit" class="diary-alert-save">일지 알림 설정 저장</button></form>
    <p class="diary-alert-permission" data-diary-permission></p>
    <div class="diary-alert-buttons"><button type="button" data-diary-allow>시스템 알림 허용</button><button type="button" data-diary-test>알림 테스트</button></div>
    <p class="diary-alert-limit">앱을 열어둔 동안 또는 다시 열 때 확인해요. 앱을 완전히 닫은 상태의 알림은 푸시 서버 연결이 필요해요.</p>`;
  settingsCard.querySelector('form').addEventListener('submit', saveSettings);
  settingsCard.querySelector('form').addEventListener('input', (event) => { event.currentTarget.dataset.dirty = 'true'; });
  settingsCard.querySelector('[data-diary-allow]').addEventListener('click', allowNotifications);
  settingsCard.querySelector('[data-diary-test]').addEventListener('click', testNotification);
  scroll.prepend(settingsCard);
  const title = document.getElementById('reminder-modal-title');
  if (title) title.textContent = '일지 · 산책 알림';
  renderSettings();
  void check();
}

const observer = new MutationObserver(mount);
observer.observe(document.getElementById('root'), { childList: true, subtree: true });
mount();
window.addEventListener('healthy-pet:record-saved', (event) => {
  channel?.postMessage({ type: 'record-saved', day: event.detail?.date });
  if (event.detail?.date === localDay()) {
    savedToday = true;
    renderSettings();
    void closeAlerts(localDay()).catch(() => {});
  }
  void check();
});
channel?.addEventListener('message', () => void check());
window.addEventListener('focus', () => void check());
window.addEventListener('pageshow', () => void check());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'healthy-pet:open-today') openDiary();
});
setInterval(() => void check(), 30000);
void check();

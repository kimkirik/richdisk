import { feeds, fetchFeed, summarize, fresh } from './data.js?v=2.1';

const manuals=[
{id:'disaster',icon:'⌁',name:'재난·정전',summary:'침수·정전·통신 장애에 대비한 2~3일 생존 준비',source:'국민안전24',url:'https://safekorea.go.kr/',now:['재난문자와 기상청 특보를 확인하세요.','휴대전화·보조배터리를 충전하세요.','가족 연락 방법과 만날 장소를 정하세요.'],prepare:['식수·간편식·생필품을 2~3일분 준비하세요.','손전등·라디오·여분 건전지를 한곳에 두세요.','반려동물 사료·복용약·이동장을 함께 챙기세요.'],avoid:['침수된 지하차도나 하천 진입','출처가 없는 대피 명령 공유','정전 중 엘리베이터 이용']},
{id:'finance',icon:'₩',name:'금융·결제 장애',summary:'결제망 장애에 대비하되 뱅크런을 유발하지 않는 준비',source:'금융위원회',url:'https://www.fsc.go.kr/',now:['은행과 카드사의 공식 공지만 확인하세요.','평소 필요한 소액 현금과 대체 결제수단을 확인하세요.','서로 다른 결제수단을 2개 이상 확보하세요.'],prepare:['자동이체·대출 납입일을 기록하세요.','예금자보호 대상을 공식 사이트에서 확인하세요.','중요 금융 연락처를 종이에도 적어두세요.'],avoid:['예금 전액을 한꺼번에 인출','소문만 보고 자산을 전부 환전','빚을 내어 금·달러·코인 매수']},
{id:'health',icon:'＋',name:'감염병·보건',summary:'기본 위생과 처방약을 준비하고 의료기관 안내를 따릅니다.',source:'질병관리청',url:'https://www.kdca.go.kr/',now:['마스크·체온계·손 세정제를 확인하세요.','복용약의 처방전과 잔여량을 확인하세요.','질병관리청과 보건소 공식 안내를 확인하세요.'],prepare:['가족별 복용약과 알레르기를 기록하세요.','상비약 용법과 유효기간을 확인하세요.','호흡기 증상이 있으면 환기하고 마스크를 착용하세요.'],avoid:['항생제 임의 구매·복용·나눠 먹기','남은 처방약을 다른 증상에 사용','검증되지 않은 치료법 공유']},
{id:'conflict',icon:'△',name:'전쟁·분쟁',summary:'정부 경보와 외교부 여행경보를 기준으로 판단합니다.',source:'외교부 해외안전여행',url:'https://www.0404.go.kr/',now:['정부 재난문자와 공식 브리핑을 확인하세요.','가족 비상 연락망과 대피 장소를 확인하세요.','신분증 등 중요문서 사본을 준비하세요.'],prepare:['라디오·손전등·보조배터리를 준비하세요.','이동이 필요하면 정부의 교통·대피 안내를 먼저 확인하세요.','한 사람이 들 수 있는 생존배낭을 준비하세요.'],avoid:['군사시설 위치·사진 공유','확인되지 않은 동원·대피 소문 확산','상황을 보러 위험지역으로 이동']}
];
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fmt = value => new Intl.DateTimeFormat('ko-KR', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'Asia/Seoul', hour12:false}).format(new Date(value));
let toastTimer, memory = {}, onlySaved = false, selectedManual, lastAttempt = 0;
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 5500);
}
function readList(key, allowed) {
  try {
    const list = JSON.parse(localStorage.getItem(key) || '[]');
    memory[key] = Array.isArray(list) ? [...new Set(list.filter(id => allowed.includes(id)))] : [];
  } catch { memory[key] ??= []; }
  return memory[key];
}
function writeList(key, value) {
  memory[key] = value;
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { toast('브라우저가 저장을 허용하지 않아 이 화면에서만 유지됩니다.'); return false; }
}
const manualIds = manuals.map(m => m.id);
let saved = readList('canary-saved', manualIds);
const kit = ['식수·조리 없는 식품', '상비약·최근 처방전', '라디오·손전등·건전지', '신분증·중요서류 사본', '보조배터리·소액 현금', '리치 사료·약·이동장'];
let checked = readList('canary-kit-v2', kit.map((_, i) => String(i)));
function showTab(id, moveFocus = false) {
  const button = $(`[data-tab="${id}"]`);
  if (!button) return;
  $$('[data-tab]').forEach(b => { const active = b === button; b.classList.toggle('active', active); b.setAttribute('aria-selected', active); b.tabIndex = active ? 0 : -1; });
  $$('.tab').forEach(panel => { panel.hidden = panel.id !== id; panel.classList.toggle('active', panel.id === id); });
  if (moveFocus) button.focus();
}
$$('[data-tab]').forEach(b => {
  b.addEventListener('click', () => showTab(b.dataset.tab));
  b.addEventListener('keydown', e => {
    const buttons = $$('[data-tab]'), i = buttons.indexOf(b);
    let next;
    if (e.key === 'ArrowRight') next = (i + 1) % buttons.length;
    if (e.key === 'ArrowLeft') next = (i + buttons.length - 1) % buttons.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = buttons.length - 1;
    if (next !== undefined) { e.preventDefault(); showTab(buttons[next].dataset.tab, true); }
  });
});
function renderManuals() {
  $('#savedCount').textContent = saved.length;
  const visible = manuals.filter(m => !onlySaved || saved.includes(m.id));
  $('#manualGrid').innerHTML = visible.length ? visible.map(m => `<button data-manual="${m.id}"><i aria-hidden="true">${m.icon}</i><div><b>${m.name}${saved.includes(m.id) ? '<small class="saved-badge">저장됨</small>' : ''}</b><span>${m.summary}</span><small>${m.source} 참고 →</small></div></button>`).join('') : '<p class="empty">저장한 매뉴얼이 없습니다. 전체 목록에서 필요한 매뉴얼을 저장하세요.</p>';
}
function updateSaveButton() {
  const isSaved = saved.includes(selectedManual);
  $('.save').textContent = isSaved ? '✓ 저장됨 · 누르면 해제' : '이 매뉴얼 저장';
  $('.save').setAttribute('aria-pressed', isSaved);
}
function openManual(id) {
  const m = manuals.find(item => item.id === id);
  if (!m) return;
  selectedManual = id;
  $('#dialogBody').innerHTML = `<p class="eyebrow">대처 매뉴얼</p><h2 id="dialogTitle">${m.name}</h2><p>${m.summary}</p><a href="${m.url}" target="_blank" rel="noopener noreferrer">${m.source} 최신 안내 ↗</a><div class="steps"><section><h3>1. 지금 확인</h3><ol>${m.now.map(x => `<li>${x}</li>`).join('')}</ol></section><section><h3>2. 미리 준비</h3><ol>${m.prepare.map(x => `<li>${x}</li>`).join('')}</ol></section><section class="dont"><h3>피해야 할 행동</h3><ul>${m.avoid.map(x => `<li>${x}</li>`).join('')}</ul></section></div><p class="muted">공식 안내를 참고해 정리한 일반적인 준비 목록입니다. 실제 상황에서는 담당 기관의 최신 지시를 따르세요.</p><button class="save" type="button"></button><p class="storage-note">저장한 매뉴얼과 준비 상태는 이 브라우저에만 보관됩니다.</p>`;
  updateSaveButton();
  $('.save').onclick = () => {
    saved = saved.includes(id) ? saved.filter(x => x !== id) : [...saved, id];
    const persisted = writeList('canary-saved', saved);
    updateSaveButton(); renderManuals();
    if (persisted) toast(saved.includes(id) ? '매뉴얼을 저장했습니다.' : '저장을 해제했습니다.');
  };
  if (!$('#dialog').open) $('#dialog').showModal();
}
$('#savedOnly').onchange = e => { onlySaved = e.target.checked; renderManuals(); };
$('.close').onclick = () => $('#dialog').close();
$('#dialog').addEventListener('click', e => { if (e.target === $('#dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
$('#kitJump').onclick = () => { showTab('manual'); $('#bag').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); $('#bagTitle').focus({preventScroll:true}); };
function renderKit() {
  $('#kitList').innerHTML = kit.map((item, i) => `<li><label><input type="checkbox" data-kit="${i}" ${checked.includes(String(i)) ? 'checked' : ''}><span>${item}</span></label></li>`).join('');
  updateKit();
}
function updateKit() { $('#kitCount').textContent = `${checked.length} / ${kit.length} 준비 완료`; $('#kitProgress').value = checked.length; }
$('#kitList').addEventListener('change', e => {
  const id = e.target.dataset.kit;
  if (id === undefined) return;
  checked = e.target.checked ? [...new Set([...checked, id])] : checked.filter(x => x !== id);
  writeList('canary-kit-v2', checked); updateKit();
});
const states = Object.fromEntries(Object.keys(feeds).map(id => [id, { status:'loading' }]));
const inflight = new Map();
function rows(list) { return `<dl>${list.map(([label, value]) => `<div><dt>${label}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`; }
function renderFeed(id) {
  const card = $(`#card-${id}`), config = feeds[id], state = states[id];
  card.dataset.status = state.status;
  card.setAttribute('aria-busy', state.status === 'loading');
  let status = '확인 중', content = '<div class="skeleton" aria-hidden="true"></div><p>자료를 불러오고 있습니다.</p>';
  if (state.status === 'error') {
    status = '확인 실패';
    content = `<strong class="word">자료 확인 실패</strong><p>${esc(state.message)}</p><p class="card-time">시도 ${fmt(state.attempted)} KST</p><button class="retry" data-retry="${id}">이 자료 다시 확인</button>`;
  }
  if (state.status === 'ok') {
    status = '확인됨'; const d = state.data;
    if (id === 'weather') content = `<strong>${d.temperature.toFixed(1)}<small>℃</small></strong><p>현재 기온 · 모델 추정값</p>${rows([['오늘 최고기온', `${d.max.toFixed(1)}℃`], ['오늘 최대 강수확률', `${d.rain}%`], ['오늘 최대 풍속', `${d.wind.toFixed(1)} m/s`]])}<p class="card-note">${d.reasons.length ? esc(d.reasons.join(' · ')) + ' · 기상청 특보 확인' : '앱의 기상 참고 기준 미만'}</p><p class="card-time">기온 기준 ${fmt(d.sourceTime)} KST<br>예보 대상 ${d.day} · 아산 중심 좌표</p>`;
    if (id === 'quakes') content = `<strong>${d.count}<small>건</small></strong><p>목록 생성 기준 최근 24시간 · 규모 4.5 이상</p>${rows([['최대 규모', d.magnitude === null ? '해당 지진 없음' : `M ${d.magnitude.toFixed(1)}`], ['발생지', d.place ?? '해당 없음']])}${d.eventTime ? `<p class="card-time">최대 지진 ${fmt(d.eventTime)} KST</p>` : ''}<p class="card-note">세계 집계이며 아산의 위험도를 뜻하지 않습니다.</p><p class="card-time">목록 생성 ${fmt(d.sourceTime)} KST</p>`;
    if (id === 'fx') content = `<strong>${d.rate.toLocaleString('ko-KR', {maximumFractionDigits:1})}<small>원</small></strong><p>미화 1달러 기준 참고환율</p>${rows([['기준일', d.day], ['갱신 주기', '영업일 기준 일 1회']])}<p class="card-note">주말·휴일에는 직전 발표값입니다. 실시간 거래·은행 환전 가격과 다릅니다.</p><p class="card-time">확인 ${fmt(state.attempted)} KST</p>`;
  }
  card.innerHTML = `<div class="card-head"><h3><span aria-hidden="true">${config.symbol}</span> ${config.name}</h3><span class="status-badge">${status}</span></div><p class="provider">${config.provider}</p>${content}<a class="source-link" href="${config.link}" target="_blank" rel="noopener noreferrer">자료 출처 ↗</a>`;
}
function renderSummary() {
  const s = summarize(states), pending = inflight.size > 0;
  document.body.dataset.tone = s.tone;
  $('#stateWord').textContent = s.word; $('#stateTitle').textContent = s.title; $('#stateBody').textContent = s.body;
  const good = Object.values(states).filter(x => x.status === 'ok').length;
  $('#updated').textContent = `${good}/3 자료 확인${lastAttempt ? ` · 마지막 시도 ${fmt(lastAttempt)} KST` : ''}`;
  $('#refresh').disabled = pending; $('#refresh').textContent = pending ? '확인 중…' : '↻ 전체 새로고침';
}
function loadOne(id) {
  if (inflight.has(id)) return inflight.get(id);
  states[id] = {status:'loading'}; renderFeed(id);
  lastAttempt = Date.now();
  const job = (async () => {
    try { const data = await fetchFeed(id); states[id] = {status:'ok', data, attempted:Date.now()}; }
    catch (error) { states[id] = {status:'error', attempted:Date.now(), message:!navigator.onLine ? '인터넷 연결을 확인해 주세요.' : error.name === 'AbortError' ? '응답이 지연되어 확인을 중단했습니다.' : ['응답 형식을 확인할 수 없습니다.', '자료의 기준 시각이 오래되었거나 올바르지 않습니다.'].includes(error.message) ? error.message : '제공처 연결에 실패했습니다. 잠시 후 다시 시도하세요.'}; }
    finally { inflight.delete(id); renderFeed(id); renderSummary(); }
  })();
  inflight.set(id, job); renderSummary(); return job;
}
async function loadAll() { await Promise.all(Object.keys(feeds).map(loadOne)); }
$('#refresh').onclick = loadAll;
document.addEventListener('click', e => {
  const manual = e.target.closest('[data-manual]'); if (manual) openManual(manual.dataset.manual);
  const retry = e.target.closest('[data-retry]'); if (retry && feeds[retry.dataset.retry]) loadOne(retry.dataset.retry);
});
function connectionStatus() { $('#connection').hidden = navigator.onLine; }
window.addEventListener('offline', () => {
  connectionStatus();
  Object.keys(feeds).forEach(id => { if (!inflight.has(id)) { states[id] = {status:'error', message:'오프라인 상태라 최신 자료를 확인할 수 없습니다.', attempted:Date.now()}; renderFeed(id); } });
  renderSummary();
});
window.addEventListener('online', () => { connectionStatus(); loadAll(); });
function checkAge() {
  Object.keys(feeds).forEach(id => { const s = states[id]; if (s.status === 'ok' && !fresh(id, s.data)) { states[id] = {status:'error', attempted:Date.now(), message:'자료가 오래되어 다시 확인이 필요합니다.'}; renderFeed(id); } });
  renderSummary();
}
setInterval(() => { checkAge(); if (!document.hidden && navigator.onLine && Date.now() - lastAttempt >= 5 * 60000) loadAll(); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkAge(); if (Date.now() - lastAttempt >= 5 * 60000) loadAll(); } });
const registration = 'serviceWorker' in navigator ? navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).catch(() => null) : Promise.resolve(null);
registration.then(reg => { if (!reg) return; if (reg.active) $('#offlineReady').textContent = '매뉴얼은 첫 로딩 후 오프라인에서도 열 수 있습니다.'; else reg.installing?.addEventListener('statechange', e => { if (e.target.state === 'activated') $('#offlineReady').textContent = '매뉴얼은 첫 로딩 후 오프라인에서도 열 수 있습니다.'; }); });
$('#notify').onclick = async () => {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast('이 환경은 시험 알림을 지원하지 않습니다. iPhone은 홈 화면에 추가한 앱에서 확인하세요.');
  if (Notification.permission === 'denied') return toast('브라우저 사이트 설정에서 알림 권한을 확인하세요.');
  $('#notify').disabled = true;
  try {
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permission !== 'granted') return toast('알림 권한이 허용되지 않았습니다.');
    const reg = await registration;
    if (!reg?.active || typeof reg.showNotification !== 'function') return toast('알림 준비가 되지 않았습니다. 잠시 후 다시 시도하세요.');
    await reg.showNotification('카나리아 시험 알림', {body:'알림 표시 테스트입니다. 실제 재난 경보가 아니며 자동 위험 알림은 제공하지 않습니다.', icon:new URL('./icon-192.png', location.href).href, tag:'canary-test', data:{url:new URL('./', location.href).href}});
    toast('시험 알림을 보냈습니다. 자동 위험 알림은 제공하지 않습니다.');
  } catch { toast('알림을 표시하지 못했습니다. 브라우저와 기기의 알림 설정을 확인하세요.'); }
  finally { $('#notify').disabled = false; }
};
renderManuals(); renderKit(); connectionStatus(); loadAll();

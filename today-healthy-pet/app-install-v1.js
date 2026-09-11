(() => {
  'use strict';

  // This small enhancement is separate from the existing compiled health app.
  const dialog = document.getElementById('pet-install-dialog');
  const installNow = document.getElementById('pet-install-now');
  const guide = document.getElementById('pet-install-guide');
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(navigator.userAgent);
  const inApp = /KAKAOTALK|Instagram|FBAN|FBAV|NAVER\(|; wv\)/i.test(navigator.userAgent);
  let pendingPrompt = null;
  let installed = false;
  let busy = false;
  let trigger = null;

  const isStandalone = () => displayMode.matches || navigator.standalone === true;

  function renderGuide() {
    const lines = inApp ? [
      '기본 브라우저에서 열어주세요',
      ios ? '현재 앱의 메뉴에서 Safari로 열기를 선택하세요.' : '현재 앱의 메뉴에서 기본 브라우저로 열기를 선택하세요.',
      '브라우저에서 이 페이지의 앱 추가 버튼을 다시 눌러주세요.',
    ] : ios ? [
      '아이폰 · 아이패드에서 추가하기',
      'Safari에서 이 페이지를 열고 공유 버튼을 누르세요.',
      '홈 화면에 추가를 선택하세요. 항목이 안 보이면 공유 메뉴를 아래로 내려보세요.',
      '웹 앱으로 열기 옵션이 있으면 켠 뒤 추가를 누르세요.',
    ] : android ? [
      '안드로이드에서 추가하기',
      'Chrome 또는 삼성 인터넷에서 이 페이지를 열어주세요.',
      '브라우저 메뉴에서 앱 설치 또는 홈 화면에 추가를 선택하세요.',
      '안내에 따라 설치 또는 추가를 눌러주세요.',
    ] : [
      '컴퓨터에서 추가하기',
      'Chrome · Edge: 주소창의 설치 아이콘 또는 브라우저 메뉴의 앱 설치를 선택하세요.',
      'Mac Safari: 파일 메뉴에서 Dock에 추가를 선택하세요.',
      '설치 항목이 없다면 지원하는 최신 브라우저에서 다시 열어주세요.',
    ];
    const heading = document.createElement('h3');
    heading.textContent = lines[0];
    const list = document.createElement('ol');
    lines.slice(1).forEach((line) => {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    });
    guide.replaceChildren(heading, list);
  }

  function sync() {
    const hide = installed || isStandalone();
    if (trigger) {
      trigger.hidden = hide;
      trigger.disabled = busy;
      trigger.setAttribute('aria-label', pendingPrompt ? '오늘도 건강하개 앱 추가' : '오늘도 건강하개 홈 화면 추가 안내');
      trigger.setAttribute('aria-haspopup', pendingPrompt ? 'false' : 'dialog');
    }
    installNow.hidden = !pendingPrompt || hide;
    installNow.disabled = busy;
    guide.hidden = !!pendingPrompt;
    if (hide && dialog.open) dialog.close();
  }

  function showGuide() {
    renderGuide();
    sync();
    if (!dialog.open && !installed && !isStandalone()) dialog.showModal();
  }

  async function requestInstall() {
    if (busy || installed || isStandalone()) return;
    if (!pendingPrompt) return showGuide();
    const prompt = pendingPrompt;
    pendingPrompt = null;
    busy = true;
    if (dialog.open) dialog.close();
    sync();
    try {
      await prompt.prompt();
      // Only appinstalled confirms completion; dismissing must allow a retry.
      await prompt.userChoice;
    } catch {
      showGuide();
    } finally {
      busy = false;
      sync();
    }
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    pendingPrompt = event;
    sync();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    pendingPrompt = null;
    sync();
  });
  displayMode.addEventListener('change', sync);
  window.addEventListener('pageshow', sync);
  installNow.addEventListener('click', requestInstall);
  dialog.querySelectorAll('.pet-install-close, .pet-install-done').forEach((button) => {
    button.addEventListener('click', () => dialog.close());
  });
  dialog.addEventListener('close', () => {
    if (trigger && !trigger.hidden) trigger.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });

  function mountButton() {
    const actions = document.querySelector('.topbar .header-actions');
    if (!actions) return false;
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'pet-install-button';
    trigger.setAttribute('aria-controls', dialog.id);
    const icon = document.createElement('img');
    icon.src = new URL('./icons/rich-care-v1-192.png', document.baseURI).href;
    icon.alt = '';
    icon.width = 28;
    icon.height = 28;
    const label = document.createElement('span');
    label.textContent = '앱 추가';
    trigger.append(icon, label);
    trigger.addEventListener('click', requestInstall);
    actions.prepend(trigger);
    sync();
    return true;
  }

  if (!mountButton()) {
    const root = document.getElementById('root');
    const observer = new MutationObserver(() => {
      if (mountButton()) observer.disconnect();
    });
    observer.observe(root, { childList: true, subtree: true });
  }
})();

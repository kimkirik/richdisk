(() => {
  const APP_BASE = "/richdisk/neon-bubble-pop/";
  let installPrompt = null;
  let installButton = null;

  const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  const removeButton = () => {
    installButton?.remove();
    installButton = null;
  };

  const mountButton = () => {
    if (installButton || isStandalone()) return;

    const style = document.createElement("style");
    style.textContent = `
      #pwa-install-button{position:fixed;top:96px;right:22px;z-index:100;display:flex;align-items:center;gap:7px;min-height:42px;padding:8px 13px;border:1px solid rgba(117,239,255,.9);border-radius:999px;background:linear-gradient(145deg,rgba(10,35,89,.96),rgba(41,12,83,.96));color:#fff;font:800 14px/1 Pretendard,"Noto Sans KR",sans-serif;letter-spacing:-.02em;box-shadow:0 0 18px rgba(50,230,255,.5),inset 0 0 14px rgba(255,61,200,.18);cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
      #pwa-install-button:hover{filter:brightness(1.18);transform:translateY(-1px)}
      #pwa-install-button:focus-visible{outline:3px solid #fff;outline-offset:3px}
      #pwa-install-button svg{width:20px;height:20px;filter:drop-shadow(0 0 5px #32e6ff)}
      @media(max-width:700px){#pwa-install-button{top:70px;right:10px;min-height:38px;padding:7px 10px;font-size:12px}}
      @media(max-height:650px){#pwa-install-button{top:58px}}
    `;
    document.head.appendChild(style);

    installButton = document.createElement("button");
    installButton.id = "pwa-install-button";
    installButton.type = "button";
    installButton.setAttribute("aria-label", "버블 팝 앱 설치");
    installButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2"/></svg><span>앱 설치</span>';
    installButton.addEventListener("click", async () => {
      if (installPrompt) {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        installPrompt = null;
        if (choice.outcome === "accepted") removeButton();
        return;
      }

      if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
        window.alert("Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.");
      }
    });
    document.body.appendChild(installButton);
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    mountButton();
  });

  window.addEventListener("appinstalled", removeButton);

  window.addEventListener("load", () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register(APP_BASE + "sw.js", { scope: APP_BASE }).catch(() => {});
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone()) mountButton();
  });
})();

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

declare global {
  interface Window {
    __KKIRIKIRI_INSTALL_PROMPT__?: InstallPromptEvent | null;
  }
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const helpWasOpen = useRef(false);

  useEffect(() => {
    const pendingPrompt = window.__KKIRIKIRI_INSTALL_PROMPT__ ?? null;
    const initialCheck = window.requestAnimationFrame(() => {
      setMounted(true);
      setInstalled(isStandalone());
      if (pendingPrompt) setInstallPrompt(pendingPrompt);
    });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as InstallPromptEvent;
      window.__KKIRIKIRI_INSTALL_PROMPT__ = promptEvent;
      setInstallPrompt(promptEvent);
    };
    const onInstalled = () => {
      window.__KKIRIKIRI_INSTALL_PROMPT__ = null;
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    if ("serviceWorker" in navigator && (window.isSecureContext || window.location.hostname === "localhost")) {
      navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((registration) => registration.update()).catch(() => {
        // 설치가 불가능한 웹뷰에서는 아래의 수동 추가 안내를 사용해요.
      });
    }

    return () => {
      window.cancelAnimationFrame(initialCheck);
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if ("serviceWorker" in navigator) navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    if (!showHelp) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keepFocusInDialog = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowHelp(false);
        return;
      }
      if (event.key !== "Tab" || !sheetRef.current) return;
      const focusable = [...sheetRef.current.querySelectorAll<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")]
        .filter((element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", keepFocusInDialog);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", keepFocusInDialog);
    };
  }, [showHelp]);

  useEffect(() => {
    if (showHelp) helpWasOpen.current = true;
    else if (mounted && helpWasOpen.current) {
      helpWasOpen.current = false;
      triggerRef.current?.focus({ preventScroll: true });
    }
  }, [showHelp, mounted]);

  if (installed) return null;

  async function installApp() {
    if (!installPrompt) {
      setCopyStatus("");
      setShowHelp(true);
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      window.__KKIRIKIRI_INSTALL_PROMPT__ = null;
      setInstallPrompt(null);
      if (choice.outcome === "accepted") setInstalled(true);
      else setShowHelp(true);
    } catch {
      window.__KKIRIKIRI_INSTALL_PROMPT__ = null;
      setInstallPrompt(null);
      setShowHelp(true);
    }
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("주소를 복사했어요");
    } catch {
      setCopyStatus("브라우저 메뉴에서 주소 복사를 선택해 주세요");
    }
  }

  const helpSheet = showHelp && mounted ? createPortal(
    <div className="install-help-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowHelp(false); }}>
      <section ref={sheetRef} className="install-help-sheet" role="dialog" aria-modal="true" aria-labelledby="install-help-title">
        <button ref={closeRef} className="install-help-close" type="button" onClick={() => setShowHelp(false)} aria-label="설치 안내 닫기">×</button>
        <span className="install-help-icon" aria-hidden="true">📲</span>
        <h2 id="install-help-title">홈 화면에 끼리끼리 추가하기</h2>
        {isAppleMobile() ? (
          <ol><li>Safari 아래쪽의 <b>공유</b> 버튼을 누르세요.</li><li><b>홈 화면에 추가</b>를 선택하세요.</li><li><b>추가</b>를 누르면 앱처럼 열려요.</li></ol>
        ) : (
          <ol><li>Chrome 또는 삼성 인터넷으로 이 페이지를 여세요.</li><li>브라우저 메뉴의 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.</li><li>ChatGPT 안에서 열었다면 먼저 <b>기본 브라우저에서 열기</b>를 선택하세요.</li></ol>
        )}
        <button className="install-copy-link" type="button" onClick={copyAddress}>🔗 현재 주소 복사</button>
        {copyStatus && <p className="install-copy-status" role="status">{copyStatus}</p>}
        <p>물때와 날씨는 최신 자료가 필요하므로 인터넷에 연결한 상태에서 확인하세요.</p>
        <button className="install-help-done" type="button" onClick={() => setShowHelp(false)}>확인</button>
      </section>
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button ref={triggerRef} className="install-app-button" type="button" onClick={installApp} aria-label="끼리끼리 앱 또는 바로가기를 홈 화면에 추가">
        <span aria-hidden="true">＋</span><b>{installPrompt ? "설치" : "추가"}</b>
      </button>
      {helpSheet}
    </>
  );
}

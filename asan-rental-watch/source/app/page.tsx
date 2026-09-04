"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BellRing,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileText,
  House,
  ImageIcon,
  Info,
  MapPin,
  Phone,
  RefreshCw,
  Ruler,
  Search,
  Smartphone,
  WalletCards,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NOTICE_URL =
  "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?aisTpCd=26&ccrCnntSysDsCd=03&mi=1026&panId=2015122300020620&uppAisTpCd=13";
const PDF_URL = "https://apply.lh.or.kr/lhapply/lhFile.do?fileid=68286456";
const XLSX_URL = "https://apply.lh.or.kr/lhapply/lhFile.do?fileid=68286463";
const MAP_URL =
  "https://map.naver.com/p/search/%EC%B6%A9%EB%82%A8%20%EC%95%84%EC%82%B0%EC%8B%9C%20%EB%B2%88%EC%98%81%EB%A1%9C217%EB%B2%88%EA%B8%B8%2042";
const PHOTO_URL =
  "https://zippoom.com/%EB%B6%80%EB%8F%99%EC%82%B0/%EC%B6%A9%EB%82%A8-%EC%95%84%EC%82%B0%EC%8B%9C-%EA%B6%8C%EA%B3%A1%EB%8F%99-KN%EC%98%A4%ED%94%BC%EC%8A%A4%ED%85%94/3zlnpk";

type Unit = {
  room: string;
  floor: number;
  area: number;
  deposit: number;
};

type AreaGroup = {
  area: number;
  pyeong: number;
  count: number;
  depositMin: number;
  depositMax: number;
};

type LiveNotice = {
  id: string;
  alertKey?: string;
  title: string;
  source: string;
  type: string;
  status: string;
  postedAt: string;
  closeAt: string;
  location: string;
  units?: number;
  areaLabel?: string;
  url: string;
  archivedAt?: string;
};

type NoticeResponse = {
  notices: LiveNotice[];
  archived?: LiveNotice[];
  checkedAt: string;
  sourceCount: number;
  healthySourceCount: number;
};

type NotificationState = NotificationPermission | "unsupported";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PeriodicSyncManagerLike {
  register(tag: string, options: { minInterval: number }): Promise<void>;
}

const currentNotice: LiveNotice = {
  id: "lh-2015122300020620",
  title: "2026년 2차 든든전세주택 입주자 모집",
  source: "LH청약플러스",
  type: "매입임대",
  status: "공고중",
  postedAt: "2026-08-27",
  closeAt: "2026-09-09",
  location: "아산시 권곡동",
  units: 14,
  areaLabel: "23.6–25.6평",
  url: NOTICE_URL,
};

const units: Unit[] = [
  { room: "202호", floor: 2, area: 79.03, deposit: 155212000 },
  { room: "203호", floor: 2, area: 78.86, deposit: 160648000 },
  { room: "301호", floor: 3, area: 78.08, deposit: 157633000 },
  { room: "302호", floor: 3, area: 79.03, deposit: 158108000 },
  { room: "303호", floor: 3, area: 78.86, deposit: 162091000 },
  { room: "403호", floor: 4, area: 78.86, deposit: 163525000 },
  { room: "501호", floor: 5, area: 78.08, deposit: 160483000 },
  { room: "502호", floor: 5, area: 79.03, deposit: 160995000 },
  { room: "503호", floor: 5, area: 78.86, deposit: 164968000 },
  { room: "602호", floor: 6, area: 79.03, deposit: 160995000 },
  { room: "701호", floor: 7, area: 78.08, deposit: 160483000 },
  { room: "702호", floor: 7, area: 79.03, deposit: 160995000 },
  { room: "703호", floor: 7, area: 78.86, deposit: 164968000 },
  { room: "802호", floor: 8, area: 84.65, deposit: 172441000 },
];

const areaGroups: AreaGroup[] = [78.08, 78.86, 79.03, 84.65].map((area) => {
  const matches = units.filter((unit) => unit.area === area);
  return {
    area,
    pyeong: area / 3.305785,
    count: matches.length,
    depositMin: Math.min(...matches.map((unit) => unit.deposit)),
    depositMax: Math.max(...matches.map((unit) => unit.deposit)),
  };
});

const won = new Intl.NumberFormat("ko-KR");

function wonText(value: number) {
  return won.format(value) + "원";
}

function compactWon(value: number) {
  const eok = value / 100000000;
  return eok.toFixed(2).replace(/0$/, "") + "억원";
}

function applicationStatus() {
  const now = new Date();
  const start = new Date("2026-09-07T10:00:00+09:00");
  const end = new Date("2026-09-09T16:00:00+09:00");
  if (now < start) {
    const days = Math.max(1, Math.ceil((start.getTime() - now.getTime()) / 86400000));
    return { label: "접수 D-" + days, tone: "waiting" };
  }
  if (now <= end) return { label: "접수중", tone: "open" };
  return { label: "접수 마감", tone: "closed" };
}

function shortDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? Number(parts[1]) + ". " + Number(parts[2]) + "." : value;
}

function noticeTone(notice: LiveNotice) {
  if (/(접수중|모집중)/.test(notice.status)) return "open";
  if (!notice.closeAt) return "waiting";
  const end = new Date(notice.closeAt + "T23:59:59+09:00");
  return Date.now() <= end.getTime() ? "waiting" : "closed";
}

function appUrl(path: string) {
  return new URL(path, document.baseURI).href;
}

async function requestNotices(): Promise<NoticeResponse> {
  const url = new URL("data/notices.json", document.baseURI);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("notice-fetch-failed");
  return (await response.json()) as NoticeResponse;
}

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function ExternalButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <a className={"link-button " + variant} href={href} target="_blank" rel="noreferrer">
      {children}
      <ExternalLink size={15} aria-hidden="true" />
    </a>
  );
}

export default function HomePage() {
  const [selectedArea, setSelectedArea] = useState(79.03);
  const [managementFee, setManagementFee] = useState(150000);
  const [converter, setConverter] = useState("79.03");
  const [query, setQuery] = useState("");
  const [sourceState, setSourceState] = useState<"checking" | "ok" | "error">("ok");
  const [checkedAt, setCheckedAt] = useState("2026. 9. 4.");
  const [liveNotices, setLiveNotices] = useState<LiveNotice[]>([currentNotice]);
  const [archivedNotices, setArchivedNotices] = useState<LiveNotice[]>([]);
  const [newNoticeCount, setNewNoticeCount] = useState(0);
  const [notificationState, setNotificationState] = useState<NotificationState>("default");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const status = applicationStatus();
  const selected = areaGroups.find((group) => group.area === selectedArea) ?? areaGroups[0];
  const convertedPyeong = Number(converter) > 0 ? Number(converter) / 3.305785 : 0;
  const filteredNotices = liveNotices.filter((notice) =>
    (notice.title + " " + notice.location + " " + notice.type + " " + notice.source)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  const filteredArchived = archivedNotices.filter((notice) =>
    (notice.title + " " + notice.location + " " + notice.type + " " + notice.source)
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    let active = true;

    async function syncNotices() {
      try {
        const data = await requestNotices();
        if (!active) return;
        setLiveNotices(data.notices);
        setArchivedNotices(data.archived ?? []);
        setSourceState(data.healthySourceCount > 0 ? "ok" : "error");
        setCheckedAt(
          new Intl.DateTimeFormat("ko-KR", {
            year: "numeric",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Seoul",
          }).format(new Date(data.checkedAt)),
        );

        const ids = data.notices.map((notice) => notice.alertKey ?? notice.id);
        const saved = window.localStorage.getItem("asan-rental-known-notices-v2");
        const known = saved ? (JSON.parse(saved) as string[]) : ids;
        const additions = data.notices.filter(
          (notice) => !known.includes(notice.alertKey ?? notice.id),
        );
        window.localStorage.setItem(
          "asan-rental-known-notices-v2",
          JSON.stringify(Array.from(new Set([...known, ...ids])).slice(-100)),
        );
        const unreadSaved = window.localStorage.getItem("asan-rental-unread-notices");
        const unread = unreadSaved ? (JSON.parse(unreadSaved) as string[]) : [];
        const unreadIds = Array.from(
          new Set([...unread, ...additions.map((notice) => notice.alertKey ?? notice.id)]),
        ).slice(-100);
        window.localStorage.setItem("asan-rental-unread-notices", JSON.stringify(unreadIds));
        setNewNoticeCount(unreadIds.length);

        const registration = await navigator.serviceWorker?.ready;
        registration?.active?.postMessage({ type: "SEED_NOTICE_IDS", ids });
        if (
          additions.length > 0 &&
          "Notification" in window &&
          Notification.permission === "granted" &&
          registration
        ) {
          await Promise.all(
            additions.slice(0, 3).map((notice) =>
              registration.showNotification("아산 임대주택 새 공고", {
                body: notice.title,
                icon: appUrl("favicon.svg"),
                badge: appUrl("favicon.svg"),
                tag: "asan-rental-" + (notice.alertKey ?? notice.id),
                data: { url: notice.url },
              }),
            ),
          );
        }
      } catch {
        if (active) setSourceState("error");
      }
    }

    const permissionTimer = window.setTimeout(() => {
      setNotificationState("Notification" in window ? Notification.permission : "unsupported");
    }, 0);
    void navigator.serviceWorker?.register(appUrl("sw.js"));
    void syncNotices();

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void syncNotices();
    }, 15 * 60 * 1000);
    const resumeCheck = () => {
      if (document.visibilityState === "visible") void syncNotices();
    };
    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    document.addEventListener("visibilitychange", resumeCheck);
    window.addEventListener("pageshow", resumeCheck);
    window.addEventListener("online", resumeCheck);
    window.addEventListener("beforeinstallprompt", captureInstall);

    return () => {
      active = false;
      window.clearTimeout(permissionTimer);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resumeCheck);
      window.removeEventListener("pageshow", resumeCheck);
      window.removeEventListener("online", resumeCheck);
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  async function refreshSource() {
    setSourceState("checking");
    try {
      const data = await requestNotices();
      setLiveNotices(data.notices);
      setArchivedNotices(data.archived ?? []);
      setSourceState(data.healthySourceCount > 0 ? "ok" : "error");
      setCheckedAt(
        new Intl.DateTimeFormat("ko-KR", {
          year: "numeric",
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Asia/Seoul",
        }).format(new Date(data.checkedAt)),
      );
    } catch {
      setSourceState("error");
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setNotificationState("unsupported");
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setInstallMessage(
          "iPhone·iPad에서는 Safari의 공유 버튼(□↑) → ‘홈 화면에 추가’로 설치한 뒤 앱에서 다시 눌러주세요.",
        );
      }
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationState(permission);
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.register(appUrl("sw.js"));
    await registration.showNotification("아산집 알리미가 켜졌어요", {
      body: "앞으로 앱에서 새 공고를 확인해 알려드릴게요.",
      icon: appUrl("favicon.svg"),
      badge: appUrl("favicon.svg"),
      tag: "asan-rental-ready",
      data: { url: "/" },
    });

    const periodicSync = (
      registration as ServiceWorkerRegistration & {
        periodicSync?: PeriodicSyncManagerLike;
      }
    ).periodicSync;
    if (periodicSync) {
      try {
        await periodicSync.register("asan-rental-notice-check", {
          minInterval: 6 * 60 * 60 * 1000,
        });
      } catch {
        // Foreground checks remain active when periodic background sync is unavailable.
      }
    }
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallMessage(
        /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? "Safari의 공유 버튼(□↑) → ‘홈 화면에 추가’를 눌러주세요."
          : "브라우저 메뉴(⋮)에서 ‘홈 화면에 추가’ 또는 ‘앱 설치’를 눌러주세요.",
      );
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === "accepted" ? "홈 화면에 설치했어요." : "설치를 취소했어요.");
    setInstallPrompt(null);
  }

  function clearUnreadNotices() {
    window.localStorage.setItem("asan-rental-unread-notices", "[]");
    setNewNoticeCount(0);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a href="#top" className="brand" aria-label="아산집 알리미 홈">
            <span className="brand-mark">
              <House size={21} strokeWidth={2.4} />
            </span>
            <span>
              <b>아산집</b> 알리미
            </span>
          </a>
          <div className="top-actions">
            <span className={"source-state " + sourceState}>
              <span className="source-dot" />
              {sourceState === "checking"
                ? "공식 원문 확인 중"
                : sourceState === "ok"
                  ? "공식 원문 연결됨"
                  : "공식 링크 재확인 필요"}
            </span>
            <button type="button" className="icon-button" onClick={refreshSource} aria-label="공식 원문 상태 새로고침">
              <RefreshCw size={17} className={sourceState === "checking" ? "spin" : ""} />
            </button>
            <button
              type="button"
              className={"notify-chip notification-button " + notificationState}
              onClick={() => setNotificationOpen(true)}
            >
              {notificationState === "granted" ? <BellRing size={16} /> : <Bell size={16} />}
              {notificationState === "granted" ? "앱 알림 켜짐" : "앱 알림 설정"}
              {newNoticeCount > 0 && <span className="notification-count">{newNoticeCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <section className="signal-strip" id="top">
        <div className="signal-inner">
          <span className="new-pill">{newNoticeCount > 0 ? "NEW" : "LIVE"}</span>
          <p>
            현재 확인되는 아산시 모집공고 <b>{liveNotices.length}건</b>
            <span> · 공식 출처를 앱에서 새로 확인합니다.</span>
          </p>
          <button type="button" className="signal-action" onClick={() => setNotificationOpen(true)}>
            {notificationState === "granted" ? "알림 설정됨" : "앱 알림 켜기"} <ChevronRight size={15} />
          </button>
        </div>
      </section>

      <div className="workspace">
        <aside className="notice-panel" aria-label="공고 목록">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">ASAN RENTAL WATCH</p>
              <h1>모집공고</h1>
            </div>
            <span className="count-badge">{liveNotices.length}</span>
          </div>

          <label className="search-box">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="동네·공고명 검색"
              aria-label="공고 검색"
            />
          </label>

          <div className="filter-row" aria-label="임대 유형 필터">
            <button className="filter active" type="button">전체</button>
            <button className="filter" type="button">매입임대</button>
            <button className="filter" type="button">행복주택</button>
          </div>

          <p className="list-label">아산시 · 접수 예정/진행</p>
          <div className="notice-list">
            {filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => {
                const isCurrent = notice.id === currentNotice.id;
                const tone = isCurrent ? status.tone : noticeTone(notice);
                return (
                  <a
                    className={"notice-card " + (isCurrent ? "selected" : "")}
                    href={isCurrent ? "#notice" : notice.url}
                    target={isCurrent ? undefined : "_blank"}
                    rel={isCurrent ? undefined : "noreferrer"}
                    key={notice.id}
                  >
                    <div className="notice-card-top">
                      <span className={"status-badge " + tone}>
                        {isCurrent ? status.label : notice.status}
                      </span>
                      <span>{notice.source} · {notice.type}</span>
                    </div>
                    <h2>{notice.title}</h2>
                    <p>
                      <MapPin size={14} /> {notice.location}
                      {notice.units ? " · " + notice.units + "세대" : ""}
                    </p>
                    <p>
                      <CalendarDays size={14} /> 공고 {shortDate(notice.postedAt)} · {notice.closeAt
                        ? "마감 " + shortDate(notice.closeAt)
                        : "마감일 공고문 확인"}
                    </p>
                    <div className="notice-card-bottom">
                      <b>{notice.areaLabel ?? "공고문에서 면적 확인"}</b>
                      <span>{isCurrent ? "상세 보기" : "원문 보기"} <ChevronRight size={14} /></span>
                    </div>
                  </a>
                );
              })
            ) : (
              <div className="empty-search">
                <Search size={22} />
                <p>일치하는 공고가 없어요.</p>
              </div>
            )}
          </div>

          <details className="archive-box">
            <summary>
              <span>마감 공고 보관함</span>
              <b>{filteredArchived.length}건</b>
            </summary>
            <div className="archive-list">
              {filteredArchived.length > 0 ? (
                filteredArchived.slice(0, 30).map((notice) => (
                  <a href={notice.url} target="_blank" rel="noreferrer" key={notice.id}>
                    <span>{notice.type} · {notice.source}</span>
                    <b>{notice.title}</b>
                    <small>
                      {notice.location} · 공고 {shortDate(notice.postedAt)}
                    </small>
                  </a>
                ))
              ) : (
                <p>보관된 마감 공고가 아직 없어요.</p>
              )}
            </div>
          </details>

          <div className="aside-note">
            <BadgeCheck size={18} />
            <div>
              <b>공식 출처 우선</b>
              <p>LH·마이홈·아산시청 등 공식 원문과 첨부파일을 기준으로 정리합니다.</p>
            </div>
          </div>
        </aside>

        <section className="detail" id="notice">
          <div className="detail-inner">
            <nav className="breadcrumb" aria-label="현재 위치">
              아산시 <ChevronRight size={13} /> 권곡동 <ChevronRight size={13} /> 매입임대
            </nav>

            <section className="hero">
              <div className="hero-copy">
                <div className="hero-badges">
                  <span className={"status-badge large " + status.tone}>{status.label}</span>
                  <span className="type-badge">든든전세 · 비분양전환형</span>
                </div>
                <p className="eyebrow">LH 대전충남지역본부 · 공고일 2026. 8. 27.</p>
                <h2>2026년 2차<br />든든전세주택 입주자 모집</h2>
                <p className="hero-location">
                  <MapPin size={18} />
                  충남 아산시 번영로217번길 42 <span>권곡동 530-13</span>
                </p>
                <div className="hero-actions">
                  <ExternalButton href={NOTICE_URL}>LH 공식 공고</ExternalButton>
                  <ExternalButton href={PDF_URL} variant="secondary">
                    <Download size={15} /> 공고문 PDF
                  </ExternalButton>
                  <ExternalButton href={XLSX_URL} variant="ghost">
                    <FileText size={15} /> 주택목록
                  </ExternalButton>
                </div>
              </div>
              <div className="hero-visual" aria-label="권곡동 임대주택 요약 일러스트">
                <div className="sun" />
                <div className="building">
                  <div className="building-sign">ASAN</div>
                  <div className="windows">
                    {Array.from({ length: 18 }).map((_, index) => (
                      <span key={index} className={index === 14 ? "lit" : ""} />
                    ))}
                  </div>
                  <div className="door" />
                </div>
                <div className="ground-line" />
                <div className="visual-stamp">
                  <b>총 14세대</b>
                  <span>방 3개 · 승강기 있음</span>
                </div>
              </div>
            </section>

            <section className="metrics" aria-label="공고 핵심 수치">
              <Metric label="아산 모집" value="14세대" note="권곡동 한 건물" />
              <Metric label="전용면적" value="23.6–25.6평" note="78.08–84.65㎡" />
              <Metric label="전세보증금" value="1.55–1.72억" note="월 임대료 0원" />
              <Metric label="거주 기간" value="최장 8년" note="2년 단위 · 3회 재계약" />
            </section>

            <section className={"notification-hub " + notificationState} aria-label="새 공고 알림 설정">
              <span className="notification-hub-icon">
                {notificationState === "granted" ? <BellRing size={22} /> : <Bell size={22} />}
              </span>
              <div>
                <b>
                  {notificationState === "granted"
                    ? "새 공고 앱 알림이 켜져 있어요"
                    : "새 공고를 이 앱으로만 받아보세요"}
                </b>
                <p>
                  앱을 열거나 다시 돌아오면 즉시 확인하고, 보는 동안 15분마다 새 공고를 조회합니다.
                </p>
              </div>
              <button type="button" onClick={() => setNotificationOpen(true)}>
                {notificationState === "granted" ? "알림 상태 보기" : "알림 켜기"}
                <ChevronRight size={16} />
              </button>
            </section>

            <Tabs defaultValue="summary" className="notice-tabs">
              <TabsList className="tabs-list">
                <TabsTrigger value="summary">모집 요약</TabsTrigger>
                <TabsTrigger value="cost">평형 · 월비용</TabsTrigger>
                <TabsTrigger value="visuals">사진 · 평면도</TabsTrigger>
              </TabsList>

              <TabsContent value="summary" className="tab-content">
                <div className="content-grid">
                  <section className="content-card application-card">
                    <div className="section-title">
                      <span className="section-icon blue"><CalendarDays size={19} /></span>
                      <div>
                        <p className="eyebrow">APPLICATION</p>
                        <h3>신청 일정</h3>
                      </div>
                    </div>
                    <div className="date-focus">
                      <div>
                        <span>신청 시작</span>
                        <b>9. 7. 월</b>
                        <small>오전 10:00</small>
                      </div>
                      <ArrowRight size={22} />
                      <div>
                        <span>신청 마감</span>
                        <b>9. 9. 수</b>
                        <small>오후 4:00</small>
                      </div>
                    </div>
                    <ol className="timeline">
                      <li className="active">
                        <span />
                        <div><b>온라인 신청</b><small>2026. 9. 7. – 9. 9.</small></div>
                      </li>
                      <li>
                        <span />
                        <div><b>서류제출 대상자 발표</b><small>2026. 9. 11.</small></div>
                      </li>
                      <li>
                        <span />
                        <div><b>대상자 서류 접수</b><small>2026. 9. 14. – 9. 16.</small></div>
                      </li>
                      <li>
                        <span />
                        <div><b>당첨자 발표</b><small>2026. 11. 12.</small></div>
                      </li>
                    </ol>
                    <ExternalButton href={NOTICE_URL}>LH청약플러스에서 신청</ExternalButton>
                  </section>

                  <div className="stack">
                    <section className="content-card">
                      <div className="section-title">
                        <span className="section-icon green"><Check size={19} /></span>
                        <div>
                          <p className="eyebrow">ELIGIBILITY</p>
                          <h3>누가 신청할 수 있나요?</h3>
                        </div>
                      </div>
                      <ul className="check-list">
                        <li><Check size={16} /> 공고일(2026. 8. 27.) 기준 성년인 무주택세대구성원</li>
                        <li><Check size={16} /> 대전·세종·충남에 주민등록이 된 사람</li>
                        <li><Check size={16} /> 소득·자산 기준 없음</li>
                        <li><Check size={16} /> 신생아·미성년 자녀 가점, 동점자는 추첨</li>
                      </ul>
                      <p className="fine-print">
                        세대구성원 범위와 무주택 판단은 반드시 공식 공고문을 확인하세요.
                      </p>
                    </section>

                    <section className="content-card">
                      <div className="section-title">
                        <span className="section-icon amber"><Building2 size={19} /></span>
                        <div>
                          <p className="eyebrow">HOME</p>
                          <h3>주택 정보</h3>
                        </div>
                      </div>
                      <dl className="fact-list">
                        <div><dt>위치</dt><dd>권곡동 KN오피스텔</dd></div>
                        <div><dt>구조</dt><dd>모든 세대 방 3개</dd></div>
                        <div><dt>설비</dt><dd>승강기 있음</dd></div>
                        <div><dt>임대 조건</dt><dd>시세의 80–90% 수준 전세</dd></div>
                        <div><dt>관리 문의</dt><dd><a href="tel:0414252405">041-425-2405</a></dd></div>
                      </dl>
                    </section>
                  </div>
                </div>
                <div className="source-note">
                  <Info size={17} />
                  <p>
                    <b>자료 기준</b> LH 공식 공고문과 공급주택목록. 마지막 원문 확인: {checkedAt}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="cost" className="tab-content">
                <section className="cost-intro">
                  <div>
                    <p className="eyebrow">AREA & MONTHLY COST</p>
                    <h3>평형을 고르면 한 달 비용이 보여요</h3>
                    <p>면적은 전용면적 기준이며, 1평 = 3.305785㎡로 환산했습니다.</p>
                  </div>
                  <div className="conversion-badge">
                    <Ruler size={18} />
                    ㎡ ÷ 3.305785 = 평
                  </div>
                </section>

                <div className="area-selector">
                  {areaGroups.map((group) => (
                    <button
                      type="button"
                      key={group.area}
                      className={"area-option " + (selectedArea === group.area ? "selected" : "")}
                      onClick={() => setSelectedArea(group.area)}
                    >
                      <span>{group.area.toFixed(2)}㎡</span>
                      <b>{group.pyeong.toFixed(1)}평</b>
                      <small>{group.count}세대</small>
                    </button>
                  ))}
                </div>

                <div className="calculator-grid">
                  <section className="content-card cost-card">
                    <div className="section-title">
                      <span className="section-icon blue"><WalletCards size={19} /></span>
                      <div>
                        <p className="eyebrow">SELECTED TYPE</p>
                        <h3>{selected.area.toFixed(2)}㎡ · {selected.pyeong.toFixed(2)}평</h3>
                      </div>
                    </div>
                    <div className="cost-lines">
                      <div>
                        <span>전세보증금</span>
                        <b>
                          {selected.depositMin === selected.depositMax
                            ? compactWon(selected.depositMin)
                            : compactWon(selected.depositMin) + " – " + compactWon(selected.depositMax)}
                        </b>
                      </div>
                      <div>
                        <span>월 임대료 <em>공식</em></span>
                        <b>0원</b>
                      </div>
                      <div>
                        <span>월 관리비 <em className="estimate">직접 입력</em></span>
                        <label className="fee-input">
                          <input
                            inputMode="numeric"
                            value={managementFee}
                            onChange={(event) =>
                              setManagementFee(Math.max(0, Number(event.target.value.replace(/[^0-9]/g, ""))))
                            }
                            aria-label="예상 월 관리비"
                          />
                          <span>원</span>
                        </label>
                      </div>
                    </div>
                    <div className="monthly-total">
                      <span>예상 월 고정 주거비</span>
                      <b>{wonText(managementFee)}</b>
                      <small>월 임대료 0원 + 입력한 관리비</small>
                    </div>
                    <div className="warning-note">
                      <CircleAlert size={17} />
                      <p>
                        관리비는 공식 공고에 공개되지 않았습니다. 기본값 15만원은 비교용 예시이며,
                        전기·가스 등 개별 사용료는 별도입니다.
                      </p>
                    </div>
                  </section>

                  <section className="content-card converter-card">
                    <div className="section-title">
                      <span className="section-icon amber"><Calculator size={19} /></span>
                      <div>
                        <p className="eyebrow">QUICK CONVERTER</p>
                        <h3>㎡를 평으로 바꾸기</h3>
                      </div>
                    </div>
                    <label>
                      <span>전용면적</span>
                      <div className="converter-input">
                        <input
                          value={converter}
                          onChange={(event) => setConverter(event.target.value)}
                          inputMode="decimal"
                          aria-label="제곱미터 면적"
                        />
                        <b>㎡</b>
                      </div>
                    </label>
                    <div className="equals">=</div>
                    <div className="pyeong-result">
                      <strong>{convertedPyeong.toFixed(2)}</strong>
                      <span>평</span>
                    </div>
                    <p>소수 둘째 자리까지 표시한 참고 환산값입니다.</p>
                  </section>
                </div>

                <section className="content-card unit-table-card">
                  <div className="table-heading">
                    <div>
                      <p className="eyebrow">ALL UNITS</p>
                      <h3>세대별 면적·보증금</h3>
                    </div>
                    <span>공식 공급주택목록 기준 · 14세대</span>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>호수</th>
                          <th>층</th>
                          <th>전용면적</th>
                          <th>환산 평수</th>
                          <th>방</th>
                          <th>전세보증금</th>
                        </tr>
                      </thead>
                      <tbody>
                        {units.map((unit) => (
                          <tr key={unit.room}>
                            <td><b>{unit.room}</b></td>
                            <td>{unit.floor}층</td>
                            <td>{unit.area.toFixed(2)}㎡</td>
                            <td><span className="pyeong-chip">{(unit.area / 3.305785).toFixed(2)}평</span></td>
                            <td>3개</td>
                            <td><b>{wonText(unit.deposit)}</b></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="visuals" className="tab-content">
                <section className="visuals-heading">
                  <div>
                    <p className="eyebrow">PHOTOS & FLOOR PLAN</p>
                    <h3>공식 자료만 정확하게 구분해 보여드려요</h3>
                  </div>
                  <span className="verified-label"><BadgeCheck size={16} /> 출처 표시 원칙</span>
                </section>

                <div className="visual-grid">
                  <article className="visual-card unavailable">
                    <div className="plan-placeholder">
                      <div className="mini-plan">
                        <span className="room one">ROOM</span>
                        <span className="room two">ROOM</span>
                        <span className="room three">ROOM</span>
                        <span className="room living">LIVING</span>
                      </div>
                      <span className="locked-label">공식 도면 미제공</span>
                    </div>
                    <div className="visual-card-copy">
                      <span className="availability missing"><CircleAlert size={14} /> 현재 없음</span>
                      <h4>평면도</h4>
                      <p>
                        이번 LH 공고에는 아산 세대의 공식 평면도가 첨부되지 않았습니다.
                        임의의 유사 도면을 대신 보여주지 않습니다.
                      </p>
                    </div>
                  </article>

                  <article className="visual-card unavailable">
                    <div className="photo-placeholder">
                      <div className="skyline">
                        <span />
                        <span />
                        <span />
                      </div>
                      <ImageIcon size={34} />
                      <span className="locked-label">공식 사진 미제공</span>
                    </div>
                    <div className="visual-card-copy">
                      <span className="availability missing"><CircleAlert size={14} /> 현재 없음</span>
                      <h4>건물·내부 사진</h4>
                      <p>
                        공식 모집자료에는 사진이 없습니다. 외부 건물정보는 참고용으로만 확인하세요.
                      </p>
                    </div>
                  </article>
                </div>

                <section className="visual-links">
                  <div>
                    <MapPin size={20} />
                    <span><b>지도·거리뷰</b><small>건물 위치와 주변 환경 확인</small></span>
                    <ExternalButton href={MAP_URL} variant="secondary">네이버지도 열기</ExternalButton>
                  </div>
                  <div>
                    <ImageIcon size={20} />
                    <span><b>외부 건물정보</b><small>비공식 자료 · 실제와 다를 수 있음</small></span>
                    <ExternalButton href={PHOTO_URL} variant="secondary">참고 사진 보기</ExternalButton>
                  </div>
                </section>

                <div className="viewing-note">
                  <Clock3 size={19} />
                  <div>
                    <b>현장 확인은 당첨자·예비입주자 발표 후</b>
                    <p>공급주택목록은 변동될 수 있으므로 계약 전 실제 주택 상태와 관리비를 꼭 확인하세요.</p>
                  </div>
                  <a href="tel:0414252405"><Phone size={15} /> 041-425-2405</a>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <footer>
        <div>
          <span className="brand footer-brand">
            <span className="brand-mark"><House size={18} /></span>
            <span><b>아산집</b> 알리미</span>
          </span>
          <p>공식 원문을 빠르게 비교할 수 있도록 정리한 공개 알림·조회 서비스입니다.</p>
        </div>
        <p>계약·신청 전 반드시 LH 공식 공고문을 확인하세요.</p>
      </footer>

      <Dialog open={notificationOpen} onOpenChange={setNotificationOpen}>
        <DialogContent className="notification-dialog">
          <DialogHeader>
            <span className="dialog-bell"><BellRing size={24} /></span>
            <DialogTitle>새 공고 앱 알림 받기</DialogTitle>
            <DialogDescription>
              별도 회원가입 없이 이 기기에서 아산 임대주택 새 공고를 확인합니다.
            </DialogDescription>
          </DialogHeader>

          <div className={"permission-status " + notificationState}>
            <span className="source-dot" />
            <div>
              <b>
                {notificationState === "granted"
                  ? "알림 허용됨"
                  : notificationState === "denied"
                    ? "알림이 차단됨"
                    : notificationState === "unsupported"
                      ? "이 브라우저는 알림을 지원하지 않음"
                      : "아직 알림을 허용하지 않음"}
              </b>
              <p>
                {notificationState === "denied"
                  ? "휴대폰 설정에서 이 사이트의 알림 권한을 허용해야 합니다."
                  : "새 공고가 확인되면 앱 안의 알림과 휴대폰 알림으로 알려드려요."}
              </p>
            </div>
          </div>

          <div className="notification-steps">
            <div>
              <span>1</span>
              <div><b>알림 허용</b><p>아래 버튼을 누르고 브라우저 질문에서 허용을 선택하세요.</p></div>
            </div>
            <div>
              <span>2</span>
              <div><b>홈 화면에 설치</b><p>설치해 두면 앱처럼 바로 열고 백그라운드 확인을 요청할 수 있어요.</p></div>
            </div>
            <div>
              <span>3</span>
              <div><b>앱을 가끔 열기</b><p>다시 열 때마다 즉시 확인해 놓친 공고를 알림함에 반영합니다.</p></div>
            </div>
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-primary"
              onClick={enableNotifications}
              disabled={notificationState === "granted" || notificationState === "unsupported"}
            >
              <Bell size={17} />
              {notificationState === "granted" ? "알림이 켜져 있어요" : "이 기기에서 알림 허용"}
            </button>
            <button type="button" className="dialog-secondary" onClick={installApp}>
              <Smartphone size={17} />
              홈 화면에 앱 설치
            </button>
          </div>
          {newNoticeCount > 0 && (
            <button type="button" className="clear-unread" onClick={clearUnreadNotices}>
              새 알림 {newNoticeCount}건 읽음 처리
            </button>
          )}
          {installMessage && <p className="install-message">{installMessage}</p>}

          <div className="background-caveat">
            <Info size={16} />
            <p>
              앱을 완전히 닫은 동안의 백그라운드 확인은 기기 절전 설정과 브라우저 정책에 따라
              늦어질 수 있습니다. iPhone은 홈 화면에 설치한 뒤 알림을 허용해 주세요. 앱을 열면 즉시
              최신 공고를 다시 확인합니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

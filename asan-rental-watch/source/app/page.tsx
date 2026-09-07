"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { filterNotices, isClosed, noticeStatus, splitNotices, readStringList, saveStringList } from "@/lib/notices";
import type { LiveNotice, NoticeResponse } from "@/lib/notices";
import { connectPush, deviceToken, disconnectPush, pushRequest, type PushDevice } from "@/lib/push";
import { pushPlatform } from "@/lib/push-platform";
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

type NotificationState = NotificationPermission | "unsupported";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const currentNotice: LiveNotice = {
  id: "lh-2015122300020620",
  title: "2026년 2차 든든전세주택 입주자 모집",
  source: "LH청약플러스",
  type: "매입임대",
  status: "공고중",
  postedAt: "2026-08-27",
  closeAt: "2026-09-09",
  applicationStartAt: "2026-09-07T10:00:00+09:00",
  applicationEndAt: "2026-09-09T16:00:00+09:00",
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

function shortDate(value: string) {
  const parts = value.split("-");
  return parts.length === 3 ? Number(parts[1]) + ". " + Number(parts[2]) + "." : value;
}

function appUrl(path: string) {
  return new URL(path, document.baseURI).href;
}

async function requestNotices(): Promise<NoticeResponse> {
  const url = new URL("data/notices.json", document.baseURI);
  url.searchParams.set("t", String(Date.now()));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error("notice-fetch-failed");
  const data = await response.json() as NoticeResponse;
  if (!Array.isArray(data.notices) || !Number.isFinite(Date.parse(data.checkedAt)) ||
      data.notices.some(notice => !notice.id || !notice.title || !notice.url) ||
      (data.archived !== undefined && !Array.isArray(data.archived))) throw new Error("invalid-notice-data");
  return data;
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
  const [sourceState, setSourceState] = useState<"checking" | "ok" | "error">("checking");
  const [noticeData, setNoticeData] = useState<NoticeResponse | null>(null);
  const [now, setNow] = useState(Date.now());
  const [typeFilter, setTypeFilter] = useState("전체");
  const [sort, setSort] = useState("deadline");
  const [selectedNoticeId, setSelectedNoticeId] = useState(currentNotice.id);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [newNoticeCount, setNewNoticeCount] = useState(0);
  const [notificationState, setNotificationState] = useState<NotificationState>("default");
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [pushDevice, setPushDevice] = useState<PushDevice | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [platform, setPlatform] = useState(() => pushPlatform());
  const pushConnected = notificationState === "granted" && pushDevice?.connected === true;
  const lastReceipt = pushDevice?.receipts?.find(receipt => receipt.received_at);
  const pushVerified = pushConnected && !!lastReceipt && !pushDevice?.receipts?.some(receipt => !receipt.sent_at && receipt.last_error);
  const pushHealthStale = pushDevice?.health && (!pushDevice.health.checkedAt || Date.now() - Date.parse(pushDevice.health.checkedAt) > 90 * 60000 || pushDevice.health.stale);
  const refreshPush = useCallback(async () => {
    try {
      setNotificationState("Notification" in window ? Notification.permission : "unsupported");
      if (!("serviceWorker" in navigator) || !deviceToken()) { setPushDevice(null); return; }
      const registration = await navigator.serviceWorker.getRegistration(appUrl("./"));
      if (!await registration?.pushManager.getSubscription()) { setPushDevice(null); return; }
      setPushDevice(await pushRequest<PushDevice>("/device"));
    } catch { setPushDevice(null); }
  }, []);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installMessage, setInstallMessage] = useState("");
  const { live: liveNotices, archived: archivedNotices } = noticeData ? splitNotices(noticeData, now) : { live: [], archived: [] };
  const selectedNotice = [...liveNotices, ...archivedNotices].find(notice => notice.id === selectedNoticeId) ?? liveNotices[0] ?? archivedNotices[0] ?? null;
  const isFeatured = selectedNotice?.id === currentNotice.id;
  const featuredNotice = isFeatured ? { ...currentNotice, ...selectedNotice } : currentNotice;
  const status = noticeStatus(featuredNotice, now);
  const checkedAt = noticeData ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(noticeData.checkedAt)) : "아직 확인하지 못함";
  const stale = noticeData !== null && now - Date.parse(noticeData.checkedAt) > 90 * 60 * 1000;
  const sourceHealth = noticeData?.sourceHealth ?? {};
  const healthyCount = noticeData?.healthySourceCount ?? 0;
  const sourceCount = noticeData?.sourceCount ?? 5;
  const partial = healthyCount < sourceCount;
  const types = [...new Set([...liveNotices, ...archivedNotices].map(notice => notice.type))].sort();
  const selected = areaGroups.find((group) => group.area === selectedArea) ?? areaGroups[0];
  const convertedPyeong = Number.isFinite(Number(converter)) && Number(converter) > 0 ? Number(converter) / 3.305785 : 0;
  const filteredNotices = filterNotices(liveNotices, query, typeFilter, sort);
  const filteredArchived = filterNotices(archivedNotices, query, typeFilter, "newest");

  const refreshSource = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSourceState("checking");
    try {
      const data = await requestNotices();
      if (!mounted.current) return;
      setNoticeData(data);
      setNow(Date.now());
      setSourceState("ok");
      const live = splitNotices(data).live;
      const ids = live.map(notice => notice.alertKey ?? notice.id);
      const known = readStringList("asan-rental-known-notices-v2") ?? ids;
      const additions = ids.filter(id => !known.includes(id));
      saveStringList("asan-rental-known-notices-v2", [...new Set([...known, ...ids])]);
      const unread = [...new Set([...(readStringList("asan-rental-unread-notices") ?? []), ...additions])];
      saveStringList("asan-rental-unread-notices", unread);
      setNewNoticeCount(unread.length);

    } catch {
      if (mounted.current) setSourceState("error");
    } finally { inFlight.current = false; }
  }, []);

  useEffect(() => {
    mounted.current = true;
    setPlatform(pushPlatform(navigator.userAgent, navigator.maxTouchPoints, window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true));
    setNotificationState("Notification" in window ? Notification.permission : "unsupported");
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(appUrl("sw.js")).then(() => navigator.serviceWorker.ready).then(registration => {
        if (mounted.current) void refreshPush();
      }).catch(() => setInstallMessage("앱 알림을 시작하지 못했습니다. 인터넷 연결을 확인하고 홈 화면의 앱을 다시 열어 주세요."));
    }
    void refreshSource();
    const interval = window.setInterval(() => {
      setNow(Date.now());
      if (document.visibilityState === "visible") { void refreshSource(); void refreshPush(); }
    }, 60 * 1000);
    const resumeCheck = () => {
      if (document.visibilityState === "visible") { setNow(Date.now()); void refreshSource(); void refreshPush(); }
    };
    const captureInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    document.addEventListener("visibilitychange", resumeCheck);
    window.addEventListener("pageshow", resumeCheck);
    window.addEventListener("online", resumeCheck);
    window.addEventListener("beforeinstallprompt", captureInstall);
    return () => {
      mounted.current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", resumeCheck);
      window.removeEventListener("pageshow", resumeCheck);
      window.removeEventListener("online", resumeCheck);
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, [refreshSource, refreshPush]);

  function selectNotice(notice: LiveNotice) {
    setSelectedNoticeId(notice.id);
    document.getElementById("notice")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function testPush() {
    setPushBusy(true);
    setPushMessage("시험 알림을 보내는 중입니다…");
    try {
      const result = await pushRequest<{ eventId: string }>("/test", "POST");
      setPushMessage("서버가 시험 알림을 보냈습니다. 휴대폰 알림창을 확인해 주세요.");
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(resolve => window.setTimeout(resolve, 2000));
        const device = await pushRequest<PushDevice>("/device");
        if (!mounted.current) return;
        setPushDevice(device);
        if (device.receipts.some(receipt => receipt.id === result.eventId && receipt.received_at)) {
          setPushMessage("기기에서 시험 알림 표시가 확인됐어요. 알림창에서 ‘아산집 알리미’를 확인해 주세요.");
          return;
        }
      }
      setPushMessage("발송은 접수됐지만 기기의 표시 확인이 아직 없습니다. " + platform.permissionHelp);
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "시험 알림에 실패했습니다. 다시 시도해 주세요."); }
    finally { setPushBusy(false); }
  }

  async function enableNotifications() {
    if (platform.needsHomeScreen) { setPushMessage(platform.installHelp); return; }
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setNotificationState("unsupported");
      setPushMessage("안드로이드 Chrome에서 앱을 열어 주세요. iPhone은 Safari에서 홈 화면에 설치한 뒤 알림을 허용해야 합니다.");
      return;
    }
    setPushBusy(true);
    setPushMessage("이 기기의 알림을 연결하고 있습니다…");
    try {
      const permission = await Notification.requestPermission();
      setNotificationState(permission);
      if (permission !== "granted") { setPushMessage("휴대폰의 사이트 알림 권한에서 허용을 선택해 주세요."); return; }
      await navigator.serviceWorker.register(appUrl("sw.js"));
      const registration = await navigator.serviceWorker.ready;
      await connectPush(registration);
      await refreshPush();
      await testPush();
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "알림 연결에 실패했습니다. 다시 시도해 주세요."); }
    finally { setPushBusy(false); }
  }

  async function disableNotifications() {
    setPushBusy(true);
    try {
      await disconnectPush(await navigator.serviceWorker.getRegistration(appUrl("./")));
      setPushDevice(null);
      setPushMessage("이 기기의 아산집 알리미 알림을 껐습니다.");
    } catch (error) { setPushMessage(error instanceof Error ? error.message : "연결 상태를 확인하고 다시 시도해 주세요."); }
    finally { setPushBusy(false); }
  }

  async function installApp() {
    if (!installPrompt) {
      setInstallMessage(
        platform.installHelp,
      );
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallMessage(choice.outcome === "accepted" ? "홈 화면에 설치했어요." : "설치를 취소했어요.");
    setInstallPrompt(null);
  }

  function clearUnreadNotices() {
    saveStringList("asan-rental-unread-notices", []);
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
            <span className={"source-state " + (stale || partial ? "warning" : sourceState)}>
              <span className="source-dot" />
              {sourceState === "checking"
                ? "공고 데이터 불러오는 중"
                : sourceState === "ok"
                  ? stale ? "갱신 지연" : partial ? `출처 ${healthyCount}/${sourceCount}곳 확인` : "전체 출처 확인 완료"
                  : "공고 데이터 연결 실패"}
            </span>
            <button type="button" className="icon-button" onClick={refreshSource} disabled={sourceState === "checking"} aria-label="공고 데이터 새로고침">
              <RefreshCw size={17} className={sourceState === "checking" ? "spin" : ""} />
            </button>
            <button
              type="button"
              className={"notify-chip notification-button " + notificationState}
              onClick={() => setNotificationOpen(true)}
            >
              {pushConnected ? <BellRing size={16} /> : <Bell size={16} />}
              {pushVerified ? "알림 수신 확인됨" : pushConnected ? "알림 시험 필요" : "앱 알림 설정"}
              {newNoticeCount > 0 && <span className="notification-count">{newNoticeCount}</span>}
            </button>
          </div>
        </div>
      </header>

      <section className="signal-strip" id="top">
        <div className="signal-inner">
          <span className="new-pill">{newNoticeCount > 0 ? "NEW" : "LIVE"}</span>
          <p>
            아산시 모집·확인 대상 <b>{noticeData ? liveNotices.length + "건" : "확인 중"}</b>
            <span> · 공식 출처 30분 간격 확인 · 신청 전 원문 확인</span>
          </p>
          <button type="button" className="signal-action" onClick={() => setNotificationOpen(true)}>
            {pushVerified ? "알림 수신 확인됨" : pushConnected ? "알림 시험 필요" : "앱 알림 켜기"} <ChevronRight size={15} />
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
            {["전체", ...types].map(type => <button key={type} className={"filter " + (typeFilter === type ? "active" : "")} type="button" aria-pressed={typeFilter === type} onClick={() => setTypeFilter(type)}>{type}</button>)}
          </div>
          <label className="sort-control">정렬
            <select value={sort} onChange={event => setSort(event.target.value)} aria-label="공고 정렬">
              <option value="deadline">마감 가까운 순</option><option value="newest">최근 공고 순</option>
            </select>
          </label>
          <p className="list-label" aria-live="polite">진행·확인 대상 {filteredNotices.length}건 · 보관 {filteredArchived.length}건</p>
          <div className="notice-list">
            {filteredNotices.length > 0 ? (
              filteredNotices.map((notice) => {
                const isCurrent = notice.id === selectedNotice?.id;
                const display = noticeStatus(notice, now);
                const tone = display.tone;
                return (
                  <button type="button"
                    className={"notice-card " + (isCurrent ? "selected" : "")}
                    onClick={() => selectNotice(notice)} aria-pressed={isCurrent}
                    key={notice.id}
                  >
                    <div className="notice-card-top">
                      <span className={"status-badge " + tone}>
                        {display.label}
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
                      <span>공고 확인 <ChevronRight size={14} /></span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="empty-search">
                <Search size={22} />
                <p>{sourceState === "checking" && !noticeData ? "공고를 불러오고 있어요." : !noticeData ? "공고를 불러오지 못했습니다. 새로고침하거나 아래 공식 출처를 열어 주세요." : "일치하는 공고가 없어요."}</p>
              </div>
            )}
          </div>

          <details className="archive-box">
            <summary>
              <span>마감·종료 공고 보관함</span>
              <b>{filteredArchived.length}건</b>
            </summary>
            <div className="archive-list">
              {filteredArchived.length > 0 ? (
                filteredArchived.map((notice) => (
                  <button type="button" onClick={() => selectNotice(notice)} key={notice.id}>
                    <span>{notice.type} · {notice.source}</span>
                    <b>{notice.title}</b>
                    <small>
                      {notice.location} · 공고 {shortDate(notice.postedAt)}
                    </small>
                  </button>
                ))
              ) : (
                <p>보관된 마감 공고가 아직 없어요.</p>
              )}
            </div>
          </details>

          <section className={"source-health-panel " + (stale || partial || sourceState === "error" ? "attention" : "")} aria-label="공식 출처 확인 상태">
            <h2>확인 현황 <span>{healthyCount}/{sourceCount}</span></h2>
            <p>마지막 수집 시도: {checkedAt} (한국시간)</p>
            {(stale || partial || sourceState === "error") && <p role="status">{sourceState === "error" ? "데이터 연결이 끊겨 이전 자료를 표시합니다." : stale ? "90분 이상 갱신되지 않았습니다. 원문을 직접 확인해 주세요." : "일부 출처를 확인하지 못했습니다. 이전 공고를 유지합니다."}</p>}
            {[
              ["LH청약플러스", "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancList.do?cnpCd=44&mi=1026"],
              ["마이홈포털", "https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcView.do"],
              ["아산시청", "https://www.asan.go.kr/main/cms/?no=257"],
              ["충남개발공사", "https://apply.cndc.kr/sr2010/list.do?key=2404080070"],
              ["주택관리공단", "https://www.kohom.or.kr/web/mainComm/HM001002002.do"],
            ].map(([name, url]) => <a href={url} target="_blank" rel="noreferrer" key={name}><span>{name}</span><b className={sourceHealth[name] === true && !stale ? "healthy" : "unhealthy"}>{sourceHealth[name] === undefined ? "대기" : stale ? "갱신 지연" : sourceHealth[name] ? "확인 완료" : "확인 실패"}</b><ExternalLink size={13} /></a>)}
          </section>
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
            <section className="reliable-alerts" aria-label="공고 알림 안내">
              <BellRing size={21} /><div><b>{platform.isIOS ? "아이폰 홈 화면에 설치하고 공고 알림을 받으세요" : "안드로이드에서 앱을 닫아도 공고 알림을 받으세요"}</b><p>알림을 연결하면 새 공고와 중요 변경, 신청 시작일과 마감 3일 전·1일 전·당일에 알려드립니다. 시험 알림으로 이 기기의 수신 상태를 확인하세요.</p></div>
              <a href="https://apply.lh.or.kr/lhapply/co/lo/itr/updateMberPage.do?mi=1291" target="_blank" rel="noreferrer">LH 알리미 설정 <ExternalLink size={14} /></a>
            </section>
            {!selectedNotice ? <section className="content-card"><h2>공고 확인 중</h2><p>왼쪽 공식 출처에서 모집공고를 직접 확인할 수 있습니다.</p></section> : !isFeatured ? <section className="content-card generic-detail">
              <span className={"status-badge " + noticeStatus(selectedNotice, now).tone}>{noticeStatus(selectedNotice, now).label}</span>
              <p className="eyebrow">{selectedNotice.source} · {selectedNotice.type}</p>
              <h2>{selectedNotice.title}</h2><p><MapPin size={17} /> {selectedNotice.location}</p>
              <dl className="fact-list"><div><dt>공고일</dt><dd>{selectedNotice.postedAt || "원문 확인"}</dd></div><div><dt>신청 마감</dt><dd>{selectedNotice.applicationEndAt ? new Date(selectedNotice.applicationEndAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : selectedNotice.closeAt || "원문 확인 필요"}</dd></div><div><dt>면적·보증금·월세</dt><dd>공식 공고문·공급목록 확인</dd></div></dl>
              <p>자격·관리비·사진·평면도는 이 공고의 공식 첨부자료에서 확인해 주세요. 상세 자료를 아직 정리하지 못한 공고도 목록에 포함합니다.</p>
              {selectedNotice.needsVerification && <p className="warning-note">이번 수집에서 현재 상태를 확인하지 못했습니다. 마감으로 단정하지 않고 보관 중입니다.</p>}
              <ExternalButton href={selectedNotice.url}>{isClosed(selectedNotice, now) ? "보관 공고 원문 보기" : "공식 원문에서 일정·신청 확인"}</ExternalButton>
            </section> : <>
            {isClosed(featuredNotice, now) && <p className="archive-banner" role="status">접수가 마감된 보관 공고입니다. 아래 내용은 당시 모집 정보입니다.</p>}
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
                {pushConnected ? <BellRing size={22} /> : <Bell size={22} />}
              </span>
              <div>
                <b>
                  {pushConnected
                    ? pushVerified ? "이 기기의 알림 표시를 확인했어요" : "연결 완료 · 시험 알림으로 수신을 확인하세요"
                    : "새 공고를 아산집 알리미에서 받으세요"}
                </b>
                <p>
                  공식 사이트를 약 30분마다 확인하고, 새 공고를 발견하면 앱 알림을 보냅니다.
                </p>
              </div>
              <button type="button" onClick={() => setNotificationOpen(true)}>
                {pushConnected ? "알림 상태 보기" : "알림 켜기"}
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
                    <ExternalButton href={NOTICE_URL}>{isClosed(featuredNotice, now) ? "보관 공고 원문 보기" : "LH청약플러스에서 신청"}</ExternalButton>
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
                    <b>자료 기준</b> 2026. 8. 27. LH 공고문·공급주택목록을 정리한 자료입니다. 자동 수집 시각은 위 출처 현황에 표시하며, 세부 조건 변경은 최신 원문을 확인하세요.
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
            </>}
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
              {platform.isIOS ? "iOS 16.4 이상 · 홈 화면에 설치하면 앱을 닫아도 알림을 받습니다." : "안드로이드 기본 · 회원가입 없이 앱을 닫아도 공고 알림을 받습니다."}
            </DialogDescription>
          </DialogHeader>

          <div className={"permission-status " + notificationState}>
            <span className="source-dot" />
            <div>
              <b>
                {pushConnected
                  ? pushVerified ? "기기 알림 표시 확인됨" : "서버 연결됨 · 기기 수신 확인 필요"
                  : platform.needsHomeScreen
                    ? "아이폰 홈 화면에서 앱을 열어 주세요"
                  : notificationState === "granted"
                    ? "기기 권한 허용 · 서버 연결 필요"
                  : notificationState === "denied"
                    ? "알림이 차단됨"
                    : notificationState === "unsupported"
                      ? "이 브라우저는 알림을 지원하지 않음"
                      : "아직 알림을 허용하지 않음"}
              </b>
              <p>
                {notificationState === "denied"
                  ? platform.permissionHelp
                  : platform.needsHomeScreen ? platform.installHelp
                  : "신규·중요 변경 공고가 확인되면 휴대폰 알림창에 표시합니다."}
              </p>
            </div>
          </div>

          <div className="notification-steps">
            <div>
              <span>1</span>
              <div><b>{platform.isIOS ? "Safari에서 홈 화면에 설치" : "Chrome에서 앱 설치"}</b><p>{platform.installHelp}</p></div>
            </div>
            <div>
              <span>2</span>
              <div><b>앱 알림 연결</b><p>{platform.isIOS ? "홈 화면의 앱을 연 뒤 ‘알림 연결’ 버튼을 직접 누르고 권한을 허용하세요." : "아래 ‘알림 연결’ 버튼을 누르고 알림 권한을 허용하세요."}</p></div>
            </div>
            <div>
              <span>3</span>
              <div><b>시험 알림 확인</b><p>휴대폰 위쪽 알림창에서 ‘아산집 알리미’ 시험 알림이 보이는지 확인하세요.</p></div>
            </div>
          </div>

          <div className="dialog-actions">
            <button
              type="button"
              className="dialog-primary"
              onClick={enableNotifications}
              disabled={pushBusy || pushConnected || platform.needsHomeScreen || notificationState === "unsupported"}
            >
              <Bell size={17} />
              {pushBusy ? "확인 중…" : pushConnected ? "앱 알림 연결됨" : "이 기기에서 알림 연결"}
            </button>
            <button type="button" className="dialog-secondary" onClick={installApp}>
              <Smartphone size={17} />
              홈 화면에 앱 설치
            </button>
          </div>
          {pushConnected && <div className="dialog-actions">
            <button type="button" className="dialog-primary" disabled={pushBusy} onClick={testPush}><BellRing size={17} />시험 알림 보내기</button>
            <button type="button" className="dialog-secondary" disabled={pushBusy} onClick={disableNotifications}>이 기기 알림 끄기</button>
          </div>}
          {pushMessage && <p className="install-message" role="status">{pushMessage}</p>}
          {lastReceipt && <p className="install-message">최근 기기 표시 확인: {new Date(lastReceipt.received_at!).toLocaleString("ko-KR")}</p>}
          {pushHealthStale && <p className="install-message" role="alert">자동 알림 확인이 지연되고 있습니다. 공식 공고를 직접 확인해 주세요.</p>}
          {newNoticeCount > 0 && (
            <button type="button" className="clear-unread" onClick={clearUnreadNotices}>
              새 알림 {newNoticeCount}건 읽음 처리
            </button>
          )}
          {installMessage && <p className="install-message">{installMessage}</p>}
          {!platform.isIOS && <p className="install-message">아이폰도 iOS 16.4 이상에서 지원합니다. Safari → 공유 → 홈 화면에 추가한 뒤, 설치한 앱에서 알림을 허용하세요.</p>}

          <div className="background-caveat">
            <Info size={16} />
            <p>
              공고 확인은 약 30분 간격이며 점검 지연이 생길 수 있습니다. 휴대폰이 꺼져 있거나 인터넷·알림 권한·배터리 제한으로 알림이 늦어질 수 있으니 시험 알림을 꼭 확인하세요. 구독 정보와 발송·표시 확인 기록을 저장하며, ‘이 기기 알림 끄기’로 구독을 삭제할 수 있습니다.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

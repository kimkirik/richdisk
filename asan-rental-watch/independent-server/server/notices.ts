export type LiveNotice = {
  id: string;
  alertKey?: string;
  title: string;
  source: string;
  type: string;
  status: string;
  postedAt: string;
  closeAt: string;
  applicationStartAt?: string;
  applicationEndAt?: string;
  location: string;
  units?: number;
  areaLabel?: string;
  url: string;
  archivedAt?: string;
  missingChecks?: number;
  needsVerification?: boolean;
  lastSeenAt?: string;
  contentKey?: string;
};

export type NoticeResponse = {
  notices: LiveNotice[];
  archived?: LiveNotice[];
  checkedAt: string;
  sourceCount: number;
  healthySourceCount: number;
  sourceHealth?: Record<string, boolean>;
};

export function koreanToday(now = Date.now()) {
  return new Date(now + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function deadline(notice: LiveNotice) {
  // A date without a confirmed time remains valid through the Korean calendar day.
  return notice.applicationEndAt ? Date.parse(notice.applicationEndAt)
    : notice.closeAt ? Date.parse(notice.closeAt + "T23:59:59.999+09:00") : Infinity;
}

export function isClosed(notice: LiveNotice, now = Date.now()) {
  return Boolean(notice.archivedAt) || /마감|취소|종료/.test(notice.status) || deadline(notice) < now;
}

export function noticeStatus(notice: LiveNotice, now = Date.now()) {
  if (isClosed(notice, now)) return { label: /취소/.test(notice.status) ? "모집 취소" : "접수 마감", tone: "closed" };
  if (notice.needsVerification) return { label: "현재 상태 확인 필요", tone: "waiting" };
  if (notice.applicationStartAt && now < Date.parse(notice.applicationStartAt)) return { label: "접수 예정", tone: "waiting" };
  if (/접수중|모집중/.test(notice.status) || (notice.applicationStartAt && now >= Date.parse(notice.applicationStartAt))) return { label: "접수중", tone: "open" };
  return { label: notice.status || "공고중", tone: "waiting" };
}

export function splitNotices(data: NoticeResponse, now = Date.now()) {
  const live = data.notices.filter(notice => !isClosed(notice, now));
  const archived = new Map((data.archived ?? []).map(notice => [notice.id, notice]));
  for (const notice of data.notices) if (isClosed(notice, now)) archived.set(notice.id, { ...notice, status: "마감" });
  for (const notice of live) archived.delete(notice.id);
  return { live, archived: [...archived.values()] };
}

export function filterNotices(notices: LiveNotice[], query: string, type: string, sort: string) {
  const needle = query.trim().toLocaleLowerCase();
  return notices.filter(notice => (type === "전체" || notice.type === type) &&
    [notice.title, notice.location, notice.type, notice.source].join(" ").toLocaleLowerCase().includes(needle))
    .sort((a, b) => (sort === "deadline" ? (deadline(a) - deadline(b)) || 0 : 0) || b.postedAt.localeCompare(a.postedAt));
}

export function readStringList(key: string): string[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) && value.every(item => typeof item === "string") ? value : null;
  } catch { return null; }
}

export function saveStringList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browsing remains usable when storage is unavailable. */ }
}

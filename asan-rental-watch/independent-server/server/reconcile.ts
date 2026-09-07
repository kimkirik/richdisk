import { isClosed, koreanToday } from "./notices.ts";
import type { LiveNotice as Notice } from "./notices.ts";

export type ScanResult = { healthy: boolean; notices: Notice[] };
export type SourceScan = { source: string; result: ScanResult };

export function stableId(prefix: string, value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 33) ^ value.charCodeAt(index);
  return prefix + "-" + (hash >>> 0).toString(36);
}

export function noticeAlertKey(notice: Notice) {
  return notice.id + ":" + stableId("change", JSON.stringify([
    notice.title, notice.status, notice.postedAt, notice.closeAt, notice.location,
    notice.units ?? null, notice.areaLabel ?? null,
    notice.applicationStartAt ?? null, notice.applicationEndAt ?? null, notice.contentKey ?? null,
  ]));
}

export function reconcileNotices(previous: { notices?: Notice[]; archived?: Notice[] }, scans: SourceScan[], now = Date.now()) {
  const today = koreanToday(now);
  const archivedById = new Map((previous.archived ?? []).map(notice => [notice.id, notice]));
  const previousById = new Map([...(previous.archived ?? []), ...(previous.notices ?? [])].map(notice => [notice.id, notice]));
  const byId = new Map<string, Notice>();
  for (const scan of scans) {
    for (const notice of scan.result.notices) {
      if (byId.has(notice.id)) continue;
      const old = previousById.get(notice.id);
      const fallback = old?.source === "LH청약플러스" && notice.source !== old.source;
      // A portal's shorter title/missing deadline is not an official correction.
      const record = fallback ? { ...old, needsVerification: true } : { ...notice, needsVerification: notice.needsVerification ?? false };
      if (!fallback) delete record.archivedAt;
      byId.set(notice.id, { ...record, missingChecks: 0, lastSeenAt: new Date(now).toISOString() });
    }
  }
  for (const old of previous.notices ?? []) {
    if (byId.has(old.id)) continue;
    const healthy = scans.find(scan => scan.source === old.source)?.result.healthy;
    const missingChecks = (old.missingChecks ?? 0) + (healthy ? 1 : 0);
    // A missing row is not evidence of closure: pagination, source outages and
    // parser changes must never silently hide an opportunity with no known end.
    byId.set(old.id, { ...old, missingChecks, needsVerification: !healthy || missingChecks > 0 });
  }
  for (const [id, notice] of byId) {
    if (isClosed(notice, now)) {
      archivedById.set(id, { ...notice, status: /취소/.test(notice.status) ? "모집 취소" : "마감", archivedAt: notice.archivedAt || today, missingChecks: 0 });
      byId.delete(id);
    } else archivedById.delete(id);
  }
  const decorate = (notice: Notice) => ({ ...notice, alertKey: noticeAlertKey(notice) });
  return {
    notices: [...byId.values()].map(decorate).sort((a, b) => b.postedAt.localeCompare(a.postedAt)),
    // Preserve the complete archive; the UI filters it rather than discarding records.
    archived: [...archivedById.values()].map(decorate).sort((a, b) => (b.archivedAt || b.closeAt || b.postedAt).localeCompare(a.archivedAt || a.closeAt || a.postedAt)),
  };
}

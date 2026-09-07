import type { LiveNotice as Notice } from "./notices.ts";
import { koreanToday } from "./notices.ts";
import { reconcileNotices, stableId } from "./reconcile.ts";
import type { ScanResult } from "./reconcile.ts";

const LH_LIST =
  "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancList.do?cnpCd=44&mi=1026";
const ASAN_NOTICE_SEARCH =
  "https://www.asan.go.kr/main/cms/?no=257&m_mode=list&sltOption=1&category=srt&txtKeyword=%EC%9E%85%EC%A3%BC%EC%9E%90&yearOption=";
const ASAN_HOUSING_SEARCH =
  "https://www.asan.go.kr/main/cms/?no=105&m_mode=list&sltOption=1&txtKeyword=%EC%9E%84%EB%8C%80&yearOption=";
const CNDC_LIST = "https://apply.cndc.kr/sr2010/list.do?key=2404080070";
const KOHOM_LIST =
  "https://www.kohom.or.kr/web/mainComm/HM001002002.do?mode=list&page=1&divType=1&schDo=1100000&schCon=1&schStr=%EC%95%84%EC%82%B0";
const MYHOME_LIST =
  "https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcList.do";

const CURRENT_NOTICE: Notice = {
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
  url: "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?aisTpCd=26&ccrCnntSysDsCd=03&mi=1026&panId=2015122300020620&uppAisTpCd=13",
};

function normalizeDate(value: string) {
  return value.replaceAll(".", "-").replace(/-$/, "");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&middot;/gi, "·")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#40;/gi, "(")
    .replace(/&#41;/gi, ")")
    .replace(/&#91;/gi, "[")
    .replace(/&#93;/gi, "]")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function cleanHtml(value: string) {
  return decodeEntities(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function typeFromTitle(title: string, fallback = "공공임대") {
  if (title.includes("영구임대")) return "영구임대";
  if (title.includes("국민임대")) return "국민임대";
  if (title.includes("행복주택")) return "행복주택";
  if (title.includes("든든전세") || title.includes("매입임대")) return "매입임대";
  if (title.includes("전세임대")) return "전세임대";
  if (title.includes("통합공공")) return "통합공공임대";
  if (title.includes("민간임대")) return "공공지원 민간임대";
  return fallback;
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = 30000, validate?: (response: Response) => Promise<unknown>) {
  let lastError: unknown = new Error("source-unavailable");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error("source-" + response.status);
      const bytes = await response.arrayBuffer();
      const result = new Response(bytes, { status: response.status, headers: response.headers });
      if (validate) await validate(result.clone());
      return result;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
    await new Promise((resolve) => setTimeout(resolve, 1200 * (attempt + 1)));
  }
  throw lastError;
}

async function fetchHtml(url: string) {
  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "Mozilla/5.0 (compatible; AsanRentalWatch/1.0)",
      },
    },
    30000,
  );
  return await response.text();
}

async function fetchJson<T>(url: string, body: URLSearchParams): Promise<T> {
  try {
  const response = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: "https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcView.do",
        "User-Agent": "Mozilla/5.0 (compatible; AsanRentalWatch/1.0)",
        "X-Requested-With": "XMLHttpRequest",
      },
      body,
    },
    40000,
    response => response.json(),
  );
  return (await response.json()) as T;
  } catch (error) { throw error; }
}

function compactDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return "";
  return value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8);
}

type MyHomeItem = {
  pblancId?: string;
  pblancNm?: string;
  prgrStts?: string;
  rcritPblancDe?: string;
  suplyTyNm?: string;
  url?: string;
};

type MyHomeResponse = {
  resultCnt?: number;
  resultList?: MyHomeItem[];
};

async function scanMyHome(): Promise<ScanResult> {
  try {
    const fetchPage = (pageIndex: number) =>
      fetchJson<MyHomeResponse>(
        MYHOME_LIST,
        new URLSearchParams({
          pageIndex: String(pageIndex),
          srchbrtcCode: "44",
          srchsignguCode: "44200",
          searchTyId: "",
          srchSuplyTy: "",
          srchHouseTy: "",
          srchSuplyPrvuseAr: "",
          srchBassMtRntchrg: "",
          srchPrgrStts: "1",
          srchPblancNm: "",
          srchRcritPblancDeYearMtBegin: "",
          srchRcritPblancDeYearMtEnd: "",
        }),
      );
    const firstPage = await fetchPage(1);
    if (!Array.isArray(firstPage.resultList) || !Number.isFinite(firstPage.resultCnt)) throw new Error("myhome-unrecognized-response");
    const requiredPages = Math.ceil((firstPage.resultCnt ?? 0) / 5);
    const pageCount = Math.min(100, requiredPages);
    const extraPages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(index + 2)),
    );
    if (extraPages.some(page => !Array.isArray(page.resultList))) throw new Error("myhome-incomplete-response");
    const items = [firstPage, ...extraPages].flatMap((page) => page.resultList ?? []);
    const notices = items
      .filter(
        (item) =>
          item.pblancId &&
          item.pblancNm &&
          item.prgrStts === "모집중" &&
          /(임대|행복주택|공공지원민간)/.test(item.pblancNm),
      )
      .map(
        (item) => {
          const primaryId = item.url?.match(/[?&]panId=([^&]+)/)?.[1];
          return ({
            id: primaryId ? "lh-" + primaryId : "myhome-" + item.pblancId,
            title: item.pblancNm!,
            source: "마이홈포털",
            type: typeFromTitle(item.pblancNm!, item.suplyTyNm || "공공임대"),
            status: "모집중",
            postedAt: compactDate(item.rcritPblancDe),
            closeAt: "",
            location: "아산시 (공고 적용지역)",
            url:
              item.url ||
              "https://www.myhome.go.kr/hws/portal/sch/selectRsdtRcritNtcDetailView.do?pblancId=" +
                encodeURIComponent(item.pblancId!),
          }) satisfies Notice;
        },
      );
    const healthy = requiredPages <= 100 && items.length >= (firstPage.resultCnt ?? 0);
    if (!healthy) console.warn("MyHome incomplete pages", { expected: firstPage.resultCnt, received: items.length, requiredPages });
    return { healthy, notices };
  } catch (error) {
    console.warn("MyHome scan failed", String(error), error instanceof Error ? String(error.cause ?? "") : "");
    return { healthy: false, notices: [] };
  }
}

export function parseLhRows(html: string) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1])
    .filter(row => row.includes("wrtancInfoBtn"))
    .map(row => {
      const attr = (name: string) => row.match(new RegExp(name + '="([^\"]+)"', "i"))?.[1] ?? "";
      const id = attr("data-id1");
      const title = cleanHtml((row.match(/class="wrtancInfoBtn"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] ?? "").replace(/<em[\s\S]*?<\/em>/gi, ""));
      // Dates embedded in a title must not shift the actual posted/deadline cells.
      const dates = [...row.matchAll(/<td[^>]*>\s*(\d{4}\.\d{2}\.\d{2})\s*<\/td>/gi)].map(match => normalizeDate(match[1]));
      const url = new URL("https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do");
      for (const [key, value] of Object.entries({ aisTpCd: attr("data-id4"), ccrCnntSysDsCd: attr("data-id2"), mi: "1026", panId: id, uppAisTpCd: attr("data-id3") })) url.searchParams.set(key, value);
      return { id, title, dates, url: url.href,
        region: cleanHtml(row.match(/class="mVw cate col2"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""),
        status: cleanHtml(row.match(/class="mVw stt[^\"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "공고중"),
        type: cleanHtml(row.match(/class="mVw cate col1"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""),
        upperType: attr("data-id3"),
      };
    }).filter(item => item.id && item.title && ["06", "13"].includes(item.upperType));
}

export function parseLhDetails(html: string) {
  const value = (name: string) => html.match(new RegExp("var " + name + " = ['\"]([^'\"]*)['\"]"))?.[1] ?? "";
  const time = (date: string, hour: string) => /^\d{4}\.\d{2}\.\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(hour) ? normalizeDate(date) + "T" + hour + ":00+09:00" : undefined;
  const sections = [...html.matchAll(/<section[^>]*>([\s\S]*?)<\/section>/gi)]
    .map(match => match[1]).filter(section => /<h3[^>]*>\s*(공급일정|임대기간|임대조건|신청자격)\s*<\/h3>/.test(section)).map(cleanHtml);
  const files = [...new Set([...html.matchAll(/fileDownLoad\(['"](\d+)['"]\)/g)].map(match => match[1]))].sort();
  return {
    applicationStartAt: time(value("sbscAcpStDt"), value("sbscAcpStHm")),
    applicationEndAt: time(value("sbscAcpClsgDt"), value("sbscAcpClsgHm")),
    contentKey: stableId("details", JSON.stringify([sections, files])),
  };
}


export type LhCandidate = ReturnType<typeof parseLhRows>[number];
export async function inspectLhBatch(candidates: LhCandidate[]): Promise<ScanResult> {
  if (candidates.length > 8) throw new Error('lh-batch-too-large');
  const notices: Notice[] = [];
  let healthy = true;
  for (let offset = 0; offset < candidates.length; offset += 4) {
    await Promise.all(candidates.slice(offset, offset + 4).map(async item => {
        try {
          const detail = await fetchHtml(item.url);
          if (!detail.includes("공고상태")) throw new Error("lh-detail-format-changed");
          const text = cleanHtml(detail);
          const asan = /아산시|아산배방|아산탕정/.test(text) || /아산/.test(item.title);
          const nationwide = /전국/.test(item.region + " " + item.title) && /전세임대/.test(item.title + item.type);
          if (!asan && !nationwide) return;
          const details = parseLhDetails(detail);
          notices.push({
            ...(item.id === "2015122300020620" ? CURRENT_NOTICE : {}),
            id: "lh-" + item.id, title: item.title, source: "LH청약플러스",
            type: typeFromTitle(item.title, item.type || "공공임대"), status: item.status,
            postedAt: item.dates[0] ?? "", closeAt: details.applicationEndAt?.slice(0, 10) || item.dates[1] || "",
            location: item.id === "2015122300020620" ? "아산시 권곡동" : asan ? "아산시 (공고문 적용지역 확인)" : "전국 (아산 적용·자격 원문 확인)",
            url: item.url, ...details,
          });
        } catch (error) { console.warn("LH detail unavailable", item.id, String(error)); healthy = false; }
    }));
  }
  return { healthy, notices };
}

export async function scanLh(inspect: (items: LhCandidate[], offset: number) => Promise<ScanResult> = inspectLhBatch): Promise<ScanResult> {
  try {
    // Include nationwide postings and longstanding rolling recruitment, not just
    // the default two-month / Chungnam search and first twenty rows.
    const fetchPage = (page: number) => fetchWithRetry(LH_LIST.split("?")[0], {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "AsanRentalWatch/2.0" },
      body: new URLSearchParams({ cnpCd: "", mi: "1026", startDt: "2000-01-01", endDt: koreanToday(), panSs: "공고중", listCo: "100", currPage: String(page), uppAisTpCd: "061339", srchUppAisTpCd: "061339", srchY: page === 1 ? "Y" : "N" }),
    }).then(response => response.text());
    const first = await fetchPage(1);
    const total = Number(cleanHtml(first.match(/class="bbs_total"[^>]*>([\s\S]*?)<\/p>/i)?.[1] ?? "").match(/전체\s*([\d,]+)\s*건/)?.[1]?.replaceAll(",", ""));
    if (!Number.isFinite(total)) throw new Error("lh-list-format-changed");
    const pageCount = Math.max(1, Math.ceil(total / 100));
    let healthy = pageCount <= 50;
    const pages = [first];
    for (let page = 2; page <= Math.min(pageCount, 50); page += 1) {
      try { pages.push(await fetchPage(page)); } catch { healthy = false; }
    }
    const allRows = pages.flatMap(parseLhRows);
    const candidates = [...new Map(allRows.map(item => [item.id, item])).values()];
    const actualRows = pages.reduce((sum, page) => sum + [...page.matchAll(/class="wrtancInfoBtn"/g)].length, 0);
    if (actualRows < total || (pageCount > 1 && candidates.length < allRows.length)) healthy = false;
    const notices: Notice[] = [];
    for (let offset = 0; offset < candidates.length; offset += 8) {
      const batch = await inspect(candidates.slice(offset, offset + 8), offset);
      healthy = healthy && batch.healthy;
      notices.push(...batch.notices);
    }
    return { healthy, notices };
  } catch (error) { console.warn("LH scan failed", String(error)); return { healthy: false, notices: [] }; }
}

export function parseAsanRows(html: string): Notice[] {
  const today = koreanToday();
  return Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
    .map((match) => match[1])
    .map((row) => {
      const titleMatch = row.match(
        /<td[^>]*class="title alignLeft"[^>]*>[\s\S]*?<a[^>]*href=['"]([^'"]+)['"][^>]*>([\s\S]*?)<\/a>/i,
      );
      if (!titleMatch) return null;
      const title = cleanHtml(titleMatch[2]);
      if (!/(임대|행복주택|영구주택|국민주택)/.test(title) || !/(모집|입주자|공급)/.test(title)) {
        return null;
      }
      if (/(사업계획|변경승인|건설공사|위원회|용역|사업자 모집)/.test(title)) return null;
      const href = titleMatch[1].startsWith("http")
        ? decodeEntities(titleMatch[1])
        : new URL(decodeEntities(titleMatch[1]), "https://www.asan.go.kr/main/cms/").toString();
      const dates = Array.from(row.matchAll(/(\d{4}-\d{2}-\d{2})/g)).map((date) => date[1]);
      const closeAt = /title="게시기간"/.test(row) ? "" : dates.length > 1 ? dates.at(-1)! : "";
      if (closeAt && closeAt < today) return null;
      const rawId = href.match(/(?:mgt_no|pds_no)=([^&]+)/)?.[1] ?? href;
      return {
        id: "asan-" + rawId,
        title,
        source: "아산시청",
        type: typeFromTitle(title),
        status: "공고중",
        postedAt: dates[0] ?? today,
        closeAt,
        location: "아산시",
        url: href,
      } satisfies Notice;
    })
    .filter((notice): notice is Notice => Boolean(notice));
}

async function scanAsan(): Promise<ScanResult> {
  const year = koreanToday().slice(0, 4);
  const scans = await Promise.all([ASAN_NOTICE_SEARCH + year, ASAN_HOUSING_SEARCH + year].map(async sourceUrl => {
    const notices: Notice[] = [];
    const pageKeys = new Set<string>();
    let lastPage = 1;
    try {
      for (let page = 1; page <= Math.min(lastPage, 50); page += 1) {
        const url = new URL(sourceUrl); url.searchParams.set("PageNo", String(page));
        const html = await fetchHtml(url.href);
        if (!/title alignLeft|등록된.*없|게시물이.*없/.test(html)) throw new Error("asan-format-changed");
        const rows = [...html.matchAll(/class="title alignLeft"[^>]*>([\s\S]*?)<\/td>/g)].map(match => cleanHtml(match[1])).join("|");
        if (rows && pageKeys.has(rows)) throw new Error("asan-repeated-page");
        pageKeys.add(rows); notices.push(...parseAsanRows(html));
        const pager = html.match(/class="pager"[\s\S]*?<\/ul>/)?.[0] ?? "";
        for (const match of pager.matchAll(/PageNo=(\d+)/g)) lastPage = Math.max(lastPage, Number(match[1]));
      }
      return { healthy: lastPage <= 50, notices };
    } catch { return { healthy: false, notices }; }
  }));
  return { healthy: scans.every(scan => scan.healthy), notices: scans.flatMap(scan => scan.notices) };
}

export function parseKohomRows(html: string): Notice[] {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1]).flatMap(row => {
    const id = row.match(/fn_goView\('([^']+)'\)/)?.[1];
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(match => cleanHtml(match[1]));
    if (!id || cells.length < 6 || !/아산/.test(cells[2])) return [];
    // Read the status cell, not the word "공고" inside a notice's title.
    const status = cells[5];
    return [{ id: "kohom-" + id, title: cells[2], source: "주택관리공단", type: typeFromTitle(cells[2]),
      status: /당첨자발표|접수결과|마감|종료/.test(status) ? "마감" : status === "공고" ? "공고중" : status,
      postedAt: cells[4], closeAt: "", location: "아산시",
      url: "https://www.kohom.or.kr/web/mainComm/HM001002002.do?mode=view&p_idx=" + encodeURIComponent(id),
    }];
  });
}

async function scanKohom(): Promise<ScanResult> {
  try {
    const pages: string[] = [];
    let lastPage = 1;
    let healthy = true;
    const seen = new Set<string>();
    for (let page = 1; page <= Math.min(lastPage, 50); page += 1) {
      const url = new URL(KOHOM_LIST); url.searchParams.set("page", String(page));
      const html = await fetchHtml(url.href);
      if (!/예비입주자모집 게시판 목록/.test(html)) throw new Error("kohom-format-changed");
      const key = parseKohomRows(html).map(notice => notice.id).join(",");
      if (key && seen.has(key)) { healthy = false; break; }
      seen.add(key); pages.push(html);
      for (const match of html.matchAll(/fn_linkPage\((\d+)\)/g)) lastPage = Math.max(lastPage, Number(match[1]));
    }
    const notices = pages.flatMap(parseKohomRows);
    for (let offset = 0; offset < notices.length; offset += 4) {
      await Promise.all(notices.slice(offset, offset + 4).filter(notice => notice.status !== "마감").map(async notice => {
        try {
          const detail = await fetchHtml(notice.url);
          const field = (id: string) => cleanHtml(detail.match(new RegExp('<td[^>]*headers="' + id + '"[^>]*>([\\s\\S]*?)<\\/td>', 'i'))?.[1] ?? "");
          notice.title = field("r1_03") || notice.title;
          const dates = [...field("r3_03").matchAll(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/g)];
          if (dates.length >= 2) {
            notice.applicationStartAt = dates[0][1] + "T" + dates[0][2] + ":00+09:00";
            notice.applicationEndAt = dates.at(-1)![1] + "T" + dates.at(-1)![2] + ":00+09:00";
            notice.closeAt = dates.at(-1)![1];
          } else { notice.needsVerification = true; healthy = false; }
        } catch { notice.needsVerification = true; healthy = false; }
      }));
    }
    return { healthy: healthy && lastPage <= 50, notices };
  } catch { return { healthy: false, notices: [] }; }
}

export function parseCndcRows(html: string): Notice[] {
  const json = html.match(/var itemList\s*=\s*(\[[\s\S]*?\]);/)?.[1];
  if (!json) throw new Error("cndc-format-changed");
  const rows = JSON.parse(json) as Record<string, string | number>[];
  if (!Array.isArray(rows) || rows.some(row => typeof row.aptReqNoticeDesc !== "string" || typeof row.regionName !== "string")) throw new Error("cndc-invalid-list");
  const time = (value: unknown) => {
    const match = String(value ?? "").match(/^(\d{4}-\d{2}-\d{2}) (\d{1,2})시/);
    return match ? match[1] + "T" + match[2].padStart(2, "0") + ":00:00+09:00" : undefined;
  };
  return rows.filter(row => /아산/.test(String(row.regionName))).map(row => {
    const url = new URL("https://apply.cndc.kr/sr2010/view.do");
    for (const [key, value] of Object.entries({ key: "2404080070", projectCd: row.projectCd, aptSeqNo: row.aptSeqNo, regionAptCd: row.regionAptCd })) url.searchParams.set(key, String(value));
    return { id: "cndc-" + row.projectCd + "-" + row.aptSeqNo + "-" + row.regionAptCd,
      title: String(row.aptReqNoticeDesc), source: "충남개발공사", type: typeFromTitle(String(row.aptReqNoticeDesc), String(row.aptMainKind)),
      status: row.noticeStatus === "진행중" ? "접수중" : row.noticeStatus === "예정" ? "접수 예정" : String(row.noticeStatus),
      postedAt: String(row.aptReqNoticeDate || ""), closeAt: String(row.aptReqEndDate || "").slice(0,10),
      applicationStartAt: time(row.aptReqStartDate), applicationEndAt: time(row.aptReqEndDate),
      location: String(row.regionName) + " " + String(row.aptName || ""), url: url.href,
      contentKey: stableId("cndc-files", JSON.stringify([row.fileSn10 || "", row.fileSn20 || ""])),
    };
  });
}
async function scanCndc(): Promise<ScanResult> {
  try {
    const notices: Notice[] = [];
    let lastPage = 1;
    const seenPages = new Set<string>();
    for (let page = 1; page <= Math.min(lastPage, 50); page += 1) {
      const url = new URL(CNDC_LIST); url.searchParams.set("pageIndex", String(page));
      const html = await fetchHtml(url.href);
      const rows = parseCndcRows(html);
      const raw = html.match(/var itemList\s*=\s*(\[[\s\S]*?\]);/)![1];
      if (seenPages.has(raw)) return { healthy: false, notices };
      seenPages.add(raw); notices.push(...rows);
      for (const match of html.matchAll(/fn_egov_link_page\((\d+)\)/g)) lastPage = Math.max(lastPage, Number(match[1]));
    }
    return { healthy: lastPage <= 50, notices };
  } catch { return { healthy: false, notices: [] }; }
}

export async function collect(previous: { notices?: Notice[]; archived?: Notice[] }) {
  const checkedAt = new Date().toISOString();
  const definitions = [
    { source: "LH청약플러스", run: scanLh },
    { source: "마이홈포털", run: scanMyHome },
    { source: "아산시청", run: scanAsan },
    { source: "충남개발공사", run: scanCndc },
    { source: "주택관리공단", run: scanKohom },
  ];
  const scans = await Promise.all(
    definitions.map(async (definition) => ({
      source: definition.source,
      result: await definition.run(),
    })),
  );
  const { notices, archived } = reconcileNotices(previous, scans);

  const output = {
    notices,
    archived,
    checkedAt,
    sourceCount: scans.length,
    healthySourceCount: scans.filter((scan) => scan.result.healthy).length,
    sourceHealth: Object.fromEntries(scans.map((scan) => [scan.source, scan.result.healthy])),
  };

  return output;
}

export const sourceNames = ['LH청약플러스', '마이홈포털', '아산시청', '충남개발공사', '주택관리공단'] as const;
export async function scanSource(source: string, inspect?: (items: LhCandidate[], offset: number) => Promise<ScanResult>): Promise<ScanResult> {
  switch (source) {
    case 'LH청약플러스': return scanLh(inspect);
    case '마이홈포털': return scanMyHome();
    case '아산시청': return scanAsan();
    case '충남개발공사': return scanCndc();
    case '주택관리공단': return scanKohom();
    default: throw new Error('unknown-source');
  }
}

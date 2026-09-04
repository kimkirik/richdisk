import { mkdir, readFile, writeFile } from "node:fs/promises";

type Notice = {
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
  missingChecks?: number;
};

type ScanResult = {
  healthy: boolean;
  notices: Notice[];
};

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
const DATA_FILE = new URL("../data/notices.json", import.meta.url);

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

function koreanToday() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

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

function stableId(prefix: string, value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return prefix + "-" + (hash >>> 0).toString(36);
}

async function fetchWithRetry(url: string, init: RequestInit, timeoutMs = 30000) {
  let lastError: unknown = new Error("source-unavailable");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) throw new Error("source-" + response.status);
      return response;
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
  );
  return (await response.json()) as T;
}

function compactDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value)) return koreanToday();
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
    const pageCount = Math.min(10, Math.ceil((firstPage.resultCnt ?? 0) / 5));
    const extraPages = await Promise.all(
      Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => fetchPage(index + 2)),
    );
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
    return { healthy: true, notices };
  } catch {
    return { healthy: false, notices: [] };
  }
}

async function scanLh(): Promise<ScanResult> {
  try {
    const html = await fetchHtml(LH_LIST);
    const rows = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi));
    const candidates = rows
      .map((match) => match[1])
      .filter((row) => row.includes("wrtancInfoBtn") && !cleanHtml(row).includes("접수마감"))
      .map((row) => {
        const id = row.match(/data-id1="([^"]+)"/i)?.[1] ?? "";
        const connection = row.match(/data-id2="([^"]+)"/i)?.[1] ?? "";
        const upperType = row.match(/data-id3="([^"]+)"/i)?.[1] ?? "";
        const typeCode = row.match(/data-id4="([^"]+)"/i)?.[1] ?? "";
        const titleBlock = row.match(/class="wrtancInfoBtn"[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] ?? "";
        const title = cleanHtml(titleBlock.replace(/<em[\s\S]*?<\/em>/gi, ""));
        const dates = Array.from(row.matchAll(/(\d{4}\.\d{2}\.\d{2})/g)).map((date) =>
          normalizeDate(date[1]),
        );
        const status = cleanHtml(row.match(/class="mVw stt[^"]*"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "공고중");
        const url =
          "https://apply.lh.or.kr/lhapply/apply/wt/wrtanc/selectWrtancInfo.do?aisTpCd=" +
          encodeURIComponent(typeCode) +
          "&ccrCnntSysDsCd=" +
          encodeURIComponent(connection) +
          "&mi=1026&panId=" +
          encodeURIComponent(id) +
          "&uppAisTpCd=" +
          encodeURIComponent(upperType);
        return {
          id,
          title,
          dates,
          status,
          url,
          type: cleanHtml(row.match(/class="mVw cate col1"[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""),
        };
      })
      .filter((item) => item.id && item.title);

    const detailChecks = await Promise.all(
      candidates.slice(0, 20).map(async (item) => {
        if (/아산/.test(item.title)) return { item, isAsan: true };
        try {
          const detail = cleanHtml(await fetchHtml(item.url));
          return { item, isAsan: /아산시|아산읍|아산배방/.test(detail) };
        } catch {
          return { item, isAsan: false };
        }
      }),
    );

    const notices = detailChecks
      .filter((entry) => entry.isAsan)
      .map(({ item }) => {
        if (item.id === "2015122300020620") return CURRENT_NOTICE;
        return {
          id: "lh-" + item.id,
          title: item.title,
          source: "LH청약플러스",
          type: typeFromTitle(item.title, item.type || "공공임대"),
          status: item.status || "공고중",
          postedAt: item.dates[0] ?? koreanToday(),
          closeAt: item.dates[1] ?? "",
          location: "아산시 (공고문 확인)",
          url: item.url,
        } satisfies Notice;
      });
    return { healthy: true, notices };
  } catch {
    return { healthy: false, notices: [] };
  }
}

function parseAsanRows(html: string): Notice[] {
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
      const closeAt = dates.at(-1) ?? "";
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
  try {
    const year = koreanToday().slice(0, 4);
    const responses = await Promise.allSettled([
      fetchHtml(ASAN_NOTICE_SEARCH + year),
      fetchHtml(ASAN_HOUSING_SEARCH + year),
    ]);
    const htmlPages = responses
      .filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled")
      .map((result) => result.value);
    return {
      healthy: htmlPages.length > 0,
      notices: htmlPages.flatMap(parseAsanRows),
    };
  } catch {
    return { healthy: false, notices: [] };
  }
}

async function scanKohom(): Promise<ScanResult> {
  try {
    const html = await fetchHtml(KOHOM_LIST);
    const notices = Array.from(html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi))
      .map((match) => match[1])
      .map((row) => {
        const id = row.match(/fn_goView\('([^']+)'\)/)?.[1] ?? "";
        const title = cleanHtml(
          row.match(/fn_goView\('[^']+'\)[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? "",
        );
        const text = cleanHtml(row);
        const status = text.match(/\b(공고|접수중|당첨자발표|접수결과)\b/)?.[1] ?? "";
        const postedAt = text.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? koreanToday();
        if (!id || !/아산/.test(title) || !["공고", "접수중"].includes(status)) return null;
        return {
          id: "kohom-" + id,
          title,
          source: "주택관리공단",
          type: typeFromTitle(title),
          status: status === "공고" ? "공고중" : status,
          postedAt,
          closeAt: "",
          location: "아산시",
          url:
            "https://www.kohom.or.kr/web/mainComm/HM001002002.do?mode=view&p_idx=" +
            encodeURIComponent(id),
        } satisfies Notice;
      })
      .filter((notice): notice is Notice => Boolean(notice));
    return { healthy: true, notices };
  } catch {
    return { healthy: false, notices: [] };
  }
}

async function scanCndc(): Promise<ScanResult> {
  try {
    const html = await fetchHtml(CNDC_LIST);
    const text = cleanHtml(html);
    if (!text.includes("아산시")) return { healthy: true, notices: [] };
    const notices: Notice[] = [];
    const pattern =
      /(기존주택매입임대|행복주택공급)\s+([^\n]{8,180}?)\s+(?:청약신청|상세정보)[\s\S]{0,300}?지역\s+아산시[\s\S]{0,300}?게시일\s+(\d{4}-\d{2}-\d{2})[\s\S]{0,200}?접수마감\s+(\d{4}-\d{2}-\d{2})/g;
    for (const match of text.matchAll(pattern)) {
      if (match[4] < koreanToday()) continue;
      const title = match[2].trim();
      notices.push({
        id: stableId("cndc", title + match[3]),
        title,
        source: "충남개발공사",
        type: typeFromTitle(title, match[1] === "행복주택공급" ? "행복주택" : "매입임대"),
        status: "공고중",
        postedAt: match[3],
        closeAt: match[4],
        location: "아산시",
        url: CNDC_LIST,
      });
    }
    return { healthy: true, notices };
  } catch {
    return { healthy: false, notices: [] };
  }
}

function noticeAlertKey(notice: Notice) {
  return (
    notice.id +
    ":" +
    stableId(
      "change",
      JSON.stringify([
        notice.title,
        notice.status,
        notice.postedAt,
        notice.closeAt,
        notice.location,
        notice.units ?? null,
        notice.areaLabel ?? null,
      ]),
    )
  );
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8")) as {
      notices?: Notice[];
      archived?: Notice[];
    };
  } catch {
    return { notices: [], archived: [] };
  }
}

async function main() {
  const checkedAt = new Date().toISOString();
  const today = koreanToday();
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
  const previous = await readPrevious();
  const previousActive = previous.notices ?? [];
  const archivedById = new Map((previous.archived ?? []).map((notice) => [notice.id, notice]));
  const byId = new Map<string, Notice>();

  if (CURRENT_NOTICE.closeAt >= today) byId.set(CURRENT_NOTICE.id, CURRENT_NOTICE);
  for (const scan of scans) {
    for (const notice of scan.result.notices) {
      if (!byId.has(notice.id)) byId.set(notice.id, notice);
    }
  }

  for (const oldNotice of previousActive) {
    if (byId.has(oldNotice.id)) continue;
    const sourceScan = scans.find((scan) => scan.source === oldNotice.source);
    if (!sourceScan?.result.healthy) {
      byId.set(oldNotice.id, oldNotice);
      continue;
    }

    const missingChecks = (oldNotice.missingChecks ?? 0) + 1;
    if ((oldNotice.closeAt && oldNotice.closeAt < today) || missingChecks >= 2) {
      archivedById.set(oldNotice.id, {
        ...oldNotice,
        status: "마감",
        archivedAt: today,
        missingChecks: 0,
      });
    } else {
      byId.set(oldNotice.id, { ...oldNotice, missingChecks });
    }
  }

  const notices = Array.from(byId.values())
    .map((notice) => ({
      ...notice,
      status: notice.status || "공고중",
      alertKey: noticeAlertKey(notice),
      missingChecks: notice.missingChecks ?? 0,
    }))
    .sort((left, right) => right.postedAt.localeCompare(left.postedAt));

  for (const notice of notices) archivedById.delete(notice.id);
  const archived = Array.from(archivedById.values())
    .map((notice) => ({ ...notice, status: "마감", alertKey: noticeAlertKey(notice) }))
    .sort((left, right) =>
      (right.archivedAt || right.closeAt || right.postedAt).localeCompare(
        left.archivedAt || left.closeAt || left.postedAt,
      ),
    )
    .slice(0, 200);

  const output = {
    notices,
    archived,
    checkedAt,
    sourceCount: scans.length,
    healthySourceCount: scans.filter((scan) => scan.result.healthy).length,
    sourceHealth: Object.fromEntries(scans.map((scan) => [scan.source, scan.result.healthy])),
  };

  await mkdir(new URL("../data/", import.meta.url), { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(
    `Updated ${notices.length} active / ${archived.length} archived notices; ${output.healthySourceCount}/${output.sourceCount} sources healthy.`,
  );
}

await main();

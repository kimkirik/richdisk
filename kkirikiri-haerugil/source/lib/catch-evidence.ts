/** Curated public self-reports. Read at source on 2026-09-13; no automated harvesting. */
export type CatchResult = "잡음" | "적은 조과" | "못 잡음" | "관찰·방생";
export type CatchReport = {
  id: string; url: string; title: string; author: string; platform: string;
  postedOn: string; postedLabel?: string; caughtOn: string | null; caughtLabel: string; dateEvidence: string;
  region: string; place: string; spotId: string | null; method: string;
  catches: { species: string; result: CatchResult; quantity: string }[];
  summary: string; conditions?: string; limitation: string;
};
export const CATCH_CHECKED_ON = "2026-09-13";
export const CATCH_REPORTS: CatchReport[] = [
  {
    id: "hokahoka-simnipo-202604", platform: "티스토리", author: "hokahoka9",
    url: "https://circle-85.tistory.com/entry/인천-영흥도의-낙지소라-포인트-십리포해수욕장어민-마찰X-포인트",
    title: "영흥도 십리포 낙지·소라 후기", postedOn: "2026-05-07", caughtOn: "2026-04", caughtLabel: "2026년 4월 중순",
    dateEvidence: "본문에 4월 중순 방문 명시. 5월 게시물을 5월 조과로 세지 않음.",
    region: "인천 옹진", place: "영흥도 십리포", spotId: null, method: "워킹 해루질",
    catches: [{species:"낙지",result:"잡음",quantity:"작성자 2마리·동료 2마리"},{species:"소라",result:"잡음",quantity:"작성자 2개"}],
    summary: "작성자와 동료의 낙지 조과, 작성자의 소라 조과가 본문에 수량으로 제시됨.",
    limitation: "동료의 조과도 같은 출조 1건으로 집계. 종명은 작성자 표현이며 독립적인 종 판별은 하지 않음.",
  },
  {
    id: "hokahoka-seonnyeo-20260501", platform: "티스토리", author: "hokahoka9",
    url: "https://circle-85.tistory.com/entry/인천-영종도-선녀바위해수욕장으로-해루질-다녀왔어요-백합이-잔뜩",
    title: "선녀바위 백합 해루질 후기", postedOn: "2026-05-06", caughtOn: "2026-05-01", caughtLabel: "2026년 5월 1일",
    dateEvidence: "본문의 5월 1일 방문 및 게시 연도 기준.", region: "인천 중구", place: "선녀바위", spotId: "seonnyeobawi", method: "워킹 해루질",
    catches: [{species:"백합",result:"잡음",quantity:"수량 미기록"}], summary: "동료와 약 2시간 동안 채집한 결과를 소개. 정확한 개수나 무게는 쓰지 않음.",
    conditions: "활동 약 2시간·동료와 동행(본문 기록)", limitation: "추가된 5월 중순 재방문도 같은 원문이므로 독립 출처로 중복 집계하지 않음. 백합은 작성자 종명.",
  },
  {
    id: "hokahoka-sinduri-202604", platform: "티스토리", author: "hokahoka9",
    url: "https://circle-85.tistory.com/entry/충남-태안-신두리해수욕장으로-해루질-다녀왔어요-골뱅이명주조개",
    title: "신두리 골뱅이·명주조개 후기", postedOn: "2026-04-05", caughtOn: "2026-04", caughtLabel: "2026년 4월 초",
    dateEvidence: "본문에 4월 초 방문 명시. 정확한 날짜는 없음.", region: "충남 태안", place: "신두리", spotId: "sinduri", method: "워킹 해루질",
    catches: [{species:"골뱅이",result:"잡음",quantity:"수량 미기록"},{species:"명주조개",result:"잡음",quantity:"수량 미기록"},{species:"동죽",result:"관찰·방생",quantity:"3~4개 관찰·채취 여부 미기록"}],
    summary: "명주조개를 먼저 채집했고 물이 더 빠진 뒤 골뱅이를 찾았다고 기록함.",
    limitation: "동죽은 본문의 관찰 언급만 확인되어 잡은 수량으로 합산하지 않음.",
  },
  {
    id: "hokahoka-hanagae-202603", platform: "티스토리", author: "hokahoka9",
    url: "https://circle-85.tistory.com/entry/인천-무의도-하나개해수욕장으로-해루질-다녀왔어요-골뱅이주꾸미?category=1294852",
    title: "하나개 골뱅이·주꾸미 후기", postedOn: "2026-03-23", caughtOn: "2026-03", caughtLabel: "2026년 3월 말",
    dateEvidence: "본문에 3월 말 출조 명시. 게시일을 출조일로 대체하지 않음.", region: "인천 중구", place: "무의도 하나개", spotId: "muui_hanagae", method: "워킹 해루질",
    catches: [{species:"골뱅이",result:"잡음",quantity:"큰 것 7개·중간 것 4개"},{species:"주꾸미",result:"잡음",quantity:"1마리"}],
    summary: "작성자가 조과 수량을 기재했고 작은 골뱅이는 놓아주었다고 설명함.", conditions: "마이너스 물때라는 작성자 설명·조위 수치 미기록",
    limitation: "이전 방문의 꽝 언급은 날짜와 횟수가 없어 별도 출조로 집계하지 않음.",
  },
  {
    id: "hokahoka-seonnyeo-202509", platform: "티스토리", author: "hokahoka9",
    url: "https://circle-85.tistory.com/entry/인천-해루질-초보자-포인트-후기주꾸미-소라-갑오징어-꽃게",
    title: "선녀바위 9월 초 조과 후기", postedOn: "2025-09-14", caughtOn: "2025-09", caughtLabel: "2025년 9월 초",
    dateEvidence: "본문에 9월 초 방문 명시. 게시일과 구분.", region: "인천 중구", place: "선녀바위", spotId: "seonnyeobawi", method: "워킹 해루질",
    catches: [{species:"주꾸미",result:"잡음",quantity:"4마리"},{species:"갑오징어",result:"잡음",quantity:"1마리"},{species:"소라",result:"잡음",quantity:"15개"},{species:"꽃게",result:"잡음",quantity:"2마리"}],
    summary: "작성자와 동료가 함께 잡은 수량. 목표였던 주꾸미는 작고 많이 보이지 않았다고 기록함.",
    limitation: "개인별 조과로 나누지 않음. 한 번의 동행 출조이며 현재의 출입 가능 여부를 뜻하지 않음.",
  },
  {
    id: "lifelog-mongsanpo-202505", platform: "개인 블로그", author: "Jongbin Oh / Lifelog",
    url: "https://ohyecloudy.com/lifelog/archives/trip-mongsanpo-beach-may-2025/",
    title: "몽산포 2025년 5월 가족여행", postedOn: "2025-06-14", postedLabel: "원문 수정일", caughtOn: "2025-05", caughtLabel: "2025년 5월 연휴",
    dateEvidence: "제목의 2025년 5월과 본문의 5월 연휴 방문 기준.", region: "충남 태안", place: "몽산포", spotId: "mongsanpo", method: "갯벌 채집",
    catches: [{species:"맛조개",result:"못 잡음",quantity:"작성자 허탕·정확한 수량 미기록"}],
    summary: "작성자는 허탕을 기록. 이웃 가족이 잡아 건넨 맛조개는 작성자 자신의 조과와 구분함.",
    limitation: "숙련된 이웃의 바구니 조과는 간접 관찰이라 별도의 성공 출조로 추가하지 않음.",
  },
  {
    id: "uncheat-jinsanri-20240511", platform: "티스토리", author: "uncheat",
    url: "https://uncheat.tistory.com/33", title: "진산리어촌계 맛조개·동죽 체험", postedOn: "2024-05-13", caughtOn: "2024-05-11", caughtLabel: "2024년 5월 11일",
    dateEvidence: "본문에 방문일 5월 11일 토요일을 명시.", region: "충남 태안", place: "진산리어촌계", spotId: "jinsanri", method: "유료 갯벌체험",
    catches: [{species:"맛조개",result:"잡음",quantity:"수량 미기록"},{species:"동죽",result:"잡음",quantity:"수량 미기록"}],
    summary: "유료 체험장에서 맛조개 위주로 채집하고 동죽도 가져왔다고 기록함.", conditions: "10:40 시작·12:44 간조라는 작성자 기록",
    limitation: "관리되는 유료 체험장 결과. 일반 해변의 자연 조과와 같은 조건으로 비교하지 않음.",
  },
  {
    id: "lifelog-mongsanpo-20231008", platform: "개인 블로그", author: "Jongbin Oh / Lifelog",
    url: "https://ohyecloudy.com/lifelog/archives/trip-mongsanpo-2023/", title: "몽산포 2023년 맛조개 가족여행",
    postedOn: "2023-11-11", postedLabel: "원문 수정일", caughtOn: "2023-10-08", caughtLabel: "2023년 10월 8일",
    dateEvidence: "제목의 2023년과 본문의 10월 8일 방문 기준.", region: "충남 태안", place: "몽산포", spotId: "mongsanpo", method: "갯벌 채집",
    catches: [{species:"맛조개",result:"적은 조과",quantity:"1개·채집 중 파손"}],
    summary: "맛조개 하나가 파손되었고 다른 조개는 이름을 몰랐다고 기록함.", conditions: "무시 물때라는 작성자 기록",
    limitation: "이름 모를 조개는 어종 통계에 넣지 않음. 물때가 적은 조과의 원인이라는 해석은 검증되지 않음.",
  },
  {
    id: "memory-dongbaek-20230305", platform: "티스토리", author: "어중남",
    url: "https://memory1211.tistory.com/43", title: "기장 동백방파제 3월 워킹 해루질", postedOn: "2023-03-05", caughtOn: "2023-03-05", caughtLabel: "2023년 3월 5일",
    dateEvidence: "제목에 출조 날짜 명시.", region: "부산 기장", place: "동백방파제", spotId: null, method: "워킹 해루질",
    catches: [{species:"박하지",result:"잡음",quantity:"큰 개체 1마리"},{species:"성게",result:"잡음",quantity:"큰 개체 1개"},{species:"고동",result:"잡음",quantity:"수량 미기록"}],
    summary: "부부가 함께 고동·성게를 채집했고 큰 박하지를 잡았다고 기록함.", limitation: "작성자 1인의 후기. 고동·성게는 본문의 통칭 그대로이며 세부 종은 미확인.",
  },
  {
    id: "memory-dongbaek-20230205", platform: "티스토리", author: "어중남",
    url: "https://memory1211.tistory.com/16", title: "기장 동백방파제 2월 워킹 해루질", postedOn: "2023-02-05", caughtOn: "2023-02-05", caughtLabel: "2023년 2월 4일 밤~5일 새벽",
    dateEvidence: "제목의 2월 5일과 본문의 전날 밤~당일 새벽 출조 기준.", region: "부산 기장", place: "동백방파제", spotId: null, method: "워킹 해루질",
    catches: [{species:"성게",result:"잡음",quantity:"2~3개 맛봄·나머지 방생, 총수량 미기록"}],
    summary: "큰 수확은 없었으나 성게를 채집했으며 일부만 맛보고 방생했다고 기록함.", limitation: "현장에서 해삼 종패와 관련한 퇴거 요청을 받았다는 내용도 있음. 현재 채취 허용 정보로 쓰지 않음.",
  },
  {
    id: "memory-sangyu-202302", platform: "티스토리", author: "어중남",
    url: "https://memory1211.tistory.com/28", title: "거제 상유방파제 해루질·낚시 여행", postedOn: "2023-02-21", caughtOn: "2023-02", caughtLabel: "2023년 2월 18~21일 여행 중",
    dateEvidence: "제목과 본문에 여행 기간 명시. 개별 해루질 일자는 없음.", region: "경남 거제", place: "상유방파제", spotId: null, method: "워킹 해루질",
    catches: [{species:"대상 미상",result:"못 잡음",quantity:"해루질 조과 없음"}],
    summary: "해루질로 얻은 것은 없었다고 기록. 같은 여행의 통발·낚시 조과는 제외함.", conditions: "바람이 매우 강했다는 작성자 기록",
    limitation: "통발로 잡은 게와 물고기를 해루질 성과로 섞지 않음. 여행 1건이며 출조 횟수는 미확인.",
  },
  {
    id: "sanjang-seonnyeo-20220517", platform: "티스토리", author: "산장보더",
    url: "https://sanjangboarder.tistory.com/294", title: "선녀바위 2022년 5월 해루질", postedOn: "2022-05-24", caughtOn: "2022-05-17", caughtLabel: "2022년 5월 17일",
    dateEvidence: "제목과 본문에 5월 17일 출조 명시.", region: "인천 중구", place: "선녀바위", spotId: "seonnyeobawi", method: "워킹 해루질",
    catches: [{species:"골뱅이",result:"적은 조과",quantity:"수량 미기록"},{species:"소라",result:"관찰·방생",quantity:"발견 언급·보유 수량 미기록"},{species:"주꾸미",result:"관찰·방생",quantity:"방생 기록"}],
    summary: "골뱅이가 기대보다 적고 작은 개체가 많았다고 기록. 주꾸미는 방생함.",
    limitation: "낙지는 다음 출조 목표로만 언급되어 잡힌 어종에 포함하지 않음.",
  },
  {
    id: "witram-mongsanpo-undated", platform: "티스토리", author: "뢈필이",
    url: "https://witram.tistory.com/entry/몽산포해루질", title: "몽산포 박하지·낙지 후기", postedOn: "2021-10-12", caughtOn: null, caughtLabel: "실제 출조일 미기록",
    dateEvidence: "게시일만 확인됨. 10월 조과로 추정 집계하지 않음.", region: "충남 태안", place: "몽산포항 주변", spotId: "mongsanpo", method: "워킹 해루질",
    catches: [{species:"박하지",result:"잡음",quantity:"수량 미기록"},{species:"낙지",result:"잡음",quantity:"수량 미기록"},{species:"꽃게",result:"못 잡음",quantity:"포기·수량 미기록"},{species:"광어",result:"못 잡음",quantity:"포기·수량 미기록"}],
    summary: "흐린 물로 꽃게·광어를 포기하고 이동한 뒤 박하지와 낙지를 잡았다고 기록함.", conditions: "물이 뒤집혀 보이지 않았다는 작성자 기록",
    limitation: "날짜 미확인으로 월별 집계 제외. 물색과 조과의 인과관계를 입증하는 자료는 아님.",
  },
  {
    id: "mlstoryer-deuruni-undated", platform: "티스토리", author: "MLstoryer",
    url: "https://mlstoryer.tistory.com/455", title: "드르니항·연육교 해루질과 루어 조행기", postedOn: "2017-05-29", caughtOn: null, caughtLabel: "출조 날짜 추가 확인 필요",
    dateEvidence: "본문에 이번 주·토요일만 있어 정확한 출조일은 확정하지 않음. 월별 집계 제외.", region: "충남 태안", place: "드르니항·연육교 주변", spotId: "deuruni", method: "해루질(낚시 병행)",
    catches: [{species:"낙지",result:"잡음",quantity:"본문 두 차례 기록: 3마리·2마리"},{species:"소라",result:"적은 조과",quantity:"몇 개·정확한 수량 미기록"}],
    summary: "해루질과 루어낚시를 나눠 기록. 낙지·소라만 정리하고 루어 광어·우럭은 제외함.", limitation: "오래된 원문 1건으로 여러 출조가 함께 기술됨. 5월 낙지 성수기의 확정 근거로 쓰지 않음.",
  },
];

export type CatchFilter = { region?: string; species?: string; year?: string; month?: number; spotId?: string };
export function uniqueReports(reports: CatchReport[]) {
  const ids = new Set<string>();
  const urls = new Set<string>();
  return reports.filter(report => {
    const url = new URL(report.url);
    const canonical = `${url.origin}${decodeURI(url.pathname).replace(/\/$/, "")}`;
    if (ids.has(report.id) || urls.has(canonical)) return false;
    ids.add(report.id); urls.add(canonical); return true;
  });
}
export function filterCatchReports(reports: CatchReport[], filter: CatchFilter = {}) {
  return uniqueReports(reports).filter(report =>
    (!filter.region || report.region === filter.region) &&
    (!filter.spotId || report.spotId === filter.spotId) &&
    (!filter.species || report.catches.some(item => item.species === filter.species)) &&
    (!filter.year || report.caughtOn?.slice(0, 4) === filter.year) &&
    (!filter.month || Number(report.caughtOn?.slice(5, 7)) === filter.month)
  ).sort((a, b) => (b.caughtOn ?? "").localeCompare(a.caughtOn ?? "") || b.postedOn.localeCompare(a.postedOn));
}
export function monthlyEvidence(reports: CatchReport[], filter: CatchFilter = {}) {
  const selected = filterCatchReports(reports, { ...filter, month: undefined });
  return Array.from({ length: 12 }, (_, i) => {
    const rows = selected.filter(report => Number(report.caughtOn?.slice(5, 7)) === i + 1);
    return { month: i + 1, reports: rows.length, authors: new Set(rows.map(report => report.author)).size };
  });
}
export function regionalEvidence(reports: CatchReport[], species = "") {
  const groups = new Map<string, { region: string; place: string; month: number; species: string; caught: Set<string>; poor: Set<string>; none: Set<string>; observed: Set<string>; authors: Set<string>; years: Set<string> }>();
  for (const report of uniqueReports(reports)) {
    if (!report.caughtOn) continue;
    for (const item of report.catches) {
      if (species && item.species !== species) continue;
      const month = Number(report.caughtOn.slice(5, 7));
      const key = `${report.region}/${report.place}/${month}/${item.species}`;
      const row = groups.get(key) ?? { region: report.region, place: report.place, month, species: item.species, caught: new Set<string>(), poor: new Set<string>(), none: new Set<string>(), observed: new Set<string>(), authors: new Set<string>(), years: new Set<string>() };
      const bucket = item.result === "잡음" ? row.caught : item.result === "적은 조과" ? row.poor : item.result === "못 잡음" ? row.none : row.observed;
      bucket.add(report.id); row.authors.add(report.author); row.years.add(report.caughtOn.slice(0,4)); groups.set(key, row);
    }
  }
  return [...groups.values()].sort((a,b) => a.month - b.month || a.region.localeCompare(b.region, "ko") || a.place.localeCompare(b.place,"ko"));
}
export function catchReportsCsv(reports: CatchReport[]) {
  const rows: (string | number)[][] = [["지역","장소","실제 출조 시기","시기 근거","게시·수정일","방식","어종","결과","수량(작성자 기준)","작성자","원문","한계","원문 확인일"]];
  for (const report of uniqueReports(reports)) for (const item of report.catches) rows.push([report.region,report.place,report.caughtLabel,report.dateEvidence,report.postedOn,report.method,item.species,item.result,item.quantity,report.author,report.url,report.limitation,CATCH_CHECKED_ON]);
  const cell = (value: string | number) => `"${String(value).replace(/^[=+@-]/, "'$&").replaceAll('"','""')}"`;
  return "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n");
}

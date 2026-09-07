"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useConditions, useKstToday } from "../lib/use-conditions";
import { createComparisonCache, mapConcurrent } from "../lib/conditions-client";
import { getMulTtae } from "../lib/tide-calendar";
import { explainRain, explainWave, explainWind } from "../lib/weather-feel";
import { tidePointFor } from "../lib/tide-points";
import { PwaInstallButton } from "./pwa-install-button";
import { SpeciesIcon } from "./species-icon";

type Tide = { time: string; height: number; type: "high" | "low" };
type Conditions = {
  weatherPreview?: boolean;
  tidePreview?: boolean;
  tideRetrievedAt?: string;
  sourceErrors?: { weather?: string };
  live: boolean;
  sourceStatus: { tide: boolean; weather: boolean; recentRain?: boolean; recentRainOfficial?: boolean };
  location: string;
  referencePort: string;
  tideSource?: { provider: string; stationName: string; stationCode: string; correctionLocation: string; correctionMethod: string };
  tideMethod?: "direct" | "coordinate" | "nearby" | "unsupported";
  harborCorrected: boolean;
  correctionQuality?: "local" | "nearby" | "coordinate" | "direct" | "unsupported";
  confidence?: { level: "높음" | "보통" | "낮음"; officialSources: number; tideBasis: string; reasons: string[] };
  date: string;
  rating: "최상" | "좋음" | "중간" | "나쁨";
  score: number;
  summary: string;
  bestWindow: string;
  recommendedWindows: Array<{ lowTime: string; lowHeight: number; start: string; end: string; startDayOffset?: number; endDayOffset?: number; period: "낮" | "밤" }>;
  weather: { forecastTimes?: string[]; representativeTime?: string; issuedAt?: string | null; rainUsesCategoryBounds?: boolean; missingWindowTimes?: string[]; coverageNote?: string; temperature: number; wind: number; rain: number; rainDayTotal?: number | null; sky: string; waveHeight: number | null; rainProbability: number; rainDayProbability?: number; humidity: number; basis?: "OUTING_WINDOWS" | "DAY"; focusTimes?: string[]; kind?: "forecast" | "observation" };
  recentRain?: {
    last24h: number | null;
    last48h: number | null;
    last72h: number | null;
    consecutiveRainDays: number;
    source: "KMA_ASOS" | "OPEN_METEO_GRID" | "KMA_ASOS_AND_GRID";
    station?: string;
    official?: boolean;
    coverageDays?: number;
    days?: Array<{ date: string; amount: number | null; kmaAmount: number | null; gridAmount: number | null; basis: "KMA_ASOS" | "OPEN_METEO_GRID" | "KMA_ASOS_AND_GRID" | "UNAVAILABLE" }>;
    note?: string;
  } | null;
  scoreBreakdown?: { tide: number; weather: number; visibility: number };
  riskFlags?: string[];
  tides: Tide[];
  updatedAt: string;
  notice?: string;
};

type DetailMetric = "low" | "range" | "wind" | "wave" | "rain" | "temperature";
type MetricExplanation = {
  icon: string;
  value: string;
  title: string;
  summary: string;
  points: Array<{ label: string; text: string }>;
  level: "calm" | "notice" | "caution" | "danger" | "unknown";
};

function weatherOutingPeriod(data: Conditions): "낮" | "밤" | null {
  if (data.weather.kind === "observation") return null;
  const focusTime = data.weather.representativeTime ?? data.weather.focusTimes?.[0];
  const matchingWindow = focusTime
    ? data.recommendedWindows.find(window => window.lowTime === focusTime)
    : undefined;
  if (matchingWindow) return matchingWindow.period;
  if (!focusTime || !/^\d{2}:\d{2}$/.test(focusTime)) return null;
  const [hour, minute] = focusTime.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 360 && totalMinutes < 1080 ? "낮" : "밤";
}

const REGIONS = [
  { id: "taean", name: "태안" },
  { id: "seosan", name: "서산" },
  { id: "boryeong", name: "보령·서천" },
  { id: "dangjin", name: "당진·평택" },
  { id: "metro", name: "인천·경기" },
  { id: "honam", name: "군산·부안·목포" },
];

const SPOTS = [
  { id: "gujina", name: "꾸지나무골 해수욕장", region: "taean", source: "gujina", sourceLabel: "만대항", campZone: "north-taean", terrain: "암반·모래" },
  { id: "sinduri", name: "신두리 해수욕장", region: "taean", source: "sinduri", sourceLabel: "신두리항", campZone: "north-taean", terrain: "모래·갯벌" },
  { id: "hakampo", name: "학암포 해수욕장", region: "taean", source: "hakampo", sourceLabel: "학암포항", campZone: "north-taean", terrain: "암반·모래" },
  { id: "iwon_dike", name: "이원방조제", region: "taean", source: "iwon_dike", sourceLabel: "이원방조제", campZone: "north-taean", terrain: "방조제·펄·모래" },
  { id: "guryepo", name: "구례포 해수욕장", region: "taean", source: "guryepo", sourceLabel: "학암포항", campZone: "north-taean", terrain: "암반·모래·웅덩이" },
  { id: "gureumpo", name: "구름포 해수욕장", region: "taean", source: "gureumpo", sourceLabel: "모항항", campZone: "west-taean", terrain: "암반·모래·웅덩이" },
  { id: "uihang", name: "의항 해수욕장", region: "taean", source: "uihang", sourceLabel: "모항항", campZone: "west-taean", terrain: "암반·모래" },
  { id: "gareumi", name: "갈음이 해수욕장", region: "taean", source: "gareumi", sourceLabel: "안흥항", campZone: "west-taean", terrain: "암반·모래·웅덩이" },
  { id: "mallipo", name: "만리포·천리포", region: "taean", source: "mallipo", sourceLabel: "모항항", campZone: "west-taean", terrain: "모래·암반" },
  { id: "mongsanpo", name: "몽산포 해수욕장", region: "taean", source: "mongsanpo", sourceLabel: "몽산포항", campZone: "central-taean", terrain: "넓은 갯벌" },
  { id: "dangampo", name: "당암포구", region: "taean", source: "dangampo", sourceLabel: "당암포구", campZone: "central-taean", terrain: "포구·펄갯벌·수로" },
  { id: "jinsanri", name: "진산리 갯벌체험장", region: "taean", source: "jinsanri", sourceLabel: "진산리어촌계", campZone: "central-taean", terrain: "단단한 모래·갯벌" },
  { id: "kkotji", name: "꽃지·방포 해변", region: "taean", source: "kkotji", sourceLabel: "방포항", campZone: "anmyeon", terrain: "암반·모래" },
  { id: "gomsom", name: "곰섬해수욕장", region: "taean", source: "gomsom", sourceLabel: "마검포항", campZone: "central-taean", terrain: "갯벌·모래" },
  { id: "mageompo", name: "마검포항·마검포해수욕장", region: "taean", source: "mageompo", sourceLabel: "마검포항", campZone: "central-taean", terrain: "포구·갯벌·모래" },
  { id: "deuruni", name: "드르니항", region: "taean", source: "deuruni", sourceLabel: "드르니항", campZone: "anmyeon", terrain: "갯벌·수로" },
  { id: "sinjindo", name: "신진도항", region: "taean", source: "sinjindo", sourceLabel: "신진도항", campZone: "west-taean", terrain: "암반·방파제" },
  { id: "anheung", name: "안흥항", region: "taean", source: "anheung", sourceLabel: "안흥항", campZone: "west-taean", terrain: "암반·방파제" },
  { id: "yeonpo", name: "연포 해수욕장", region: "taean", source: "yeonpo", sourceLabel: "연포항", campZone: "central-taean", terrain: "모래·암반" },
  { id: "padory", name: "파도리 해수욕장", region: "taean", source: "padory", sourceLabel: "모항항", campZone: "west-taean", terrain: "자갈·암반" },
  { id: "eoeundol", name: "어은돌 해수욕장", region: "taean", source: "eoeundol", sourceLabel: "모항항", campZone: "west-taean", terrain: "모래·암반" },
  { id: "baekripo", name: "백리포 해수욕장", region: "taean", source: "baekripo", sourceLabel: "모항항", campZone: "west-taean", terrain: "모래·암반" },
  { id: "cheongpodae", name: "청포대 해수욕장", region: "taean", source: "cheongpodae", sourceLabel: "몽산포항", campZone: "central-taean", terrain: "넓은 갯벌" },
  { id: "dalsanpo", name: "달산포 해수욕장", region: "taean", source: "dalsanpo", sourceLabel: "몽산포항", campZone: "central-taean", terrain: "모래·갯벌" },
  { id: "sambong", name: "삼봉 해수욕장", region: "taean", source: "sambong", sourceLabel: "백사장항", campZone: "anmyeon", terrain: "모래·갯벌" },
  { id: "batgae", name: "밧개 해수욕장", region: "taean", source: "batgae", sourceLabel: "방포항", campZone: "anmyeon", terrain: "모래·갯벌" },
  { id: "saetbyeol", name: "샛별 해수욕장", region: "taean", source: "saetbyeol", sourceLabel: "방포항", campZone: "anmyeon", terrain: "모래·암반" },
  { id: "baramarae", name: "바람아래 해수욕장", region: "taean", source: "baramarae", sourceLabel: "영목항", campZone: "anmyeon", terrain: "갯벌·모래" },
  { id: "yeonyukgyo", name: "태안 연육교", region: "taean", source: "yeonyukgyo", sourceLabel: "안면대교", campZone: "anmyeon", terrain: "갯벌·수로" },
  { id: "hwangdo", name: "황도·황도항", region: "taean", source: "hwangdo", sourceLabel: "황도항", campZone: "anmyeon", terrain: "갯벌·바위" },
  { id: "ganwoldo", name: "간월도", region: "seosan", source: "ganwoldo", sourceLabel: "간월도항", campZone: "seosan", terrain: "갯벌·돌밭" },
  { id: "jungri", name: "중리어촌체험마을", region: "seosan", source: "jungri", sourceLabel: "중리항", campZone: "seosan", terrain: "갯벌" },
  { id: "garorim", name: "가로림만", region: "seosan", source: "garorim", sourceLabel: "구도항", campZone: "seosan", terrain: "갯벌·수로" },
  { id: "beolcheonpo", name: "벌천포해수욕장", region: "seosan", source: "beolcheonpo", sourceLabel: "벌천포", campZone: "seosan", terrain: "몽돌·갯벌·갯바위" },
  { id: "samgilpo", name: "삼길포항", region: "seosan", source: "samgilpo", sourceLabel: "삼길포항", campZone: "seosan", terrain: "항구·방파제·갯바위" },
  { id: "muchangpo", name: "무창포 해수욕장", region: "boryeong", source: "muchangpo", sourceLabel: "무창포항", campZone: "boryeong", terrain: "모래·갯벌" },
  { id: "doksan", name: "보령 독산 해수욕장", region: "boryeong", source: "doksan", sourceLabel: "무창포항", campZone: "boryeong", terrain: "넓은 모래·갯벌" },
  { id: "daecheon", name: "대천 해수욕장", region: "boryeong", source: "daecheon", sourceLabel: "대천항", campZone: "boryeong", terrain: "모래" },
  { id: "seondori", name: "선도리 갯벌체험장", region: "boryeong", source: "seondori", sourceLabel: "홍원항", campZone: "boryeong", terrain: "갯벌" },
  { id: "chunjangdae", name: "서천 춘장대 해수욕장", region: "boryeong", source: "chunjangdae", sourceLabel: "홍원항", campZone: "boryeong", terrain: "모래·갯벌" },
  { id: "biin", name: "비인해변", region: "boryeong", source: "biin", sourceLabel: "비인해변", campZone: "boryeong", terrain: "넓은 모래·갯벌" },
  { id: "waemok", name: "왜목마을", region: "dangjin", source: "waemok", sourceLabel: "왜목항", campZone: "dangjin", terrain: "돌밭·갯벌" },
  { id: "janggohang", name: "장고항", region: "dangjin", source: "janggohang", sourceLabel: "장고항", campZone: "dangjin", terrain: "포구·갯벌·갯바위" },
  { id: "seokmun_dike", name: "석문방조제", region: "dangjin", source: "seokmun_dike", sourceLabel: "석문방조제", campZone: "dangjin", terrain: "방조제·펄갯벌·깊은 수로" },
  { id: "dobido", name: "도비도", region: "dangjin", source: "dobido", sourceLabel: "도비도항", campZone: "dangjin", terrain: "갯벌·수로" },
  { id: "haengdamdo", name: "행담도", region: "dangjin", source: "haengdamdo", sourceLabel: "행담도", campZone: "dangjin", terrain: "섬·펄갯벌·수로" },
  { id: "jebudo", name: "제부도", region: "metro", source: "jebudo", sourceLabel: "제부항", campZone: "metro", terrain: "갯벌·암반" },
  { id: "daebudo", name: "대부도", region: "metro", source: "daebudo", sourceLabel: "방아머리항", campZone: "metro", terrain: "갯벌" },
  { id: "dongmak", name: "강화 동막해변", region: "metro", source: "dongmak", sourceLabel: "분오리항", campZone: "metro", terrain: "갯벌" },
  { id: "deokjeokdo", name: "덕적도", region: "metro", source: "deokjeokdo", sourceLabel: "덕적도항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "janggyeongri", name: "장경리 해수욕장", region: "metro", source: "janggyeongri", sourceLabel: "영흥도항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "seonjaedo", name: "선재도 측도", region: "metro", source: "seonjaedo", sourceLabel: "선재도항", campZone: "metro", terrain: "갯벌·수로" },
  { id: "eulwangri", name: "을왕리 해수욕장", region: "metro", source: "eulwangri", sourceLabel: "용유항", campZone: "metro", terrain: "모래·암반" },
  { id: "keunmuri", name: "큰무리어촌체험마을", region: "metro", source: "keunmuri", sourceLabel: "큰무리항", campZone: "metro", terrain: "갯벌" },
  { id: "ganghwa_bunori", name: "강화 분오리돈대 갯벌", region: "metro", source: "ganghwa_bunori", sourceLabel: "분오리항", campZone: "metro", terrain: "갯벌" },
  { id: "ganghwa_janghwari", name: "강화 장화리 갯벌", region: "metro", source: "ganghwa_janghwari", sourceLabel: "장화리", campZone: "metro", terrain: "갯벌" },
  { id: "ganghwa_hwangsando", name: "강화 황산도 갯벌", region: "metro", source: "ganghwa_hwangsando", sourceLabel: "황산도항", campZone: "metro", terrain: "갯벌" },
  { id: "ganghwa_oepoh", name: "강화 외포항 갯벌", region: "metro", source: "ganghwa_oepoh", sourceLabel: "외포항", campZone: "metro", terrain: "갯벌·수로" },
  { id: "muui_silmi", name: "무의도 실미 해수욕장", region: "metro", source: "muui_silmi", sourceLabel: "실미도", campZone: "metro", terrain: "모래·갯벌" },
  { id: "somuui", name: "소무의도 갯벌", region: "metro", source: "somuui", sourceLabel: "소무의항", campZone: "metro", terrain: "갯벌·암반" },
  { id: "songdo", name: "송도 갯벌", region: "metro", source: "songdo", sourceLabel: "인천항", campZone: "metro", terrain: "갯벌" },
  { id: "seonjaedo_eochon", name: "선재도 어촌체험마을", region: "metro", source: "seonjaedo_eochon", sourceLabel: "선재도항", campZone: "metro", terrain: "갯벌" },
  { id: "masian", name: "마시안 해변", region: "metro", source: "masian", sourceLabel: "용유항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "seonnyeobawi", name: "선녀바위 해수욕장", region: "metro", source: "seonnyeobawi", sourceLabel: "용유항", campZone: "metro", terrain: "모래·암반" },
  { id: "muui_hanagae", name: "무의도 하나개 해수욕장", region: "metro", source: "muui_hanagae", sourceLabel: "하나개항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "wangsan", name: "왕산 해수욕장", region: "metro", source: "wangsan", sourceLabel: "용유항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "seokmodo", name: "석모도 민머루 해수욕장", region: "metro", source: "seokmodo", sourceLabel: "석모도", campZone: "metro", terrain: "모래·갯벌" },
  { id: "bangameori", name: "대부도 방아머리 해수욕장", region: "metro", source: "bangameori", sourceLabel: "방아머리항", campZone: "metro", terrain: "모래·갯벌" },
  { id: "daebudo_dongju", name: "대부도 동주염전 갯벌", region: "metro", source: "daebudo_dongju", sourceLabel: "대부도", campZone: "metro", terrain: "갯벌" },
  { id: "daebudo_yeongjeon", name: "대부도 영전 갯벌", region: "metro", source: "daebudo_yeongjeon", sourceLabel: "대부도", campZone: "metro", terrain: "갯벌" },
  { id: "ippado", name: "입파도", region: "metro", source: "ippado", sourceLabel: "입파도", campZone: "metro", terrain: "암반·모래" },
  { id: "jonghyeon", name: "종현어촌체험마을", region: "metro", source: "jonghyeon", sourceLabel: "대부도", campZone: "metro", terrain: "갯벌" },
  { id: "daemyeong", name: "김포 대명항", region: "metro", source: "daemyeong", sourceLabel: "대명항", campZone: "metro", terrain: "갯벌·수로" },
  { id: "heulgot", name: "흘곶어촌체험마을", region: "metro", source: "heulgot", sourceLabel: "대부도", campZone: "metro", terrain: "갯벌" },
  { id: "jeburi_eochon", name: "제부리어촌체험마을", region: "metro", source: "jeburi_eochon", sourceLabel: "제부항", campZone: "metro", terrain: "갯벌" },
  { id: "gungpyeongri", name: "궁평리어촌체험마을", region: "metro", source: "gungpyeongri", sourceLabel: "궁평항", campZone: "metro", terrain: "갯벌" },
  { id: "seongam", name: "대부도 선감어촌체험마을", region: "metro", source: "seongam", sourceLabel: "선감항", campZone: "metro", terrain: "갯벌" },
  { id: "baekmiri", name: "백미리 해수욕장", region: "metro", source: "baekmiri", sourceLabel: "백미리", campZone: "metro", terrain: "갯벌·모래" },
  { id: "ueumdo", name: "우음도", region: "metro", source: "ueumdo", sourceLabel: "시화호", campZone: "metro", terrain: "갯벌" },
  { id: "pungdo", name: "풍도어촌체험마을", region: "metro", source: "pungdo", sourceLabel: "풍도항", campZone: "metro", terrain: "암반·갯벌" },
  { id: "oido", name: "오이도어촌체험마을", region: "metro", source: "oido", sourceLabel: "오이도", campZone: "metro", terrain: "갯벌" },
  { id: "byeonsan", name: "변산해수욕장", region: "honam", source: "byeonsan", sourceLabel: "변산해수욕장", campZone: "honam", terrain: "고운 모래·완만한 갯벌" },
  { id: "seonyudo", name: "군산 선유도", region: "honam", source: "seonyudo", sourceLabel: "선유도항", campZone: "honam", terrain: "모래·갯벌" },
  { id: "mokpo", name: "목포 갯벌", region: "honam", source: "mokpo", sourceLabel: "목포", campZone: "honam", terrain: "갯벌" },
  { id: "muan", name: "무안 도리포 갯벌", region: "honam", source: "muan", sourceLabel: "도리포항", campZone: "honam", terrain: "갯벌" },
];

const NEWLY_ADDED_SPOT_IDS = ["dangampo", "seokmun_dike", "iwon_dike", "haengdamdo", "janggohang"] as const;

const CAMPS = [
  { name: "SE클럽(태안둘레길캠핑장)", zone: "north-taean", pet: "소형견 가능", type: "일반야영장", note: "꾸지나무골·전용해변 인근", url: "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=3139&viewType=read01" },
  { name: "신두57글램핑&빌리지", zone: "north-taean", pet: "반려견 가능", type: "캠핑·글램핑", note: "신두리해수욕장 앞", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=100070" },
  { name: "신두리 오렌지 캠핑장", zone: "north-taean", pet: "동반 여부 문의", type: "오토캠핑", note: "신두리 해안사구 앞", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=100306&viewType=read01" },
  { name: "태안별빛오토캠핑장", zone: "west-taean", pet: "반려견 가능", type: "오토캠핑", note: "서해 해변권", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=3141&viewType=read01" },
  { name: "몽산포감성캠핑장", zone: "central-taean", pet: "반려견 가능", type: "오토캠핑", note: "몽산포 해변권", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=8179" },
  { name: "몽산포오션캠핑장", zone: "central-taean", pet: "대형견도 가능", type: "오토캠핑", note: "목줄·입마개 규정 확인", url: "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=7722&viewType=read01" },
  { name: "곰섬캠핑장 2구역", zone: "central-taean", pet: "소형견 가능", type: "오토캠핑", note: "곰섬 해변 인근", url: "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=100135&viewType=read01" },
  { name: "안면도마린오토캠핑장", zone: "anmyeon", pet: "소형견 가능", type: "오토캠핑", note: "방포항·꽃지 인근", url: "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=100266&viewType=read01" },
  { name: "안면도스쿨버스캠핑장", zone: "anmyeon", pet: "반려견 가능", type: "카라반", note: "안면도 남부권", url: "https://www.gocamping.or.kr/bsite/camp/info/read.do?c_no=8110&viewType=read01" },
  { name: "펫앤트리 애견글램핑", zone: "seosan", pet: "애견 전용", type: "글램핑", note: "서산 팔봉면", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=100246&listOrdrTrget=last_updusr_pnttm" },
  { name: "무창포해수욕장 오토캠핑장", zone: "boryeong", pet: "반려견 불가", type: "오토캠핑", note: "무창포 해변 바로 앞", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=6986&viewType=read01" },
  { name: "무창포솔원캠핑장", zone: "boryeong", pet: "반려견 불가", type: "일반야영장", note: "무창포항 차량 약 3분", url: "https://gocamping.or.kr/bsite/camp/info/read.do?c_no=7006&viewType=read01" },
];

const ratingClass: Record<Conditions["rating"], string> = {
  최상: "best",
  좋음: "good",
  중간: "middle",
  나쁨: "bad",
};

const RECOMMEND_CANDIDATES = [
  ["gujina",36.85,126.18],["sinduri",36.84,126.19],["hakampo",36.90,126.20],["mallipo",36.79,126.14],
  ["mongsanpo",36.67,126.29],["kkotji",36.50,126.34],["gomsom",36.59,126.29],["mageompo",36.62234411,126.2848637],["ganwoldo",36.60,126.47],
  ["garorim",36.89,126.35],["muchangpo",36.24,126.54],["doksan",36.22,126.54],["daecheon",36.31,126.51],["seondori",36.15,126.52],["chunjangdae",36.16,126.53],
  ["waemok",37.04,126.53],["dobido",36.94,126.45],["deuruni",36.59,126.33],["yeonyukgyo",36.60,126.32],
  ["dangampo",36.624833,126.3585],["iwon_dike",36.8996,126.26],["jinsanri",36.699992,126.266965],
  ["beolcheonpo",36.967831,126.336898],["samgilpo",37.003374,126.452902],["biin",36.163354,126.52434],
  ["janggohang",37.030623,126.559971],["seokmun_dike",36.9988,126.653],["haengdamdo",36.945143,126.807129],
  ["byeonsan",35.679992,126.530911],
  ["sinjindo",36.68,126.14],["anheung",36.67,126.14],["yeonpo",36.64,126.23],["padory",36.73,126.13],
  ["eoeundol",36.75,126.13],["cheongpodae",36.64,126.30],["sambong",36.58,126.31],["jebudo",37.16,126.62],
  ["daebudo",37.25,126.58],["muui_hanagae",37.38,126.41],["dongmak",37.59,126.46],
] as const;

type RankSpecies = "낙지" | "소라" | "꽃게" | "대하" | "새우" | "광어" | "우럭" | "골뱅이" | "농어" | "숭어" | "해삼" | "맛조개" | "동죽" | "바지락" | "백합";

type SpeciesTimePreference = "day" | "night" | "either";
type SpeciesTimeGuide = {
  preference: SpeciesTimePreference;
  icon: string;
  label: string;
  note: string;
};

const SPECIES_TIME_GUIDE: Record<string, SpeciesTimeGuide> = {
  낙지: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "생태상 밤에 움직이는 모습을 관찰하기 유리해요." },
  소라: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "밤에 바위와 해조류 주변으로 나오는 성향이 강해요." },
  꽃게: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "밤에 모래·갯벌과 얕은 수로를 이동하는 모습을 보기 쉬워요." },
  대하: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "야행성이라 밤의 연안·하구에서 활동성이 높아요." },
  새우: { preference: "either", icon: "☀️🌙", label: "종·물때 우선", note: "새우는 여러 종을 묶은 이름이라 시간대를 하나로 단정하지 않아요." },
  광어: { preference: "night", icon: "🌙", label: "야간 관찰 유리", note: "어린 광어는 밤에 모래 밖으로 나오는 경향이 있지만 성어와 현장은 다를 수 있어요." },
  우럭: { preference: "either", icon: "☀️🌙", label: "물때 우선", note: "낮과 밤의 움직임이 달라 지형·물때·시야를 먼저 봐요." },
  골뱅이: { preference: "either", icon: "☀️🌙", label: "종·물때 우선", note: "골뱅이는 여러 고둥류를 묶은 이름이라 종류와 지형을 먼저 확인해요." },
  농어: { preference: "night", icon: "🌙", label: "야간 관찰 유리", note: "해질녘과 밤에 먹이를 따라 얕은 곳으로 접근할 수 있어요." },
  숭어: { preference: "day", icon: "☀️", label: "낮 관찰 편리", note: "밝을 때 갯벌 수로와 항내의 무리를 확인하기 편해요." },
  해삼: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "밤에 돌밭과 얕은 암반에서 움직이는 모습을 보기 쉬워요." },
  맛조개: { preference: "day", icon: "☀️", label: "낮 채취 편리", note: "낮에 구멍과 모래 상태, 들물 방향을 보기 쉬워 캐기 편해요." },
  동죽: { preference: "day", icon: "☀️", label: "낮 채취 편리", note: "낮에 갯벌 경계와 바닥 상태를 확인하기 쉬워 캐기 편해요." },
  바지락: { preference: "day", icon: "☀️", label: "낮 채취 편리", note: "낮에 채취구역과 갯벌 상태, 들물을 확인하기 쉬워요." },
  백합: { preference: "day", icon: "☀️", label: "낮 채취 편리", note: "낮에 모래갯벌의 구멍과 바닥 변화를 확인하기 쉬워요." },
  주꾸미: { preference: "night", icon: "🌙", label: "야간 활동 활발", note: "야행성이라 밤에 움직이는 모습을 관찰하기 유리해요." },
  참문어: { preference: "either", icon: "☀️🌙", label: "지형·물때 우선", note: "개체와 서식처에 따라 활동 시간이 달라 바위틈과 물때를 먼저 봐요." },
};

const DEFAULT_TIME_GUIDE: SpeciesTimeGuide = {
  preference: "either",
  icon: "☀️🌙",
  label: "물때 우선",
  note: "시간대보다 간조 높이와 노출 시간, 지형을 먼저 확인해요.",
};

function getSpeciesTimeGuide(name: string) {
  return SPECIES_TIME_GUIDE[name] ?? DEFAULT_TIME_GUIDE;
}

const RANK_SPECIES: RankSpecies[] = ["낙지", "소라", "꽃게", "대하", "새우", "광어", "우럭", "골뱅이", "농어", "숭어", "해삼", "맛조개", "동죽", "바지락", "백합"];

const SPECIES_SEASON: Record<RankSpecies, { good: number[]; peak: number[]; text: string }> = {
  낙지: { good: [3,4,5,7,8,9,10,11], peak: [4,5,9,10], text: "봄·가을 활동성이 높고, 여름에는 야간 웅덩이·수로 관찰을 노려요." },
  소라: { good: [5,6,7,8,9,10], peak: [6,7,8,9], text: "초여름~초가을 암반과 해조류 지대에서 관찰 기회가 늘어요." },
  광어: { good: [4,5,6,7,9,10,11], peak: [5,6,9,10], text: "봄·가을이 중심이며 여름에는 얕은 모래밭의 어린 개체가 보일 수 있어요." },
  우럭: { good: [3,4,5,6,9,10,11], peak: [4,5,10,11], text: "봄·가을 암반·방파제권이 유리하고 한여름 낮에는 깊은 곳으로 빠지기 쉬워요." },
  꽃게: { good: [3,4,5,6,9,10,11], peak: [4,5,9,10], text: "봄과 금어기가 끝난 늦여름~가을, 모래·갯벌·얕은 수로에서 관찰 기대가 높아요." },
  대하: { good: [8,9,10,11], peak: [9,10], text: "늦여름부터 가을이 중심이며 9~10월 연안·하구 이동 시기가 좋아요." },
  새우: { good: [5,6,7,8,9,10,11], peak: [8,9,10], text: "종에 따라 시기가 다르지만 여름~가을 모래·펄·수로와 웅덩이에서 관찰하기 좋아요." },
  골뱅이: { good: [1,2,3,4,10,11,12], peak: [11,12,1,2], text: "수온이 낮은 늦가을~초봄, 밤의 돌밭·해조류 주변이 유리해요." },
  농어: { good: [5,6,7,8,9,10], peak: [6,7,8,9], text: "초여름~가을 수로·하구·방파제 주변에서 활발하며 밤이나 흐린 물에 접근해요." },
  숭어: { good: [3,4,5,6,7,8,9,10,11], peak: [4,5,9,10], text: "봄·가을이 중심이지만 여름에도 갯벌 수로와 항내에서 무리를 볼 수 있어요." },
  해삼: { good: [1,2,3,4,5,10,11,12], peak: [11,12,1,2,3], text: "차가운 계절 돌밭에서 활발하고, 고수온기에는 하면으로 관찰 가능성이 낮아요." },
  맛조개: { good: [3,4,5,6,7,8,9,10,11], peak: [4,5,6], text: "봄~초여름 넓은 모래갯벌에서 찾기 좋고 구멍과 염분 반응을 살펴요." },
  동죽: { good: [3,4,5,6,7,8,9,10,11], peak: [4,5,6,9,10], text: "봄·초여름과 가을, 모래와 펄이 섞인 갯벌의 얕은 층을 살펴요." },
  바지락: { good: [3,4,5,6,9,10,11], peak: [4,5,10], text: "봄·가을 모래가 섞인 갯벌에서 살이 차고 채취 활동이 활발해요." },
  백합: { good: [5,6,7,8,9], peak: [6,7,8], text: "초여름~여름 깨끗한 모래갯벌·하구권이 중심이에요." },
};

const SPECIES_RANK_CANDIDATES: Record<RankSpecies, string[]> = {
  낙지: ["hwangdo", "ganwoldo", "waemok", "deuruni", "yeonyukgyo", "gomsom", "mageompo", "garorim", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "jinsanri", "biin", "jebudo", "somuui", "guryepo", "gureumpo"],
  소라: ["padory", "hakampo", "guryepo", "gureumpo", "gareumi", "kkotji", "saetbyeol", "sinjindo", "anheung", "iwon_dike", "janggohang", "samgilpo", "beolcheonpo", "somuui", "ippado", "pungdo"],
  광어: ["waemok", "mallipo", "yeonpo", "eoeundol", "baekripo", "muchangpo", "doksan", "chunjangdae", "daecheon", "iwon_dike", "seokmun_dike", "janggohang", "samgilpo", "beolcheonpo", "byeonsan", "seonnyeobawi", "wangsan", "muui_hanagae", "seonyudo"],
  우럭: ["waemok", "sinjindo", "anheung", "padory", "hakampo", "guryepo", "gareumi", "kkotji", "iwon_dike", "seokmun_dike", "janggohang", "samgilpo", "beolcheonpo", "somuui", "ippado", "pungdo"],
  꽃게: ["mongsanpo", "cheongpodae", "dalsanpo", "gomsom", "mageompo", "ganwoldo", "muchangpo", "doksan", "chunjangdae", "seondori", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "jinsanri", "biin", "byeonsan", "daebudo", "baekmiri"],
  대하: ["mongsanpo", "gomsom", "mageompo", "ganwoldo", "garorim", "muchangpo", "doksan", "chunjangdae", "seondori", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "jinsanri", "biin", "byeonsan", "daebudo", "baekmiri", "mokpo"],
  새우: ["mongsanpo", "cheongpodae", "gomsom", "mageompo", "ganwoldo", "garorim", "muchangpo", "doksan", "chunjangdae", "seondori", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "jinsanri", "biin", "byeonsan", "jebudo", "daebudo"],
  골뱅이: ["padory", "hakampo", "guryepo", "gureumpo", "gareumi", "kkotji", "iwon_dike", "janggohang", "samgilpo", "beolcheonpo", "somuui", "ippado", "pungdo"],
  농어: ["mongsanpo", "waemok", "muchangpo", "daecheon", "anheung", "sinjindo", "garorim", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "samgilpo", "biin", "seonyudo"],
  숭어: ["mongsanpo", "waemok", "ganwoldo", "garorim", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "janggohang", "samgilpo", "biin", "daecheon", "mokpo"],
  해삼: ["padory", "hakampo", "guryepo", "gareumi", "kkotji", "saetbyeol", "iwon_dike", "janggohang", "samgilpo", "beolcheonpo", "somuui", "ippado", "pungdo"],
  맛조개: ["mongsanpo", "cheongpodae", "dalsanpo", "muchangpo", "doksan", "chunjangdae", "dangampo", "jinsanri", "biin", "byeonsan"],
  동죽: ["seonjaedo_eochon", "jeburi_eochon", "baekmiri", "jungri", "seondori", "dongmak", "muui_hanagae", "dangampo", "jinsanri", "biin", "byeonsan"],
  바지락: ["ganwoldo", "jungri", "garorim", "muchangpo", "doksan", "chunjangdae", "seondori", "dobido", "dangampo", "seokmun_dike", "haengdamdo", "jinsanri", "biin", "byeonsan", "baekmiri", "jeburi_eochon"],
  백합: ["mongsanpo", "cheongpodae", "gomsom", "mageompo", "muchangpo", "doksan", "chunjangdae", "seondori", "dangampo", "jinsanri", "biin", "byeonsan", "baekmiri", "mokpo"],
};

const FIELD_REPORT_BONUS: Partial<Record<RankSpecies, Record<string, number>>> = {
  낙지: { hwangdo: 7, ganwoldo: 6, waemok: 5, gomsom: 5, garorim: 5 },
  소라: { padory: 7, hakampo: 6, guryepo: 6, gareumi: 5, somuui: 5 },
  광어: { waemok: 10 },
  우럭: { sinjindo: 7, anheung: 7, padory: 5, somuui: 5 },
  꽃게: { mongsanpo: 7, ganwoldo: 5, muchangpo: 5 },
  대하: { mongsanpo: 6, ganwoldo: 6, garorim: 5, muchangpo: 5 },
  새우: {},
  골뱅이: { padory: 6, hakampo: 5, guryepo: 5, somuui: 4 },
  농어: { mongsanpo: 9, waemok: 5, anheung: 5, sinjindo: 5 },
  숭어: { mongsanpo: 9, ganwoldo: 5, garorim: 5 },
  해삼: { padory: 6, hakampo: 5, gareumi: 5, somuui: 4 },
  맛조개: {},
  동죽: {},
  바지락: { ganwoldo: 7, jungri: 6, seondori: 5, baekmiri: 5 },
  백합: { mongsanpo: 6, cheongpodae: 5, seondori: 5, mokpo: 5 },
};

const AQUACULTURE_ECOLOGY_BONUS: Partial<Record<RankSpecies, Record<string, number>>> = {
  광어: { waemok: 10, sinjindo: 5, anheung: 5 },
  우럭: { waemok: 10, sinjindo: 6, anheung: 6 },
};

const SPECIES_EVIDENCE: Partial<Record<RankSpecies, Record<string, string>>> = {
  광어: { waemok: "근거 A · 키릭의 왜목마을 광어 다수 직접관찰" },
  맛조개: {
    mongsanpo: "근거 C · 넓은 모래갯벌 지형 후보, 확인 가능한 조과글 추가 필요", doksan: "근거 C · 넓은 모래갯벌 지형 후보, 현장 채취허용 확인 필요",
    chunjangdae: "근거 C · 모래갯벌 지형 후보, 확인 가능한 조과글 추가 필요", muchangpo: "근거 C · 모래갯벌 지형 후보, 실제 조과 미확인",
  },
  동죽: {
    seonjaedo_eochon: "근거 B · 어촌체험마을 권역, 동죽 운영 여부는 방문 전 확인", jeburi_eochon: "근거 B · 어촌체험마을 권역, 동죽 운영 여부는 방문 전 확인",
    baekmiri: "근거 B · 어촌체험마을 권역, 채취종목·운영일 확인", jungri: "근거 B · 어촌체험마을 권역, 채취종목·운영일 확인", seondori: "근거 B · 갯벌체험장 권역, 동죽 채취 가능 여부 확인",
  },
};

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = (v: number) => v * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function top5Score(data: Conditions, distance: number, terrain: string) {
  const heights = data.tides.map(tide => tide.height);
  const lows = data.tides.filter(tide => tide.type === "low").map(tide => tide.height);
  const range = heights.length > 1 ? Math.max(...heights) - Math.min(...heights) : 0;
  const lowest = lows.length ? Math.min(...lows) : 300;
  const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const conditionPoints = data.score * .28;
  const rangePoints = clamp((range - 120) / 400) * 22;
  const lowPoints = clamp((260 - lowest) / 220) * 12;
  const weatherPoints = data.sourceStatus.weather
    ? clamp(22 - data.weather.wind * 1.45 - data.weather.rain * .8 - (data.weather.waveHeight ?? 0) * 3 - data.weather.rainProbability * .03, 0, 22)
    : 11;
  const distancePoints = clamp(16 - distance / 7, 0, 16);
  const terrainPoints = /갯벌|암반|돌밭|수로/.test(terrain) ? 2 : 0;
  return Math.round(clamp(conditionPoints + rangePoints + lowPoints + weatherPoints + distancePoints + terrainPoints, 0, 99.9) * 10) / 10;
}

function speciesRankScore(species: RankSpecies, spot: typeof SPOTS[number], data: Conditions) {
  const local = getSpecies(data.date, spot.source, spot.terrain, data).rows.find(item => item.name === species);
  if (!local || local.closed) return { score: 0, reasons: local?.reasons ?? ["금어기 또는 계산 대상이 아니에요."] };
  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
  const habitatTerms: Record<RankSpecies, string[]> = {
    낙지: ["갯벌", "펄", "돌밭", "바위", "수로", "웅덩이"], 소라: ["암반", "바위", "돌밭", "자갈", "웅덩이"],
    광어: ["모래", "수로", "웅덩이"], 우럭: ["암반", "바위", "돌밭", "방파제", "웅덩이"], 꽃게: ["모래", "갯벌", "펄", "수로"], 대하: ["모래", "갯벌", "펄", "수로"], 새우: ["모래", "갯벌", "펄", "수로", "웅덩이"],
    골뱅이: ["암반", "바위", "돌밭", "자갈", "웅덩이"], 농어: ["수로", "방파제", "갯벌", "암반"], 숭어: ["수로", "갯벌", "모래", "방파제"],
    해삼: ["암반", "바위", "돌밭", "자갈", "웅덩이"], 맛조개: ["넓은", "모래", "갯벌"], 동죽: ["모래", "갯벌", "펄"], 바지락: ["모래", "갯벌", "펄"], 백합: ["모래", "갯벌"],
  };
  const matchedTerms = habitatTerms[species].filter(term => spot.terrain.includes(term));
  const habitatPoints = clamp(6 + matchedTerms.length * 6, 6, 30);

  const heights = data.tides.map(tide => tide.height);
  const lows = data.tides.filter(tide => tide.type === "low").map(tide => tide.height);
  const range = heights.length > 1 ? Math.max(...heights) - Math.min(...heights) : 0;
  const lowest = lows.length ? Math.min(...lows) : 300;
  const tidePoints = clamp((range - 120) / 420, 0, 1) * 12 + clamp((280 - lowest) / 240, 0, 1) * 13;

  const dayLow = data.recommendedWindows?.some(window => window.period === "낮") ?? false;
  const nightLow = data.recommendedWindows?.some(window => window.period === "밤") ?? false;
  const timeGuide = getSpeciesTimeGuide(species);
  const matchingLow = timeGuide.preference === "day" ? dayLow : timeGuide.preference === "night" ? nightLow : dayLow || nightLow;
  const timingPoints = timeGuide.preference === "either" ? (matchingLow ? 11 : 6) : matchingLow ? 15 : 5;

  const month = Number(data.date.split("-")[1]);
  const season = SPECIES_SEASON[species];
  const seasonPoints = season.peak.includes(month) ? 15 : season.good.includes(month) ? 10 : 4;

  const visibility = getWaterVisibility(data, spot.terrain);
  const visibilityPoints = visibility.level === "비교적 깨끗" ? 10 : visibility.level === "약간 흐림" ? 7 : visibility.level === "많이 흐림" ? 3 : 0;
  const fieldBonus = FIELD_REPORT_BONUS[species]?.[spot.id] ?? 0;
  const aquacultureBonus = AQUACULTURE_ECOLOGY_BONUS[species]?.[spot.id] ?? 0;
  const evidence = SPECIES_EVIDENCE[species]?.[spot.id]
    ?? (aquacultureBonus ? "근거 B · 양식활동 연안권 보조정보, 실제 조과는 추가 확인 필요" : "근거 C · 지형·물때 후보, 검증 가능한 현장 조과 제보 없음");
  const evidencePoints = evidence.startsWith("근거 A") ? 5 : evidence.startsWith("근거 B") ? 2 : 0;
  const reportPoints = Math.max(evidencePoints, clamp((fieldBonus + aquacultureBonus) * .5, 0, 5));

  const score = Math.round(clamp(habitatPoints + tidePoints + timingPoints + seasonPoints + visibilityPoints + reportPoints, 0, 98.9) * 10) / 10;
  const reasons = [
    evidence,
    `${spot.terrain}: 맞는 지형 요소 ${matchedTerms.join("·") || "적음"} → 지형 ${habitatPoints}/30점`,
    `조차 ${Math.round(range)}cm·최저조위 ${Math.round(lowest)}cm → 물때 ${tidePoints.toFixed(1)}/25점`,
    `${timeGuide.icon} ${timeGuide.label}·${matchingLow ? "맞는 시간대 간조 있음" : "맞는 시간대 간조 없음"}·수중시야 ${visibility.level} → 시간 ${timingPoints}/15, 시야 ${visibilityPoints}/10점`,
    `${month}월 계절점수 ${seasonPoints}/15점: ${season.text}`,
  ];
  if (fieldBonus) reasons.push(`공개 현장 경험 가산 ${Math.min(5, fieldBonus * .5).toFixed(1)}점`);
  if (aquacultureBonus) reasons.push(`양식활동 연안권 보조 가산 포함(출입·채취 허용 의미 아님)`);
  return { score, reasons };
}

function top5Rating(score: number): Conditions["rating"] {
  return score >= 85 ? "최상" : score >= 72 ? "좋음" : score >= 55 ? "중간" : "나쁨";
}

function isoDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function addDays(date: string, amount: number) {
  const d = new Date(`${date}T12:00:00+09:00`);
  d.setDate(d.getDate() + amount);
  return isoDate(d);
}

function formatDay(date: string, withWeekday = true) {
  const d = new Date(`${date}T12:00:00+09:00`);
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    ...(withWeekday ? { weekday: "short" } : {}),
  }).format(d);
}

function formatShortDate(date: string) {
  const d = new Date(`${date}T12:00:00+09:00`);
  return {
    day: new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(d),
    date: new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(d),
  };
}

function naverMapSearch(query: string) {
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

function getSpecies(date: string, location: string, terrain: string, data: Conditions | null) {
  const [year, month, day] = date.split("-").map(Number);
  const md = month * 100 + day;
  const garorimArea = ["gujina", "sinduri", "hakampo", "mallipo", "mongsanpo", "kkotji", "gomsom", "mageompo", "ganwoldo", "jungri", "garorim"].includes(location);
  const isClosed = (start: number, end: number) => md >= start && md <= end;
  const rows = [
    {
      name: "낙지",
      season: "갯벌·돌밭",
      closed: garorimArea ? isClosed(401, 531) : isClosed(601, 630),
      rule: garorimArea ? "가로림만·근소만 4.1~5.31" : "기본 6.1~6.30 · 지역별 상이",
    },
    { name: "소라", season: "암반·여밭", closed: false, rule: "지역별 채취 제한·체장 확인" },
    { name: "주꾸미", season: "모래·펄", closed: isClosed(511, 831), rule: "5.11~8.31" },
    { name: "꽃게", season: "모래·갯벌", closed: isClosed(621, 820), rule: "6.21~8.20 · 일부 해역 예외" },
    { name: "참문어", season: "암반·돌밭", closed: isClosed(516, 630), rule: "기본 5.16~6.30 · 시도별 상이" },
    { name: "해삼", season: "돌밭·수심 낮은 곳", closed: false, rule: "지역 조례·마을어장 확인" },
    { name: "광어", season: "모래·얕은 수로", closed: false, rule: "금지체장·지역별 채취 규정 확인" },
    { name: "우럭", season: "암반·방파제", closed: false, rule: "금지체장·지역별 채취 규정 확인" },
    { name: "대하", season: "모래·펄·하구", closed: isClosed(501, 630), rule: "기본 금어기 5.1~6.30 · 지역별 확인" },
    { name: "새우", season: "모래·펄·수로·웅덩이", closed: false, rule: "종별 금어기·금지체장 상이 · 종류 확인 필요" },
    { name: "골뱅이", season: "돌밭·해조류", closed: false, rule: "지역별 채취 제한·마을어장 확인" },
    { name: "농어", season: "수로·하구·방파제", closed: false, rule: "금지체장·지역별 채취 규정 확인" },
    { name: "숭어", season: "갯벌 수로·항내", closed: false, rule: "지역별 채취 규정 확인" },
    { name: "맛조개", season: "넓은 모래갯벌", closed: false, rule: "체험어장·채취도구·지역 제한 확인" },
    { name: "동죽", season: "모래·펄 혼합 갯벌", closed: false, rule: "체험어장·채취량·지역 제한 확인" },
    { name: "바지락", season: "모래 섞인 갯벌", closed: false, rule: "마을어장·채취량·지역 제한 확인" },
    { name: "백합", season: "깨끗한 모래갯벌", closed: false, rule: "금지체장·마을어장·지역 제한 확인" },
  ];
  const mulLabel = getMulTtae(date);
  const mulNumber = Number.parseInt(mulLabel, 10) || 0;
  const lows = data?.tides.filter(tide => tide.type === "low") ?? [];
  const lowest = lows.length ? Math.min(...lows.map(tide => tide.height)) : null;
  const tideRange = data && data.tides.length > 1 ? Math.max(...data.tides.map(tide => tide.height)) - Math.min(...data.tides.map(tide => tide.height)) : null;
  const hasDayLow = data?.recommendedWindows?.some(window => window.period === "낮") ?? false;
  const hasNightLow = data?.recommendedWindows?.some(window => window.period === "밤") ?? false;
  const has = (...words: string[]) => words.some(word => terrain.includes(word));
  const habitat: Record<string, { match: boolean; bonus: number; good: string; bad: string }> = {
    "낙지": { match: has("갯벌", "펄", "수로"), bonus: 18, good: "갯벌·펄·수로는 낙지가 굴을 만들고 먹이활동하기 좋은 지형이에요.", bad: "낙지는 갯벌·펄·수로에서 유리해 이 지형에서는 발견 가능성이 낮아요." },
    "소라": { match: has("암반", "바위", "돌밭", "여밭", "자갈"), bonus: 20, good: "바위틈과 암반의 해조류 주변은 소라를 찾기 좋은 자리예요.", bad: "소라는 바위·암반 지형이 중요해 모래나 갯벌에서는 기대도가 낮아요." },
    "주꾸미": { match: has("모래", "갯벌", "펄"), bonus: 12, good: "모래·펄 바닥은 주꾸미가 숨거나 먹이활동하기 좋은 환경이에요.", bad: "주꾸미가 선호하는 모래·펄 바닥과 다른 지형이에요." },
    "꽃게": { match: has("모래", "갯벌", "펄"), bonus: 11, good: "모래·갯벌은 꽃게가 몸을 숨기고 이동하기 좋은 바닥이에요.", bad: "꽃게가 숨기 좋은 모래·갯벌 지형이 부족해요." },
    "참문어": { match: has("암반", "바위", "돌밭", "여밭"), bonus: 17, good: "암반 틈과 돌밭은 참문어가 은신하기 좋은 지형이에요.", bad: "참문어 은신처가 되는 바위틈·돌밭이 적은 지형이에요." },
    "해삼": { match: has("암반", "바위", "돌밭", "자갈"), bonus: 15, good: "돌밭과 얕은 암반은 해삼을 눈으로 찾기 좋은 지형이에요.", bad: "해삼을 찾기 좋은 돌밭·얕은 암반 지형이 부족해요." },
    "광어": { match: has("모래", "수로"), bonus: 16, good: "얕은 모래 바닥과 수로 가장자리는 광어가 위장하기 좋은 환경이에요.", bad: "광어를 눈으로 찾기 좋은 얕은 모래 바닥이 부족해요." },
    "우럭": { match: has("암반", "바위", "돌밭", "방파제"), bonus: 17, good: "바위틈·테트라포드 주변은 우럭이 몸을 숨기기 좋은 환경이에요.", bad: "우럭 은신처가 되는 암반·방파제 지형이 부족해요." },
    "대하": { match: has("모래", "갯벌", "펄", "수로"), bonus: 14, good: "모래·펄과 얕은 수로는 대하가 이동하고 먹이활동하기 좋은 환경이에요.", bad: "대하가 머무는 모래·펄·하구형 바닥과 다른 지형이에요." },
    "새우": { match: has("모래", "갯벌", "펄", "수로", "웅덩이"), bonus: 13, good: "모래·펄·얕은 수로와 웅덩이는 여러 연안 새우류를 살피기 좋은 환경이에요.", bad: "새우류가 머물기 좋은 모래·펄·수로형 지형이 부족해요." },
    "골뱅이": { match: has("암반", "바위", "돌밭", "자갈"), bonus: 16, good: "돌 틈과 해조류가 붙은 바닥은 골뱅이를 살피기 좋은 환경이에요.", bad: "골뱅이가 머물기 좋은 돌밭·해조류 지형이 부족해요." },
    "농어": { match: has("수로", "방파제", "갯벌", "암반"), bonus: 15, good: "수로·하구·방파제는 작은 먹잇감을 따라 농어가 접근하기 좋은 환경이에요.", bad: "농어가 접근하는 수로·하구·방파제형 지형과 달라요." },
    "숭어": { match: has("수로", "갯벌", "모래", "방파제"), bonus: 14, good: "갯벌 수로와 항내의 잔잔한 물은 숭어 무리가 오가기 좋은 환경이에요.", bad: "숭어가 오가는 갯벌 수로·항내형 환경이 부족해요." },
    "맛조개": { match: has("모래", "갯벌"), bonus: 18, good: "넓고 평평한 모래갯벌은 맛조개 구멍을 찾기 좋은 환경이에요.", bad: "맛조개가 사는 넓은 모래갯벌형 지형과 달라요." },
    "동죽": { match: has("모래", "갯벌", "펄"), bonus: 17, good: "모래와 펄이 섞인 갯벌은 동죽이 얕게 묻혀 살기 좋은 환경이에요.", bad: "동죽이 선호하는 모래·펄 혼합 갯벌과 다른 지형이에요." },
    "바지락": { match: has("모래", "갯벌", "펄"), bonus: 17, good: "모래가 섞인 갯벌은 바지락이 서식하기 좋은 바닥이에요.", bad: "바지락이 선호하는 모래 섞인 갯벌과 다른 지형이에요." },
    "백합": { match: has("모래", "갯벌"), bonus: 17, good: "깨끗한 모래갯벌과 하구권은 백합을 찾기 좋은 환경이에요.", bad: "백합이 선호하는 모래갯벌형 환경이 부족해요." },
  };
  const scoredRows = rows.map(item => {
    const timeGuide = getSpeciesTimeGuide(item.name);
    if (item.closed) return { ...item, timeGuide, score: 0, grade: "채취 금지", reasons: ["현재 금어기이므로 물때가 좋아도 채취하면 안 돼요."] };
    let score = 48;
    const reasons: string[] = [];
    if (mulNumber >= 4 && mulNumber <= 10) { score += 11; reasons.push(`${mulLabel}은 조금 뒤 조차가 커지는 구간이라 간조 때 드러나는 면적이 늘 가능성이 있어요.`); }
    else if (mulNumber >= 11 && mulNumber <= 13) { score += 5; reasons.push(`${mulLabel}은 조차가 크지만 유속도 강해질 수 있어 안전과 탁도를 함께 봐야 해요.`); }
    else if (mulLabel === "조금" || mulLabel === "무시") { score -= 6; reasons.push(`${mulLabel}은 조차가 작아 바닥이 드러나는 범위가 좁을 수 있어요.`); }
    else { score += 2; reasons.push(`${mulLabel}은 조차가 다시 커지기 시작하는 초반 구간이에요.`); }
    const fit = habitat[item.name];
    score += fit.match ? fit.bonus : -Math.round(fit.bonus * .8);
    reasons.push(fit.match ? fit.good : fit.bad);
    if (item.name in SPECIES_SEASON) {
      const profile = SPECIES_SEASON[item.name as RankSpecies];
      if (profile.peak.includes(month)) { score += 9; reasons.push(`${month}월은 ${item.name} 관찰 기대가 높은 시기예요. ${profile.text}`); }
      else if (profile.good.includes(month)) { score += 4; reasons.push(`${month}월은 ${item.name} 활동을 기대할 수 있어요. ${profile.text}`); }
      else { score -= 7; reasons.push(`${month}월은 ${item.name}의 중심 시기에서 벗어나 계절 감점을 적용했어요.`); }
    }
    if (location === "waemok" && (item.name === "광어" || item.name === "우럭")) { score += 10; reasons.push("왜목마을에서 실제 광어·우럭을 다수 관찰한 사용자 현장기록을 반영했어요."); }
    if (location === "mongsanpo" && ["꽃게", "농어", "숭어"].includes(item.name)) { score += 9; reasons.push("몽산포에서 꽃게와 농어·숭어류를 관찰한 사용자 현장기록을 반영했어요."); }
    if (tideRange !== null) {
      if (tideRange >= 350) { score += 8; reasons.push(`오늘 조차가 약 ${Math.round(tideRange)}cm로 커서 간조 노출 면적을 기대할 수 있어요.`); }
      else if (tideRange < 180) { score -= 7; reasons.push(`오늘 조차가 약 ${Math.round(tideRange)}cm로 작아 노출 면적이 제한될 수 있어요.`); }
    }
    if (lowest !== null && lowest <= 120) { score += 5; reasons.push(`가장 낮은 저조위가 약 ${Math.round(lowest)}cm라 얕은 구역을 살피기 유리해요.`); }
    const timeWindowMatches = timeGuide.preference === "day" ? hasDayLow : timeGuide.preference === "night" ? hasNightLow : hasDayLow || hasNightLow;
    if (timeWindowMatches) {
      score += timeGuide.preference === "either" ? 3 : 7;
      reasons.push(`${timeGuide.icon} ${timeGuide.label}: ${timeGuide.note}`);
    } else if (data?.recommendedWindows?.length && timeGuide.preference !== "either") {
      score -= 4;
      reasons.push(`${timeGuide.label} 시간과 간조가 겹치지 않아 시간대 감점을 적용했어요.`);
    }
    if (item.name === "낙지" && has("웅덩이")) { score += 9; reasons.push("물이 남는 웅덩이가 있어 빠진 물을 따라 움직이는 낙지를 관찰할 가능성을 가산했어요."); }
    if (data) {
      if (data.sourceStatus.weather && data.weather.rain >= 3) { score -= 10; reasons.push("비로 갯물과 펄이 섞이면 시야와 발견 확률이 떨어질 수 있어요."); }
      if (data.sourceStatus.weather && (data.weather.wind >= 7 || (data.weather.waveHeight ?? 0) >= 1)) { score -= 12; reasons.push("바람·파도가 강해 관찰이 어렵고 안전상 감점했어요."); }
      if (!data.sourceStatus.weather) reasons.push("이 날짜는 단기 날씨 발표 범위 밖이라 물때·지형 중심으로 계산했어요.");
    }
    score = Math.max(10, Math.min(95, Math.round(score)));
    const grade = score >= 80 ? "기대 높음" : score >= 65 ? "좋음" : score >= 45 ? "보통" : "기대 낮음";
    return { ...item, timeGuide, score, grade, reasons: reasons.slice(0, 4) };
  });
  const rankedRows = [...scoredRows].sort((a, b) => Number(a.closed) - Number(b.closed) || b.score - a.score || a.name.localeCompare(b.name, "ko"));
  return { rows: rankedRows, year, mulLabel };
}

function getWaterVisibility(data: Conditions | null, terrain: string) {
  if (!data) return { level: "확인 중", className: "visibility-wait", icon: "🔎", goggles: "판정 대기", wave: "확인 중", reasons: ["확인된 날씨와 물때 자료가 없어 시야를 판단할 수 없어요."] };
  if (!data.sourceStatus.weather || data.weather.waveHeight === null) return { level: "날씨·파고 미확인", className: "visibility-wait", icon: "☁️", goggles: "현장 확인 필요", wave: "발표 없음", reasons: ["공식 바람·강수·파고 예보가 없어 물속 시야를 판정하지 않았어요.", `${terrain} 지형은 현장에서 탁도와 파도를 직접 확인하세요.`] };
  const rain = data.sourceStatus.weather ? data.weather.rain : 0;
  const recent = data.sourceStatus.recentRain ? data.recentRain : null;
  const wind = data.sourceStatus.weather ? data.weather.wind : 0;
  const range = data.tides.length > 1 ? Math.max(...data.tides.map(t => t.height)) - Math.min(...data.tides.map(t => t.height)) : 0;
  let score = 0;
  const reasons: string[] = [];
  if (recent) {
    if (recent.last72h !== null && recent.last72h >= 50) { score += 5; reasons.push(`최근 3일 누적 ${recent.last72h}mm로 흙탕물 유입 영향이 매우 커요.`); }
    else if (recent.last72h !== null && recent.last72h >= 30) { score += 4; reasons.push(`최근 3일 누적 ${recent.last72h}mm로 물이 흐릴 가능성이 커요.`); }
    else if (recent.last48h !== null && recent.last48h >= 15) { score += 3; reasons.push(`최근 이틀 ${recent.last48h}mm가 내려 전날 빗물 영향이 남을 수 있어요.`); }
    else if (recent.last24h !== null && recent.last24h >= 5) { score += 2; reasons.push(`전날 ${recent.last24h}mm가 내려 얕은 곳은 흐릴 수 있어요.`); }
    else if (recent.last24h !== null && recent.last24h > 0) { score += 1; reasons.push(`전날 ${recent.last24h}mm의 비가 내려 갯벌·수로에는 약한 잔여 영향이 있을 수 있어요.`); }
    else if (recent.last72h !== null) reasons.push("최근 3일 관측 강수량이 적어 이전 비의 영향은 크지 않아요.");
    else reasons.push(`최근 3일 중 ${recent.coverageDays ?? 0}일만 확인되어 확인된 강수만 반영했어요.`);
    if (recent.consecutiveRainDays >= 2) { score += 2; reasons.push(`${recent.consecutiveRainDays}일 연속 비가 내려 부유물과 펄이 가라앉는 데 시간이 필요해요.`); }
  } else {
    reasons.push("최근 3일 관측 강수자료는 없어 당일 예보 중심으로 판정했어요.");
  }
  if (rain >= 10) { score += 4; reasons.push("강한 비가 펄과 흙탕물을 유입시켜요."); }
  else if (rain >= 3) { score += 3; reasons.push("비 때문에 물속 시야가 나빠질 수 있어요."); }
  else if (rain > 0) { score += 2; reasons.push("약한 비에도 얕은 갯벌은 쉽게 흐려져요."); }
  else reasons.push("예보 강수는 없어 빗물 영향이 적어요.");
  if (wind >= 8) { score += 3; reasons.push("강한 바람이 바닥을 뒤집어 탁도가 높아져요."); }
  else if (wind >= 5) { score += 2; reasons.push("바람으로 잔물결과 부유물이 늘 수 있어요."); }
  else if (wind >= 3.5) { score += 1; reasons.push("약간의 바람 영향이 예상돼요."); }
  else reasons.push("바람이 약해 수면은 비교적 잔잔해요.");
  if (terrain.includes("갯벌") || terrain.includes("펄")) { score += 2; reasons.push("갯벌·펄 지형은 발을 디디면 커피물처럼 흐려지기 쉬워요."); }
  else if (terrain.includes("모래")) { score += 1; reasons.push("모래가 일면 시야가 잠시 흐려질 수 있어요."); }
  else reasons.push("암반 지형은 갯벌보다 흙탕물 영향이 적어요.");
  if (range >= 450) { score += 1; reasons.push("조차가 커 물살이 바닥을 더 많이 흔들 수 있어요."); }
  const waveHeight = data.sourceStatus.weather ? (data.weather.waveHeight ?? 0) : 0;
  if (waveHeight >= 1.5) { score += 3; reasons.push("높은 파고가 바닥 부유물을 크게 늘려요."); }
  else if (waveHeight >= .8) { score += 2; reasons.push("파도가 있어 얕은 물의 시야가 흐려질 수 있어요."); }
  const wave = waveHeight >= 1.5 || wind >= 8 ? "거침" : waveHeight >= .8 || wind >= 5 ? "출렁임" : waveHeight >= .3 || wind >= 3.5 ? "잔물결" : "잔잔";
  if (score >= 7) return { level: "커피물 가능성 큼", className: "visibility-coffee", icon: "☕", goggles: "수경 효과 적음", wave, reasons };
  if (score >= 5) return { level: "많이 흐림", className: "visibility-murky", icon: "🟤", goggles: "수경 효과 제한적", wave, reasons };
  if (score >= 3) return { level: "약간 흐림", className: "visibility-cloudy", icon: "🌫️", goggles: "수경 있으면 도움", wave, reasons };
  return { level: "비교적 깨끗", className: "visibility-clear", icon: "💎", goggles: "수경 추천", wave, reasons };
}

function getRainEvidence(data: Conditions | null) {
  if (!data?.sourceStatus.weather) return [];
  const isObserved = data.weather.kind === "observation";
  const isToday = data.date === isoDate(new Date());
  const recentDay = data.recentRain?.days?.[0];
  const recentSource = !data.recentRain
    ? "조회 실패"
    : data.recentRain.source === "KMA_ASOS"
      ? "공식 관측"
      : data.recentRain.source === "OPEN_METEO_GRID"
        ? "지점 보조값"
        : "공식+지점 교차";
  const forecastTotal = data.weather.rainDayTotal;
  return [
    {
      label: isObserved ? "선택일 실제 강수" : isToday ? "오늘 출조시간 예보" : "선택일 출조시간 예보",
      value: isObserved ? `${data.weather.rain}mm` : `${data.weather.rain}mm/h · ${data.weather.rainProbability}%`,
      note: isObserved
        ? "하루 누적 관측"
        : forecastTotal === null || forecastTotal === undefined
          ? "시간대 예보"
          : `하루 총 ${forecastTotal}mm 예상`,
    },
    {
      label: isToday ? "어제 강수" : recentDay ? `${recentDay.date.slice(5).replace("-", ".")} 강수` : "직전 날짜 강수",
      value: recentDay?.amount !== null && recentDay?.amount !== undefined ? `${recentDay.amount}mm` : data.recentRain?.last24h !== null && data.recentRain?.last24h !== undefined ? `${data.recentRain.last24h}mm` : "확인 못함",
      note: recentSource,
    },
    {
      label: "최근 3일 누적",
      value: data.recentRain?.last72h !== null && data.recentRain?.last72h !== undefined ? `${data.recentRain.last72h}mm` : data.recentRain ? "일부 확인" : "확인 못함",
      note: data.recentRain?.last72h === null ? `3일 중 ${data.recentRain.coverageDays ?? 0}일 확인` : data.recentRain?.consecutiveRainDays ? `${data.recentRain.consecutiveRainDays}일 연속 비` : data.recentRain ? "연속 강우 없음" : "시야 신뢰도 낮춤",
    },
  ];
}

function getMetricExplanation(metric: DetailMetric, data: Conditions | null, terrain: string): MetricExplanation | null {
  if (!data) return null;
  const tideRange = data.tides.length > 1 ? Math.max(...data.tides.map(tide => tide.height)) - Math.min(...data.tides.map(tide => tide.height)) : null;
  const lowTide = data.tides.filter(tide => tide.type === "low").sort((a, b) => a.time.localeCompare(b.time))[0];

  if (metric === "low") {
    if (!lowTide) return { icon: "🌊", value: "간조 미제공", title: "간조 자료를 확인하지 못했어요", summary: "공식 조석 자료가 들어오면 가장 먼저 오는 간조 시각과 물높이를 설명해요.", points: [{ label: "출조", text: "현장 진입 전 공식 조석표와 통제 여부를 다시 확인하세요." }], level: "unknown" };
    const matchingWindow = data.recommendedWindows.find(window => window.lowTime === lowTide.time);
    const heightBasis = data.tideMethod === "coordinate"
      ? "가까운 항구권 공식 조석을 선택 위치에 보정한 값"
      : data.tideMethod === "direct"
        ? "공식 예보지점의 원값을 직접 적용한 값"
        : data.tideMethod === "nearby"
          ? "화면에 표시된 인근 공식 예보지점의 원값"
          : "현재 제공 가능한 공식 조석값";
    return {
      icon: "🌊",
      value: `간조 ${lowTide.time} · ${lowTide.height}cm`,
      title: "물이 가장 빠지는 시각이에요",
      summary: `${lowTide.time} 무렵에 물이 가장 낮아져 갯벌·바위가 넓게 드러날 수 있어요.`,
      points: [
        { label: "추천 시간", text: matchingWindow ? `${matchingWindow.start}~${matchingWindow.end}에 살펴보세요. 간조 뒤에는 물이 다시 차기 시작해요.` : "보통 간조 약 2시간 전부터 움직이고, 물이 차기 전에 육지 쪽으로 돌아오세요." },
        { label: "물높이", text: `${lowTide.height}cm는 ${heightBasis}이에요. 실제 물선은 지형과 바람에 따라 달라져요.` },
      ],
      level: lowTide.height <= 120 ? "calm" : "notice",
    };
  }

  if (metric === "range") {
    if (tideRange === null) return { icon: "↕️", value: "조차 미제공", title: "조차를 계산할 자료가 부족해요", summary: "고조와 저조 물높이가 모두 있어야 하루 물높이 차이를 계산할 수 있어요.", points: [{ label: "현장", text: "공식 조석표와 실제 물 빠짐 범위를 함께 확인하세요." }], level: "unknown" };
    const title = tideRange >= 450 ? "물높이 차이가 매우 커요" : tideRange >= 350 ? "바닥이 넓게 드러날 수 있어요" : tideRange < 180 ? "물 빠짐 범위가 좁을 수 있어요" : "보통 수준의 물높이 차예요";
    const summary = tideRange >= 350
      ? `${Math.round(tideRange)}cm 차이로 물이 많이 빠져 탐색 범위가 넓어질 수 있어요.`
      : `${Math.round(tideRange)}cm 차이로, 넓은 갯벌이 전부 드러나지 않을 수 있어요.`;
    return {
      icon: "↕️",
      value: `조차 ${Math.round(tideRange)}cm`,
      title,
      summary,
      points: [
        { label: "물 상태", text: tideRange >= 450 ? "물이 드나드는 힘도 커져 펄·모래가 일고 얕은 수로가 빠르게 흐를 수 있어요." : "조차만으로 흙탕물을 단정할 수는 없고, 비·바람·파도와 바닥 지형을 함께 봐야 해요." },
        { label: "안전", text: "조차가 클수록 갯골을 건넌 뒤 고립될 수 있으니 돌아오는 시간을 먼저 정하세요." },
      ],
      level: tideRange >= 450 ? "caution" : tideRange < 180 ? "notice" : "calm",
    };
  }

  if (!data.sourceStatus.weather) return { icon: "☁️", value: "날씨 자료 미제공", title: "공식 날씨 자료를 기다리고 있어요", summary: "임시 수치를 만들지 않고 물때 자료만 표시하고 있어요.", points: [{ label: "출발 전", text: "최신 기상·해상예보와 현장 통제를 확인하세요." }], level: "unknown" };

  if (metric === "rain") {
    const { rain, rainProbability = 0, kind = "forecast" } = data.weather;
    const feel = explainRain(rain, kind, rainProbability);
    const hasMud = terrain.includes("갯벌") || terrain.includes("펄");
    const hasSand = terrain.includes("모래");
    let waterText: string;
    if (kind === "observation") {
      if (rain >= 20) waterText = `${rain}mm의 하루 누적 비로 하천·갯골 유입이 늘어 당시 물이 흐리거나 흙탕물이었을 가능성이 커요.`;
      else if (rain >= 5) waterText = `${rain}mm가 하루 동안 내려 얕은 곳에는 빗물과 바닥 부유물 영향이 남았을 수 있어요.`;
      else if (rain > 0 && hasMud) waterText = `${rain}mm는 하루 누적으로 적은 양이에요. 다만 ${terrain} 바닥은 발길이나 물살에 휘저어지면 국지적으로 흙탕물이 생길 수 있어요.`;
      else if (rain > 0) waterText = `${rain}mm의 적은 비만으로 넓은 바다가 바로 흙탕물이 됐다고 보기는 어려워요.`;
      else waterText = "그날 관측된 비는 없어 당일 빗물로 인한 흙탕물 영향은 적었을 가능성이 커요.";
    } else if (rain >= 10) waterText = `${rain}mm/h의 강한 비가 펄과 흙을 갯골로 밀어 넣어 물이 크게 흐려질 수 있어요.`;
    else if (rain >= 3) waterText = `${rain}mm/h의 비로 얕은 물에 부유물이 늘고 물속 시야가 나빠질 수 있어요.`;
    else if (rain > 0 && hasMud) waterText = `${rain}mm/h라 비 자체는 약한 편이에요. 다만 ${terrain} 바닥은 발길이나 물살에 휘저어지면 국지적으로 흙탕물이 생길 수 있어요.`;
    else if (rain > 0 && hasSand) waterText = `${rain}mm/h의 약한 비만으로 큰 흙탕물이 생길 가능성은 낮지만, 얕은 곳의 모래가 일면 잠시 흐려질 수 있어요.`;
    else if (rain > 0) waterText = `${rain}mm/h의 약한 비만으로 넓은 바다가 곧 흙탕물로 바뀔 가능성은 낮아요.`;
    else waterText = "예상 강수는 없어 당일 빗물로 인한 흙탕물 영향은 적은 편이에요.";

    const recent = data.sourceStatus.recentRain ? data.recentRain : null;
    let recentText = "최근 3일 강수자료를 확인하지 못해 이 날짜의 강수 수치 중심으로 설명했어요.";
    if (recent) {
      if (recent.last72h !== null && recent.last72h >= 50) recentText = `최근 3일 누적 ${recent.last72h}mm라 지금 비가 약해도 유입수와 흙탕물 영향이 매우 클 수 있어요.`;
      else if (recent.last72h !== null && recent.last72h >= 30) recentText = `최근 3일 누적 ${recent.last72h}mm라 이전 비 때문에 물이 계속 흐릴 가능성이 커요.`;
      else if (recent.last48h !== null && recent.last48h >= 15) recentText = `최근 이틀 ${recent.last48h}mm가 내려 전날의 흙탕물 영향이 남을 수 있어요.`;
      else if (recent.last24h !== null && recent.last24h >= 5) recentText = `전날 ${recent.last24h}mm가 내려 얕은 곳은 아직 흐릴 수 있어요.`;
      else if (recent.last24h !== null && recent.last24h > 0) recentText = `전날 ${recent.last24h}mm의 비가 내려 갯벌·수로에는 약한 잔여 영향이 있을 수 있어요.`;
      else if (recent.last72h !== null) recentText = `최근 3일 누적 ${recent.last72h}mm로 이전 비의 영향은 크지 않은 편이에요.`;
      else recentText = `최근 3일 중 ${recent.coverageDays ?? 0}일만 확인되어 누적값은 만들지 않았어요.`;
      if (recent.consecutiveRainDays >= 2) recentText += ` ${recent.consecutiveRainDays}일 연속 비가 내려 펄이 가라앉는 데 시간이 더 걸릴 수 있어요.`;
    }
    return {
      icon: "🌧️",
      value: kind === "observation" ? `하루 누적 ${rain}mm` : `시간당 ${rain}mm · 확률 ${rainProbability}%`,
      title: feel.label,
      summary: feel.detail,
      points: [
        { label: "물 상태", text: waterText },
        ...(kind === "forecast" && data.weather.rainDayTotal !== null && data.weather.rainDayTotal !== undefined
          ? [{ label: "하루 예보", text: `출조시간대 최고 강수는 ${rain}mm/h이고, 선택일 하루 총 예상 강수는 ${data.weather.rainDayTotal}mm예요.` }]
          : []),
        { label: "이전 비", text: recentText },
        ...(data.recentRain?.note ? [{ label: "자료 기준", text: data.recentRain.note }] : []),
      ],
      level: feel.level,
    };
  }

  if (metric === "wave") {
    const { waveHeight, kind = "forecast" } = data.weather;
    const feel = explainWave(waveHeight, kind);
    const waterText = waveHeight === null ? "파고 자료가 없어 바닥 부유물과 시야 영향을 수치로 판단하지 않았어요."
      : waveHeight >= 1.5 ? "높은 파도가 바닥의 펄·모래를 크게 일으켜 흙탕물과 부유물이 늘 수 있어요."
      : waveHeight >= .8 ? "파도가 얕은 바닥을 흔들어 물이 흐려지고 수경으로 보는 시야도 짧아질 수 있어요."
      : waveHeight >= .5 ? "바닥 자체가 크게 흐려지지 않아도 수면이 흔들려 물속 물체가 또렷하게 보이지 않을 수 있어요."
      : "파도만 놓고 보면 바닥이 크게 뒤집힐 가능성은 낮은 편이에요.";
    return { icon: "〰️", value: waveHeight === null ? "파고 미제공" : `파고 ${waveHeight}m`, title: feel.label, summary: feel.detail, points: [{ label: "물 상태", text: waterText }, { label: "주의", text: "표시값은 해상의 대표 파고라 해변 지형·너울·바람에 따라 더 높고 세게 느껴질 수 있어요." }], level: feel.level };
  }

  if (metric === "wind") {
    const feel = explainWind(data.weather.wind);
    const waterText = data.weather.wind >= 8 ? "강한 바람이 수면과 바닥을 흔들어 부유물이 늘고 물속 시야가 크게 나빠질 수 있어요."
      : data.weather.wind >= 5 ? "잔물결이 계속 생기고 얕은 갯벌의 펄·모래가 일어 물이 흐려질 수 있어요."
      : data.weather.wind >= 3.5 ? "수면 반사가 흔들려 바닥이 실제보다 덜 또렷하게 보일 수 있어요."
      : "바람만 놓고 보면 수면과 흙탕물에 미치는 영향은 적은 편이에요.";
    return { icon: "💨", value: `풍속 ${data.weather.wind}m/s`, title: feel.label, summary: feel.detail, points: [{ label: "물 상태", text: waterText }, { label: "장비", text: data.weather.wind >= 5 ? "모자와 가벼운 채집도구를 단단히 고정하고 노출된 갯바위는 피하세요." : "해안에서는 순간 돌풍이 불 수 있으니 가벼운 장비는 고정하세요." }], level: feel.level };
  }

  const temperature = data.weather.temperature;
  const outingPeriod = weatherOutingPeriod(data);
  const isNightOuting = outingPeriod === "밤";
  const title = temperature >= 33 ? "매우 더워요" : temperature >= 28 ? "덥고 습하게 느낄 수 있어요" : temperature <= 5 ? "매우 추워요" : temperature <= 12 ? "쌀쌀해요" : "활동하기 무난한 기온이에요";
  const summary = temperature >= 30
    ? isNightOuting
      ? "해가 진 뒤에도 갯벌의 열기와 습도가 남아 더 덥게 느껴질 수 있어요."
      : outingPeriod === "낮"
        ? "갯벌은 그늘이 적어 표시 기온보다 더 덥게 느껴질 수 있어요."
        : "습도와 바람에 따라 표시 기온보다 더 덥게 느껴질 수 있어요."
    : temperature <= 12
      ? isNightOuting ? "밤 바닷바람과 젖은 옷 때문에 실제 체감은 더 낮을 수 있어요." : "바닷바람과 젖은 옷 때문에 실제 체감은 더 낮을 수 있어요."
      : isNightOuting ? "야간 해루질은 바닷바람과 습도로 체감이 달라질 수 있어요." : "장시간 야외활동에 대비해 바람과 습도도 함께 확인하세요.";
  const preparation = temperature >= 28
    ? isNightOuting
      ? "마실 물과 헤드랜턴·보조조명을 준비하고, 더운 밤에도 수분을 자주 보충하세요."
      : outingPeriod === "낮"
        ? "물과 그늘막을 준비하고 한낮 장시간 활동은 피하세요."
        : "마실 물을 준비하고 더운 시간대의 장시간 활동은 피하세요."
    : temperature <= 12
      ? isNightOuting ? "방풍 겉옷·갈아입을 옷과 헤드랜턴·보조조명을 준비하세요." : "방풍 겉옷과 젖었을 때 갈아입을 옷을 준비하세요."
      : isNightOuting
        ? "헤드랜턴·보조조명과 마실 물을 준비하세요."
        : outingPeriod === "낮"
          ? "햇빛 차단과 마실 물을 준비하세요."
          : "마실 물과 활동 시간대에 맞는 안전장비를 준비하세요.";
  return { icon: "🌡️", value: `기온 ${temperature}℃`, title, summary, points: [{ label: "물 상태", text: "기온만으로 흙탕물 여부를 판단하지는 않아요. 물색은 비·바람·파도·지형의 영향을 더 크게 받아요." }, { label: outingPeriod ? `${outingPeriod} 준비` : "준비", text: preparation }], level: temperature >= 33 || temperature <= 5 ? "danger" : temperature >= 28 || temperature <= 12 ? "caution" : "calm" };
}

function activityRating(score: number): Conditions["rating"] {
  return score >= 85 ? "최상" : score >= 70 ? "좋음" : score >= 45 ? "중간" : "나쁨";
}

function getActivityRatings(data: Conditions | null) {
  if (!data?.sourceStatus.weather || data.weather.waveHeight === null) return null;
  const { temperature, wind, rain, rainProbability = 0, humidity = 65 } = data.weather;
  const waveHeight = data.weather.waveHeight ?? 0;
  let swimScore = 100;
  const swimReasons: string[] = [];
  if (temperature < 22) { swimScore -= 30; swimReasons.push("기온이 낮아 물놀이 후 체온이 빨리 떨어질 수 있어요."); }
  else if (temperature > 34) { swimScore -= 18; swimReasons.push("한낮 폭염과 자외선에 주의해야 해요."); }
  else swimReasons.push("물놀이하기 무난한 기온이에요.");
  if (rain > 0 || rainProbability >= 60) { swimScore -= Math.min(40, 18 + rain * 3); swimReasons.push("비 예보가 있어 시야와 안전 조건이 나빠질 수 있어요."); }
  if (wind >= 8) { swimScore -= 35; swimReasons.push("강한 바람으로 물놀이를 권하지 않아요."); }
  else if (wind >= 5) { swimScore -= 18; swimReasons.push("바람이 있어 튜브와 어린이 안전에 주의하세요."); }
  if (waveHeight >= 1.5) { swimScore -= 40; swimReasons.push("파고가 높아 입수를 권하지 않아요."); }
  else if (waveHeight >= .8) { swimScore -= 22; swimReasons.push("파도가 있어 얕은 구역에서만 활동하세요."); }

  let campScore = 100;
  const campReasons: string[] = [];
  if (rain >= 10 || rainProbability >= 80) { campScore -= 45; campReasons.push("많은 비가 예상돼 침수와 진흙에 대비해야 해요."); }
  else if (rain > 0 || rainProbability >= 50) { campScore -= 25; campReasons.push("비 예보가 있어 타프와 방수 준비가 필요해요."); }
  else campReasons.push("비 가능성이 낮아 야외활동하기 좋아요.");
  if (wind >= 10) { campScore -= 45; campReasons.push("강풍에는 텐트 설치를 권하지 않아요."); }
  else if (wind >= 7) { campScore -= 28; campReasons.push("팩과 스트링을 강하게 보강해야 해요."); }
  else if (wind >= 4) { campScore -= 10; campReasons.push("해안 바람에 대비해 긴 팩을 준비하세요."); }
  else campReasons.push("바람이 약해 텐트 설치가 수월해요.");
  if (temperature >= 33 || temperature <= 5) { campScore -= 18; campReasons.push("기온 대비 냉난방 장비가 필요해요."); }
  const discomfort = 0.81 * temperature + 0.01 * humidity * (0.99 * temperature - 14.3) + 46.3;
  let comfort = "쾌적";
  if (temperature >= 30 && humidity >= 75) { campScore -= 28; comfort = "매우 후텁지근"; campReasons.push("고온다습해 잠들기 어렵고 온열질환 위험이 커요."); }
  else if (discomfort >= 80) { campScore -= 20; comfort = "후텁지근"; campReasons.push("불쾌지수가 높아 텐트 안이 덥고 답답할 수 있어요."); }
  else if (discomfort >= 75) { campScore -= 10; comfort = "약간 불쾌"; campReasons.push("습도가 높아 침구와 옷이 눅눅해질 수 있어요."); }
  else if (humidity >= 85) { campScore -= 8; comfort = "습함"; campReasons.push("결로가 생기기 쉬우니 환기와 방수포가 필요해요."); }

  return {
    swim: { score: Math.max(0, Math.round(swimScore)), reasons: swimReasons.slice(0, 3), gear: rain > 0 ? "아쿠아슈즈·우비·마른수건" : "아쿠아슈즈·구명조끼·선크림" },
    camp: { score: Math.max(0, Math.round(campScore)), reasons: campReasons.slice(-3), comfort, discomfort: Math.round(discomfort), gear: temperature >= 28 && humidity >= 70 ? "선풍기·메쉬텐트·제습용품" : rain > 0 || rainProbability >= 50 ? "타프·방수포·긴 팩" : wind >= 4 ? "긴 팩·스트링·바람막이" : "기본 캠핑장비" },
  };
}

export default function Home() {
  const today = useKstToday();
  const [initialSpot] = useState(() => {
    if (typeof window === "undefined") return SPOTS[0];
    try {
      const requestedSpot = new URLSearchParams(window.location.search).get("location");
      return SPOTS.find(item => item.id === requestedSpot || item.source === requestedSpot)
        ?? SPOTS.find(item => item.id === localStorage.getItem("kkirikiri-last-spot"))
        ?? SPOTS[0];
    }
    catch { return SPOTS[0]; }
  });
  const [region, setRegion] = useState(initialSpot.region);
  const [spotId, setSpotId] = useState(initialSpot.id);
  const [spotSearch, setSpotSearch] = useState("");
  const [date, setDate] = useState(today);
  const selectedDateRef = useRef(date);

  const [recommendations, setRecommendations] = useState<Array<{ id: string; distance: number; data: Conditions; rankScore: number }>>([]);
  const [recommendStatus, setRecommendStatus] = useState<"idle" | "loading" | "denied" | "error">("idle");
  const [rankSpecies, setRankSpecies] = useState<RankSpecies>("낙지");
  const [speciesRankings, setSpeciesRankings] = useState<Array<{ id: string; data: Conditions; score: number; reasons: string[] }>>([]);
  const [speciesRankStatus, setSpeciesRankStatus] = useState<"idle" | "loading" | "error">("idle");
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const [tab, setTab] = useState<"overview" | "species" | "camping" | "map">("overview");
  const [showDataGuide, setShowDataGuide] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [detailMetric, setDetailMetric] = useState<DetailMetric | null>(null);
  const [loadComparison] = useState(() => createComparisonCache<Conditions>());
  const recommendController = useRef<AbortController | null>(null);
  const speciesController = useRef<AbortController | null>(null);
  const lastRecommendCoords = useRef<{ latitude: number; longitude: number } | null>(null);
  const recommendRequest = useRef(0);
  const speciesRankRequest = useRef(0);
  const speciesRankLoaded = useRef(false);
  const dateCarouselRef = useRef<HTMLDivElement>(null);
  const dataGuideTriggerRef = useRef<HTMLButtonElement>(null);
  const dataGuideCloseRef = useRef<HTMLButtonElement>(null);
  const dataGuideSheetRef = useRef<HTMLElement>(null);
  const dataGuideWasOpen = useRef(false);
  const spot = SPOTS.find((item) => item.id === spotId) ?? SPOTS[0];
  const { data, loading, savedTide, error: conditionsError } = useConditions<Conditions>(spot.source, date);
  const hasOverallScore = !loading && Boolean(data?.sourceStatus.tide && data.sourceStatus.weather) && Number.isFinite(data?.score);
  const startupTide = data?.sourceStatus.tide ? data : savedTide;
  const showingSavedTide = Boolean(startupTide && !data?.sourceStatus.tide);
  const fallbackTidePoint = tidePointFor(spot.source)?.reference ?? "배수갑문 정보 별도 확인";
  const displayedTideBasis = startupTide?.referencePort ?? fallbackTidePoint;
  const visibleSpots = useMemo(() => SPOTS.filter((item) => item.region === region), [region]);
  const searchedSpots = spotSearch.trim()
    ? SPOTS.filter(item => item.name.replace(/\s/g, "").includes(spotSearch.replace(/\s/g, "")))
    : visibleSpots;

  useEffect(() => {
    try {
      window.localStorage.setItem("kkirikiri-last-spot", spot.id);
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("location", spot.source);
      window.history.replaceState(null, "", currentUrl);
    } catch { /* 저장소·주소 변경 차단 시 생략 */ }
  }, [spot.id, spot.source]);

  useEffect(() => {
    if (showDataGuide) {
      dataGuideWasOpen.current = true;
      dataGuideCloseRef.current?.focus();
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const keepFocusInDialog = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          setShowDataGuide(false);
          return;
        }
        if (event.key !== "Tab" || !dataGuideSheetRef.current) return;
        const focusable = [...dataGuideSheetRef.current.querySelectorAll<HTMLElement>("button,[href],input,select,textarea,[tabindex]:not([tabindex='-1'])")]
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
    }
    if (dataGuideWasOpen.current) {
      dataGuideWasOpen.current = false;
      dataGuideTriggerRef.current?.focus({ preventScroll: true });
    }
  }, [showDataGuide]);

  useEffect(() => {
    dateCarouselRef.current?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [date]);

  const dateItems = useMemo(() => Array.from({ length: 22 }, (_, index) => {
    const offset = index - 7; const itemDate = addDays(today, offset);
    return { offset, itemDate, label: formatShortDate(itemDate), mul: getMulTtae(itemDate) };
  }), [today]);
  const species = useMemo(() => getSpecies(date, spot.source, spot.terrain, data), [date, spot.source, spot.terrain, data]);
  const nearbyCamps = useMemo(() => CAMPS.filter((camp) => camp.zone === spot.campZone), [spot.campZone]);
  const visibility = useMemo(() => getWaterVisibility(loading ? null : data, spot.terrain), [data, loading, spot.terrain]);
  const rainEvidence = useMemo(() => getRainEvidence(loading ? null : data), [data, loading]);
  const activities = useMemo(() => getActivityRatings(loading ? null : data), [data, loading]);
  const metricExplanation = useMemo(() => detailMetric ? getMetricExplanation(detailMetric, data, spot.terrain) : null, [detailMetric, data, spot.terrain]);
  function changeSpot(nextSpotId: string) {
    setDetailMetric(null);
    setSpotId(nextSpotId);
  }
  function changeDate(nextDate: string) {
    if (nextDate === date) return;
    selectedDateRef.current = nextDate;
    recommendRequest.current++; speciesRankRequest.current++;
    recommendController.current?.abort(); speciesController.current?.abort();
    setRecommendations([]); setSpeciesRankings([]);
    setDetailMetric(null);
    setDate(nextDate);
  }
  function changeRegion(nextRegion: string) {
    setDetailMetric(null);
    setRegion(nextRegion);
    setSpotSearch("");
    const firstSpot = SPOTS.find((item) => item.region === nextRegion);
    if (firstSpot) changeSpot(firstSpot.id);
  }

  async function loadNearbyBest(coords: { latitude: number; longitude: number }, targetDate: string) {
    const requestId = ++recommendRequest.current;
    recommendController.current?.abort();
    const controller = new AbortController(); recommendController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55_000);
    setRecommendations([]);
    setRecommendStatus("loading");
    try {
      const nearest = RECOMMEND_CANDIDATES.map(([id, lat, lon]) => ({ id, distance: distanceKm(coords.latitude, coords.longitude, lat, lon) })).sort((a, b) => a.distance - b.distance).slice(0, 12);
      const rows = await mapConcurrent(nearest, 4, controller.signal, async item => {
        const target = SPOTS.find(spotItem => spotItem.id === item.id)!;
        const result = await loadComparison(target.source, targetDate, controller.signal);
        return { ...item, data: result, rankScore: top5Score(result, item.distance, target.terrain) };
      });
      if (requestId !== recommendRequest.current) return;
      setRecommendations(rows.sort((a, b) => b.rankScore - a.rankScore).slice(0, 5));
      setRecommendStatus("idle");
    } catch {
      controller.abort();
      if (requestId === recommendRequest.current) setRecommendStatus("error");
    } finally { clearTimeout(timeout); }
  }

  function findNearbyBest() {
    if (lastRecommendCoords.current) {
      loadNearbyBest(lastRecommendCoords.current, selectedDateRef.current);
      return;
    }
    if (!navigator.geolocation) { setRecommendStatus("error"); return; }
    setRecommendStatus("loading");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      lastRecommendCoords.current = { latitude: coords.latitude, longitude: coords.longitude };
      loadNearbyBest(lastRecommendCoords.current, selectedDateRef.current);
    }, () => setRecommendStatus("denied"), { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }

  async function loadSpeciesRankings(nextSpecies: RankSpecies, targetDate: string) {
    const requestId = ++speciesRankRequest.current;
    speciesController.current?.abort();
    const controller = new AbortController(); speciesController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55_000);
    setSpeciesRankings([]);
    speciesRankLoaded.current = true;
    setSpeciesRankStatus("loading");
    try {
      const rows = await mapConcurrent(SPECIES_RANK_CANDIDATES[nextSpecies], 4, controller.signal, async id => {
        const target = SPOTS.find(item => item.id === id)!;
        const result = await loadComparison(target.source, targetDate, controller.signal);
        const ranked = speciesRankScore(nextSpecies, target, result);
        return { id, data: result, ...ranked };
      });
      if (requestId !== speciesRankRequest.current) return;
      setSpeciesRankings(rows.sort((a, b) => b.score - a.score).slice(0, 5));
      setSpeciesRankStatus("idle");
    } catch {
      controller.abort();
      if (requestId === speciesRankRequest.current) setSpeciesRankStatus("error");
    } finally { clearTimeout(timeout); }
  }

  function chooseRankSpecies(nextSpecies: RankSpecies) {
    setRankSpecies(nextSpecies);
    if (speciesRankLoaded.current) loadSpeciesRankings(nextSpecies, date);
  }

  useEffect(() => {
    if (lastRecommendCoords.current) loadNearbyBest(lastRecommendCoords.current, date);
  // 날짜를 넘길 때 이미 허용된 위치로 해당 날짜 순위를 다시 계산해요.
  }, [date]);

  useEffect(() => {
    if (speciesRankLoaded.current) loadSpeciesRankings(rankSpecies, date);
  // 선택한 날짜가 바뀌면 같은 생물의 전국 순위를 다시 계산해요.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => () => {
    recommendRequest.current++; speciesRankRequest.current++;
    recommendController.current?.abort(); speciesController.current?.abort();
  }, []);

  function openRecommendation(id: string) {
    const target = SPOTS.find(item => item.id === id);
    if (!target) return;
    setRegion(target.region); changeSpot(target.id); setSpotSearch(""); setTab("overview");
  }

  async function shareWithFriend() {
    const shareData = {
      title: `끼리끼리 | ${spot.name}`,
      text: `${spot.name} ${date} 물때·날씨와 해루질 정보를 확인해보세요.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      setShareNotice("공유할 주소를 복사했어요");
      window.setTimeout(() => setShareNotice(""), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareNotice("주소를 복사하지 못했어요");
      window.setTimeout(() => setShareNotice(""), 2200);
    }
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        {/* 정적 아이콘은 이미지 최적화 경로를 거치지 않아 배포 환경에서도 즉시 표시돼요. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-mark" src="/kkirikiri-icon-safe-v2-192.png" width="52" height="52" alt="끼리끼리 앱 아이콘" />
        <div className="brand-copy">
          <strong>끼리끼리</strong>
          <span>공공데이터로 보는 해루질 길잡이</span>
        </div>
        <div className="header-actions">
          <PwaInstallButton />
          <button ref={dataGuideTriggerRef} className="info-button" type="button" aria-label="물때 데이터와 안전 기준 안내" onClick={() => setShowDataGuide(true)}><span aria-hidden="true">ⓘ</span><b>자료</b></button>
          <Link className="calendar-button" aria-label="1년 물때 달력 페이지 열기" href={`/calendar?location=${encodeURIComponent(spot.source)}&name=${encodeURIComponent(spot.name)}`}>📅</Link>
          <button className="share-button" aria-label="친구에게 정보 공유하기" onClick={shareWithFriend}>
            <span aria-hidden="true">↗</span><b>공유</b>
          </button>
        </div>
      </header>
      {shareNotice && <div className="share-toast" role="status">{shareNotice}</div>}
      <section className="hero-card">
        <div className="hero-content">
          <p className="eyebrow">{formatDay(date)} · 예측 물높이</p>
          <h1 className="tide-first-title">{spot.name}</h1>
          <div className="startup-tides" aria-label="선택 날짜 물때와 물높이" aria-live="polite">
            {startupTide ? startupTide.tides.map(tide => <article key={tide.time} className={tide.type === "low" ? "low-tide" : "high-tide"}><span>{tide.type === "low" ? "간조" : "만조"}</span><b>{tide.time}</b><strong>{tide.height}<small>cm</small></strong></article>) : <p className="startup-tide-wait">{loading ? "공식 물높이를 불러오는 중이에요…" : "공식 물높이를 확인하지 못했어요."}</p>}
          </div>
          <div className="hero-overall-score" aria-label="해루질 종합점수" aria-live="polite">
            <div className="hero-score-label"><b>해루질 종합점수</b><small>100점 만점 · 참고용 · 안전 보장 아님</small></div>
            <div className="hero-score-value">{hasOverallScore && data ? <><strong>{data.score}<small>점</small></strong><span>{data.rating}</span></> : <span>{loading ? "확인 중" : "자료 부족"}</span>}</div>
          </div>
          <p className="startup-tide-status">{showingSavedTide ? (loading ? "저장된 물때 · 최신 자료 확인 중" : "저장된 물때 · 최신 확인 실패") : data?.tidePreview ? "인근 기준항 먼저 표시 · 선택지점 자료 확인 중" : startupTide ? "확인된 조석예보" : "처음 조회한 자료는 다음 실행부터 바로 표시합니다."}{startupTide?.tideRetrievedAt && <> · 조회 {new Date(startupTide.tideRetrievedAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })}</>}</p>
          <div className="source-line"><span>⚓ 기준 {displayedTideBasis}</span><span>{startupTide?.tideMethod === "nearby" ? "인근 기준점 참고 · 현지와 차이 있음" : "예측값 · 실시간 현장 수위 아님"}</span></div>

        </div>
      </section>

      <details className="controls-card location-controls">
        <summary aria-label="현재 장소와 장소 변경 메뉴">
          <span className="location-pin" aria-hidden="true">📍</span>
          <span className="location-summary-copy"><small>{REGIONS.find(item => item.id === region)?.name} · {spot.terrain}</small><strong>{spot.name}</strong><b>⚓ 물때 기준 {displayedTideBasis}</b></span>
          <span className="location-change">장소 변경</span>
        </summary>
        <div className="location-controls-body" aria-label="지역과 해루질 포인트 선택">
          <label className="spot-search-control">
            <span>전국 장소 검색</span>
            <input type="search" value={spotSearch} placeholder="예: 당암포구, 석문방조제" onChange={(e) => setSpotSearch(e.target.value)} />
          </label>
          <div className="recent-spots-control" aria-label="이번에 추가된 장소 바로 선택">
            <span>이번에 추가된 장소</span>
            <div className="recent-spot-list">
              {NEWLY_ADDED_SPOT_IDS.map((id) => {
                const item = SPOTS.find((candidate) => candidate.id === id)!;
                return <button key={id} type="button" className={spot.id === id ? "active" : ""} aria-pressed={spot.id === id} onClick={() => openRecommendation(id)}>{item.name}</button>;
              })}
            </div>
          </div>
          <label className="region-control">
            <span>지역권</span>
            <select value={region} onChange={(e) => changeRegion(e.target.value)}>
              {REGIONS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="spot-control">
            <span>세부 해루질 포인트</span>
            <select value={spotId} onChange={(e) => changeSpot(e.target.value)}>
              {!searchedSpots.some(item => item.id === spotId) && <option value={spotId}>{spot.name} · 가까운 항구 {spot.sourceLabel}</option>}
              {searchedSpots.map((item) => <option key={item.id} value={item.id}>{item.name} · 가까운 항구 {item.sourceLabel}</option>)}
            </select>
            <small>{spotSearch ? `검색결과 ${searchedSpots.length}곳` : `${REGIONS.find(item => item.id === region)?.name} ${visibleSpots.length}곳`}</small>
          </label>
          <div className="source-badge">
            <span>⚓</span>
            <div className="source-badge-copy">
              <b>가까운 항구 · {spot.sourceLabel} / 물때 기준 · {displayedTideBasis}</b>
              <small>{data?.tideSource ? `자료 기준 ${data.tideSource.stationName} (${data.tideSource.stationCode}) · ${data.tideSource.correctionMethod} · ${data.tideSource.provider}` : `${spot.sourceLabel} 적용 기준 확인 중`}</small>
            </div>
          </div>
        </div>
      </details>
        <div className="date-carousel-wrap sticky-date-bar">
          <div className="date-carousel-label"><span>날짜·물때 선택</span><small>지난 7일 · 앞으로 14일</small></div>
          <div className="date-carousel" ref={dateCarouselRef} role="list" aria-label="과거와 미래 날짜를 좌우로 넘겨 선택">
            {dateItems.map(({ offset, itemDate, label, mul }) => {
              return <button role="listitem" data-date={itemDate} key={itemDate} className={date === itemDate ? "selected" : offset < 0 ? "past" : ""} onClick={() => changeDate(itemDate)}><small>{offset === 0 ? "오늘" : offset < 0 ? `${Math.abs(offset)}일 전` : label.day}</small><strong>{label.date}</strong><b>{mul}</b></button>;
            })}
          </div>
        </div>

      <nav className="tabs" aria-label="정보 구분" role="tablist">
        <button role="tab" aria-selected={tab === "overview"} className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>출조</button>
        <button role="tab" aria-selected={tab === "species"} className={tab === "species" ? "active" : ""} onClick={() => setTab("species")}>대상어종</button>
        <button role="tab" aria-selected={tab === "camping"} className={tab === "camping" ? "active" : ""} onClick={() => setTab("camping")}>캠핑</button>
        <button role="tab" aria-selected={tab === "map"} className={tab === "map" ? "active" : ""} onClick={() => setTab("map")}>지도·편의</button>
      </nav>

      {tab === "overview" && <>
        <div className="content-stack overview-flow">
          <section className="section-card forecast-card overview-step">
            <div className="overview-step-head"><span>1</span><div><small>먼저 확인</small><h2>선택 날짜 자세히</h2></div><b>{formatDay(date)}</b></div>
            {data?.tidePreview && <p className="accuracy-note">인근 기준항 물때 먼저 표시 · 선택지점 좌표형 자료 확인 중입니다. 확인 결과에 따라 물때와 날씨 시간대가 갱신될 수 있어요.</p>}
            {data?.tideRetrievedAt && <p className="accuracy-note">물때 원자료 조회 {new Date(data.tideRetrievedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (한국시간)</p>}
            {data?.sourceStatus.weather ? <div className={`weather-mode-label ${data.weather.kind === "observation" ? "observed" : "forecast"}`}><b>{data.weather.kind === "observation" ? "과거 실제 관측으로 재계산" : data.weatherPreview ? "선택 날짜 예보 · 물때 확인 중" : data.weather.basis === "DAY" ? "선택 날짜 제공 예보" : "확인된 시간대 예보"}</b><span>{data.weather.kind === "observation" ? "당시 예보 아님 · 실제 관측 재계산" : `예보 시각 ${(data.weather.forecastTimes ?? []).join(" · ") || "범위 확인 필요"} (한국시간)`}</span></div> : <div className="weather-unavailable-card"><span>☁️</span><div><b>{loading ? "공식 날씨 조회 중" : "공식 날씨 미확인"}</b><p>{conditionsError || data?.sourceErrors?.weather || "선택 날짜·시간의 날씨가 미제공되었거나 조회 중입니다."}</p></div></div>}
            {data && <div className="accuracy-note" role="note">
              <b>물때 기준: {data.tideSource?.stationName ?? data.referencePort}</b>
              <p>{data.tideMethod === "nearby" ? "선택 해변의 현지 물높이가 아닌 인근 기준점 예보입니다. 간조 시각·높이는 현장과 다를 수 있어요." : data.tideSource?.correctionMethod}</p>
              {spot.source === "gujina" && <a href="https://www.weather.go.kr/special/CRP/beach/rpt_beach_77.html" target="_blank" rel="noreferrer">기상청 꾸지나무골 물때·날씨와 비교 ↗</a>}
              <p>자료 조회 {new Date(data.updatedAt).toLocaleString("ko-KR", {timeZone: "Asia/Seoul", hour12: false})} (한국시간)</p>
              {data.sourceStatus.weather && data.weather.kind !== "observation" && <p>기온·습도 {data.weather.representativeTime ?? "시각 미확인"} 기준 · 바람·강수·파고는 표시 시간 중 최대. {data.weather.issuedAt ? `기상청 발표 ${data.weather.issuedAt}` : ""}</p>}
              {data.weather.rainUsesCategoryBounds && <p>강수 구간값은 상한으로 표시합니다. 예: 1mm 미만 → 상한 1mm.</p>}
              {data.weather.waveHeight === null && <p>파고 미확인 · 잔잔하다는 의미가 아닙니다.</p>}
            </div>}
            <div className="selected-day-detail" aria-live="polite">
              <div className="selected-day-title">
                <span>참고지수 · 안전 보장 아님</span>
                <strong>{(!loading && data?.sourceStatus.tide && data.sourceStatus.weather ? data.rating : "자료 부족")} {!loading && data?.sourceStatus.tide && data.sourceStatus.weather ? `${data.score}점` : ""}</strong>
              </div>
              <p>{loading ? "도착한 자료부터 표시합니다. 참고지수는 전체 자료 확인 후 표시해요." : conditionsError || data?.summary || "상세 자료를 불러오는 중이에요."}</p>
              <p className="metric-tap-hint">👇 궁금한 숫자를 누르면 실제 체감과 물 상태를 설명해요.</p>
              <div className="selected-day-metrics">
                <button type="button" disabled={!data} className={detailMetric === "low" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "low" ? null : "low")} aria-expanded={detailMetric === "low"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>간조 <b>{data?.tides.filter(t => t.type === "low").sort((a, b) => a.time.localeCompare(b.time))[0]?.time ?? "-"}</b></button>
                <button type="button" disabled={!data} className={detailMetric === "range" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "range" ? null : "range")} aria-expanded={detailMetric === "range"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>조차 <b>{data && data.tides.length > 1 ? `${Math.max(...data.tides.map(t => t.height)) - Math.min(...data.tides.map(t => t.height))}cm` : "-"}</b></button>
                {data?.sourceStatus.weather ? <>
                  <button type="button" className={detailMetric === "wind" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "wind" ? null : "wind")} aria-expanded={detailMetric === "wind"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>💨 풍속 <b>{data.weather.wind}m/s</b></button>
                  <button type="button" className={detailMetric === "wave" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "wave" ? null : "wave")} aria-expanded={detailMetric === "wave"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>〰️ 파고 <b>{data.weather.waveHeight !== null ? `${data.weather.waveHeight}m` : data.weather.kind === "observation" ? "과거자료 미제공" : "미발표"}</b></button>
                  <button type="button" className={detailMetric === "rain" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "rain" ? null : "rain")} aria-expanded={detailMetric === "rain"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>🌧 {data.weather.kind === "observation" ? "하루 강수" : "시간당 강수"} <b>{data.weather.rain}mm{data.weather.kind === "observation" ? "" : ` · ${data.weather.rainProbability ?? 0}%`}</b></button>
                  <button type="button" className={detailMetric === "temperature" ? "selected" : ""} onClick={() => setDetailMetric(current => current === "temperature" ? null : "temperature")} aria-expanded={detailMetric === "temperature"} aria-controls={metricExplanation ? "selected-metric-explanation" : undefined}>🌡 기온 <b>{data.weather.temperature}℃</b></button>
                </> : <span className="detail-wide">날씨 <b>공식 자료가 없어 표시하지 않음</b></span>}
              </div>
              {metricExplanation && <div id="selected-metric-explanation" className={`metric-explanation feel-${metricExplanation.level}`} role="region" aria-live="polite" aria-label={`${metricExplanation.title} 상세 설명`}>
                <div className="metric-explanation-head"><span aria-hidden="true">{metricExplanation.icon}</span><div><small>{metricExplanation.value}</small><h3>{metricExplanation.title}</h3></div><button type="button" onClick={() => setDetailMetric(null)} aria-label="상세 설명 닫기">×</button></div>
                <p>{metricExplanation.summary}</p>
                <ul>{metricExplanation.points.map(point => <li key={`${point.label}-${point.text}`}><b>{point.label}</b><span>{point.text}</span></li>)}</ul>
              </div>}
            </div>
            {data?.riskFlags && data.riskFlags.length > 0 && <div className="risk-flags early-risks">{data.riskFlags.map(flag => <span key={flag}>⚠ {flag}</span>)}</div>}

            <div className="date-detail-block">
              <div className="compact-section-title"><b>⏱ 간조 전후 참고 시간</b><small>간조 2시간 전부터 30분 후까지</small></div>
              <div className="outing-windows">
                {(data?.recommendedWindows ?? []).map((window) => <article key={`${window.lowTime}-${window.period}`}><span>{window.period === "낮" ? "☀️ 낮 해루질" : "🌙 밤 해루질"}</span><strong>{window.startDayOffset === -1 ? "전날 " : ""}{window.start} – {window.endDayOffset === 1 ? "다음날 " : ""}{window.end}</strong><small>간조 {window.lowTime} · {window.lowHeight}cm</small>{data?.weather.kind === "forecast" && !data.weather.focusTimes?.includes(window.lowTime) && <small>이 간조 시간대 날씨 미확인</small>}</article>)}
                {!data?.recommendedWindows?.length && <article><span>{loading ? "확인 중" : "미확인"}</span><strong>{loading ? "물때를 불러오고 있어요" : "확인된 간조 자료가 없어요"}</strong></article>}
              </div>
              <p className="accuracy-note">이 시간은 간조로 계산한 참고 구간입니다. 간조 후에도 안전하다는 뜻이 아니며, 퇴수 시각은 현장 수로·통제 안내를 따르세요.</p>
              <div className="tide-track" aria-label="고조와 저조 시간">{(data?.tides ?? []).map((tide, index) => <div className={`tide-point ${tide.type}`} key={`${tide.time}-${index}`}><span>{tide.type === "low" ? "저" : "고"}</span><b>{tide.time}</b><small>{tide.height}cm</small></div>)}</div>
            </div>

          </section>

          <section className={`section-card visibility-card ${visibility.className} overview-step`}>
            <div className="overview-step-head no-side"><span>2</span><div><small>현장 체감 예상</small><h2>예상 물속 시야</h2></div></div>
            <div className="visibility-head visibility-result"><span>{visibility.icon}</span><div><small>이 날짜 예상</small><h3>{visibility.level}</h3></div><b>{visibility.goggles}</b></div>
            <div className="visibility-facts"><span>수면 상태 <strong>{visibility.wave}</strong></span><span>바닥 <strong>{spot.terrain}</strong></span></div>
            {rainEvidence.length > 0 && <div className="rain-evidence" aria-label="강수 관측과 예보 근거">
              {rainEvidence.map(item => <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong><span>{item.note}</span></div>)}
            </div>}
            <p className="visibility-summary">{visibility.reasons[0]}</p>
            <details className="progressive-details visibility-details"><summary><span>시야 이유와 계산 기준 보기</span><small>자세히</small></summary><ul>{visibility.reasons.slice(1).map(reason => <li key={reason}>{reason}</li>)}</ul><p className="estimate-note">이전 1·2·3일 일강수 합계와 연속 강우, 당일 비·바람·파고·조차·바닥 지형을 합산한 예상이에요. 하천·방류구 유입에 따라 현장은 달라질 수 있어요.</p></details>
          </section>

          <section className="section-card decision-card overview-step">
            <div className="overview-step-head"><span>3</span><div><small>마지막으로 확인</small><h2>자료 확보 상태</h2></div><b>공식 자료 {data?.confidence?.officialSources ?? 0}/3</b></div>
            <div className="decision-title"><div><small>자료 완성도</small><h3>{data?.confidence?.level ?? "확인 중"}</h3></div><b className={data?.confidence ? `confidence-${data.confidence.level}` : "confidence-loading"}>{!data?.confidence ? "확인 중" : data.confidence.level === "높음" ? "자료 확보됨" : data.confidence.level === "보통" ? "기준점·범위 확인" : "현장 확인 필요"}</b></div>
            <details className="progressive-details confidence-details"><summary><span>자료 출처와 계산 기준 보기</span><small>{data?.confidence?.reasons?.length ?? 0}개 확인 근거</small></summary><div className="score-breakdown"><span>물때 <b>{data?.scoreBreakdown?.tide ?? 0}/60</b></span><span>출조시간 날씨 <b>{data?.scoreBreakdown?.weather ?? 0}/25</b></span><span>최근 강수·시야 <b>{data?.scoreBreakdown?.visibility ?? 0}/15</b></span></div><ul>{(data?.confidence?.reasons ?? ["공식 자료를 불러오는 중이에요."]).map(reason => <li key={reason}>{reason}</li>)}</ul></details>
          </section>
        </div>
        <section className="recommend-card">
          <div className="recommend-heading"><div><span>📍</span><div><strong>다른 장소도 비교해 볼까요?</strong><small>내 주변 {formatDay(date)} TOP 5 · 물때·날씨·거리 종합</small></div></div><button onClick={findNearbyBest} disabled={recommendStatus === "loading"}>{recommendStatus === "loading" ? "계산 중…" : recommendations.length ? "이 날짜 다시 계산" : "내 위치로 찾기"}</button></div>
          {recommendStatus === "denied" && <p className="recommend-message">위치 권한이 꺼져 있어요. 브라우저 설정에서 이 사이트의 위치 권한을 허용해 주세요.</p>}
          {recommendStatus === "error" && <p className="recommend-message">현재 위치를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
          {recommendations.length > 0 && <div className="recommend-list">{recommendations.map((item, index) => {
            const target = SPOTS.find(spotItem => spotItem.id === item.id)!;
            const low = item.data.tides.filter(tide => tide.type === "low").sort((a,b) => a.height - b.height)[0];
            const topRating = top5Rating(item.rankScore);
            return <button key={item.id} onClick={() => openRecommendation(item.id)}><b>{index + 1}</b><div><strong>{target.name}</strong><small>{item.distance.toFixed(1)}km · 간조 {low?.time ?? "-"} · {low?.height ?? "-"}cm</small></div><span className={ratingClass[topRating]}>{topRating}<small>{item.rankScore.toFixed(1)}점</small></span></button>;
          })}</div>}
        </section>
      </>}

      {tab === "species" && (
        <div className="content-stack">
          <section className="section-card local-species-card">
            <div className="section-title-row"><h2>{spot.name} 추천 생물 순위</h2><span>{formatDay(date)} · 점수순</span></div>
            <div className="species-time-legend" aria-label="대상어종 추천 시간 범례">
              <span className="time-badge time-day">☀️ 낮 채취</span>
              <span className="time-badge time-night">🌙 야간 활동</span>
              <span className="time-badge time-either">☀️🌙 물때 우선</span>
              <small>시간 아이콘은 채취 편의·생물 활동성 기준이에요. 🌙은 야간 출입을 권한다는 뜻이 아니며, 밤 갯벌 진입은 피하세요.</small>
            </div>
            <div className="species-list">
              {species.rows.slice(0, showAllSpecies ? species.rows.length : 5).map((item, index) => {
                const timeClass = item.timeGuide.preference === "day" ? "time-day" : item.timeGuide.preference === "night" ? "time-night" : "time-either";
                const scoreClass = item.closed ? "closed-score" : item.score >= 80 ? "high" : item.score >= 65 ? "good" : item.score >= 45 ? "mid" : "low";
                return <details key={item.name} className={`species-item ${item.closed ? "closed" : "open"}`}>
                  <summary>
                    <span className="species-leading"><b className={item.closed ? "closed-position" : ""}>{item.closed ? "제외" : `${index + 1}위`}</b><span className="species-icon"><SpeciesIcon name={item.name} /></span></span>
                    <span className="species-name-copy"><strong>{item.name}</strong><small>{item.season}</small><span className={`time-badge ${timeClass}`} aria-label={`${item.name} ${item.timeGuide.label}`}>{item.timeGuide.icon} {item.timeGuide.label}</span></span>
                    <span className={`species-mini-score ${scoreClass}`}><b>{item.closed ? "금지" : `${item.score}점`}</b><small>{item.grade}</small></span>
                  </summary>
                  <div className="species-item-detail">
                    <p><b>{item.closed ? "금어기 · 순위 제외" : "채취 전 확인"}</b><span>{item.rule}</span></p>
                    <p className="time-guide-note"><b>{item.timeGuide.icon} 시간대 안내</b><span>{item.timeGuide.note}</span></p>
                    <ul>{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                  </div>
                </details>;
              })}
            </div>
            {species.rows.length > 5 && <button className="show-all-species" type="button" onClick={() => setShowAllSpecies(value => !value)} aria-expanded={showAllSpecies}>{showAllSpecies ? "상위 5종만 보기" : `전체 대상어종 ${species.rows.length}종 보기`}</button>}
          </section>
          <details className="species-guide"><summary>점수 계산 방식 보기</summary><p>{species.mulLabel} 물때 15% · 실제 조차와 저조위 25% · 생물별 지형 35% · 비·바람·파고와 추천 시간 25%를 반영한 현장 기대도예요. 어획을 보장하는 수치가 아니며 금어기·마을어장 제한이 가장 먼저 적용됩니다.</p></details>
          <div className="warning-box"><b>⚠ 마을어장에서는 채취하면 안 될 수 있어요.</b><p>금어기가 아니어도 어촌계 관리구역, 체험어장 운영시간, 금지체장과 도구 제한을 현장에서 꼭 확인하세요.</p></div>
          <section className="section-card species-rank-card">
            <div className="section-title-row"><h2>{formatDay(date)} 생물별 대상지 TOP 5</h2><span>전국 후보 비교</span></div>
            <p className="species-rank-intro">노릴 생물을 고른 다음, 그 생물의 조건이 좋은 장소를 비교해 보세요.</p>
            <label className="rank-species-select"><span>대상어종 선택</span><span className="rank-species-input"><span className="rank-selected-icon"><SpeciesIcon name={rankSpecies} /></span><select value={rankSpecies} onChange={(event) => chooseRankSpecies(event.target.value as RankSpecies)}>{RANK_SPECIES.map(item => <option key={item} value={item}>{item}</option>)}</select></span></label>
            <p className={`rank-time-guide ${getSpeciesTimeGuide(rankSpecies).preference === "day" ? "time-day" : getSpeciesTimeGuide(rankSpecies).preference === "night" ? "time-night" : "time-either"}`}><b>{getSpeciesTimeGuide(rankSpecies).icon} {getSpeciesTimeGuide(rankSpecies).label}</b>{getSpeciesTimeGuide(rankSpecies).note}</p>
            <p className="season-guide"><b>{rankSpecies} 계절 정보</b>{SPECIES_SEASON[rankSpecies].text}</p>
            <button className="rank-load-button" onClick={() => loadSpeciesRankings(rankSpecies, date)} disabled={speciesRankStatus === "loading"}>{speciesRankStatus === "loading" ? `${rankSpecies} 순위 계산 중…` : `${rankSpecies} 좋은 지역 TOP 5 보기`}</button>
            {speciesRankStatus === "error" && <p className="rank-error">자료를 일부 불러오지 못했어요. 잠시 후 다시 눌러 주세요.</p>}
            {speciesRankings.length > 0 && <div className="species-rank-list">
              {speciesRankings.map((item, index) => {
                const target = SPOTS.find(spotItem => spotItem.id === item.id)!;
                const low = item.data.tides.filter(tide => tide.type === "low").sort((a, b) => a.height - b.height)[0];
                return <button key={item.id} onClick={() => openRecommendation(item.id)}>
                  <b>{index + 1}</b>
                  <div><strong>{target.name}</strong><small>{target.terrain} · 간조 {low?.time ?? "-"} {low?.height ?? "-"}cm</small><ul>{item.reasons.slice(0, 3).map(reason => <li key={reason}>{reason}</li>)}</ul></div>
                  <span>{item.score.toFixed(1)}<small>점</small></span>
                </button>;
              })}
            </div>}
            <p className="rank-method"><b>근거등급</b> A 직접관찰·확인자료 / B 체험어장·양식권 등 간접자료 / C 지형·물때 후보(조과 미확인). 공식 물때·날씨를 우선 반영하며, 양식장·마을어장은 허가 없이 들어가거나 채취하면 안 됩니다.</p>
          </section>
        </div>
      )}

      {tab === "camping" && (
        <div className="content-stack">
          {activities ? <section className="activity-overview">
            <article className="activity-card swim-card">
              <div className="activity-top"><span>🏊</span><div><small>{formatDay(date)} 물놀이</small><h2>물놀이 적합도</h2></div><b className={activities ? ratingClass[activityRating(activities.swim.score)] : "middle"}>{activities ? activityRating(activities.swim.score) : "…"}</b></div>
              <strong className="activity-score">{activities?.swim.score ?? "-"}<small>점</small></strong>
              <ul>{activities?.swim.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
              <p><span>준비</span>{activities?.swim.gear ?? "날씨 확인 중"}</p>
            </article>
            <article className="activity-card camp-score-card">
              <div className="activity-top"><span>⛺</span><div><small>{formatDay(date)} 캠핑</small><h2>캠핑 적합도</h2></div><b className={activities ? ratingClass[activityRating(activities.camp.score)] : "middle"}>{activities ? activityRating(activities.camp.score) : "…"}</b></div>
              <strong className="activity-score">{activities?.camp.score ?? "-"}<small>점</small></strong>
              {activities && <div className="comfort-badge">체감 {activities.camp.comfort} · 불쾌지수 {activities.camp.discomfort}</div>}
              <ul>{activities?.camp.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
              <p><span>준비</span>{activities?.camp.gear ?? "날씨 확인 중"}</p>
            </article>
          </section> : <div className="weather-unavailable-card"><span>⛺</span><div><b>물놀이·캠핑 점수 보류</b><p>공식 날씨가 없으면 안전 점수를 만들지 않아요. 출발 전 기상청 예보를 확인해 주세요.</p></div></div>}
          {data?.sourceStatus.weather && <div className="activity-weather-strip"><span>🌡 {data.weather.temperature}℃</span><span>💧 {data.weather.humidity}%</span><span>💨 {data.weather.wind}m/s</span><span>🌧 {data.weather.rainProbability}%</span><span>〰️ {data.weather.waveHeight !== null ? `${data.weather.waveHeight}m` : "미발표"}</span></div>}
          <section className="section-card camping-card">
            <div className="section-title-row">
              <h2>{spot.name} 주변 캠핑</h2>
              <span>한국관광공사 고캠핑 기준</span>
            </div>
            {nearbyCamps.length > 0 ? (
              <div className="camp-list">
                {nearbyCamps.map((camp) => {
                  const isPet = !camp.pet.includes("불가") && !camp.pet.includes("문의");
                  return (
                    <a href={camp.url} target="_blank" rel="noreferrer" key={camp.name}>
                      <div className="camp-icon">{isPet ? "🐶" : "⛺"}</div>
                      <div className="camp-copy">
                        <strong>{camp.name}</strong>
                        <p>{camp.note}</p>
                        <span>{camp.type}</span>
                      </div>
                      <div className={`pet-badge ${isPet ? "pet-ok" : camp.pet.includes("불가") ? "pet-no" : "pet-check"}`}>
                        {camp.pet}
                      </div>
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="empty-camps"><span>🏕️</span><strong>이 지역은 캠핑장 목록을 보강 중이에요.</strong><p>고캠핑에서 지역명으로 최신 등록 야영장을 확인할 수 있어요.</p></div>
            )}
            <a className="more-camps" href="https://www.gocamping.or.kr/" target="_blank" rel="noreferrer">고캠핑에서 더 찾아보기 ↗</a>
          </section>
          <div className="warning-box"><b>🐾 애견동반은 예약 전 다시 확인해 주세요.</b><p>체중 제한, 견종 제한, 추가요금과 예방접종 조건은 캠핑장 사정에 따라 바뀔 수 있어요. 리치와 함께 갈 때는 전화 확인이 가장 정확해요.</p></div>
        </div>
      )}

      {tab === "map" && (
        <div className="content-stack">
          <section className="section-card map-hub-card">
            <div className="section-title-row"><h2>{spot.name} 지도 탐색</h2><span>최신 지도 검색</span></div>
            <p>확정되지 않은 시설을 있는 것처럼 표시하지 않고, 선택 장소 주변의 최신 지도 결과를 바로 열어요.</p>
            <a className="primary-map-link" href={naverMapSearch(spot.name)} target="_blank" rel="noreferrer"><span>🗺️</span><div><strong>해루질 포인트 지도에서 보기</strong><small>{spot.name} · {spot.terrain}</small></div><b>열기 ↗</b></a>
            <div className="facility-search-grid">
              <a href={naverMapSearch(`${spot.name} 주차장`)} target="_blank" rel="noreferrer"><span>🅿️</span><strong>주차장</strong><small>거리·운영시간 확인</small></a>
              <a href={naverMapSearch(`${spot.name} 공중화장실`)} target="_blank" rel="noreferrer"><span>🚻</span><strong>화장실</strong><small>가장 가까운 곳 검색</small></a>
              <a href={naverMapSearch(`${spot.name} 캠핑장`)} target="_blank" rel="noreferrer"><span>⛺</span><strong>캠핑장</strong><small>최근 후기와 영업 확인</small></a>
              <a href={naverMapSearch(`${spot.name} 편의점`)} target="_blank" rel="noreferrer"><span>🏪</span><strong>편의점</strong><small>출조 전 보급 위치</small></a>
            </div>
          </section>
          <section className="section-card nearby-spot-card">
            <div className="section-title-row"><h2>같은 지역 포인트</h2><span>{REGIONS.find(item => item.id === spot.region)?.name}</span></div>
            <div>{visibleSpots.slice(0, 12).map(item => <button key={item.id} className={item.id === spot.id ? "selected" : ""} onClick={() => { changeSpot(item.id); setTab("overview"); }}><strong>{item.name}</strong><small>{item.terrain}</small></button>)}</div>
          </section>
          <div className="warning-box"><b>🚧 현장 통제와 사유지는 지도에 늦게 반영될 수 있어요.</b><p>출입금지 표지, 어촌계 관리구역, 주차금지 안내가 있으면 현장 안내를 우선하세요.</p></div>
        </div>
      )}

      {showDataGuide && (
        <div className="data-guide-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowDataGuide(false); }}>
          <section ref={dataGuideSheetRef} className="data-guide-sheet" role="dialog" aria-modal="true" aria-labelledby="data-guide-title">
            <div className="data-guide-head"><div><small>우측 상단 ‘자료’ 버튼</small><h2 id="data-guide-title">자료·안전 안내</h2></div><button ref={dataGuideCloseRef} type="button" onClick={() => setShowDataGuide(false)} aria-label="자료 안내 닫기">×</button></div>
            <div className="data-guide-current"><b>⚓ {spot.name} 물때 기준</b><p>가까운 항구는 <strong>{spot.sourceLabel}</strong>, 실제 적용 물때는 <strong>{displayedTideBasis}</strong>이에요. {data?.tideSource ? `자료 기준항은 ${data.tideSource.stationName}이며, ${data.tideSource.correctionMethod}을 사용해요.` : "공식 자료를 확인하고 있어요."}</p></div>
          <section className="section-card source-card">
            <h2>믿을 수 있는 데이터만 사용해요</h2>
            <a href="https://www.data.go.kr/data/15156018/openapi.do" target="_blank" rel="noreferrer"><span>🌊</span><div><strong>국립해양조사원 조석예보</strong><small>고조·저조 시각과 예측 조위</small></div><b>↗</b></a>
            <a href="https://www.data.go.kr/data/15084084/openapi.do" target="_blank" rel="noreferrer"><span>☁️</span><div><strong>기상청 단기예보</strong><small>기온·바람·강수·하늘 상태</small></div><b>↗</b></a>
            <a href="https://www.mof.go.kr/doc/ko/selectDoc.do?bbsSeq=22&docSeq=66688&menuSeq=1009" target="_blank" rel="noreferrer"><span>🐙</span><div><strong>해양수산부 금어기 기준</strong><small>2026.1.1 기준 + 시도별 고시</small></div><b>↗</b></a>
            <a href="https://www.gocamping.or.kr/" target="_blank" rel="noreferrer"><span>⛺</span><div><strong>한국관광공사 고캠핑</strong><small>등록 야영장·반려동물 동반 정보</small></div><b>↗</b></a>
          </section>
          <section className="section-card score-card">
            <h2>4단계 판단 기준</h2>
            <div><b className="best">최상</b><p>간조·조차 조건이 좋고 바람과 비가 안전 범위</p></div>
            <div><b className="good">좋음</b><p>대체로 적합하지만 현장 확인이 필요한 날</p></div>
            <div><b className="middle">중간</b><p>노출 시간이나 날씨 중 하나가 아쉬운 날</p></div>
            <div><b className="bad">나쁨</b><p>강풍·강수 또는 물때가 맞지 않아 권하지 않는 날</p></div>
            <p className="formula-note">바람 10m/s 이상 또는 강한 비가 예상되면 물때 점수와 관계없이 ‘나쁨’으로 제한합니다.</p>
          </section>
          <div className="danger-box"><strong>해루질 지수는 안전을 보장하지 않아요.</strong><p>출발 전 기상특보와 현장 통제 여부를 다시 확인하고, 반드시 2인 이상 활동하며 들물 전에 철수하세요.</p></div>
          <button className="data-guide-done" type="button" onClick={() => setShowDataGuide(false)}>확인</button>
          </section>
        </div>
      )}

      {!loading && !data?.live && data?.notice && <div className="api-notice"><span>{data?.sourceStatus.tide && !data?.sourceStatus.weather ? "📅" : "🔑"}</span><p><strong>{data?.sourceStatus.tide && !data?.sourceStatus.weather ? "물때 API 정상 · 날씨 예보 범위 확인" : "공공 API 일부 응답 확인 필요"}</strong>{data.notice}</p></div>}
      <footer>자료 출처 · 국립해양조사원 · 기상청 · 해양수산부 · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo 강수 보조격자</a><br /><span>예보와 보조격자는 현지 상황과 다를 수 있습니다.</span></footer>
    </main>
  );
}

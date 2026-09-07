export type TidePointAssignment = {
  reference: string;
  code: string;
  ids: readonly string[];
  directIds?: readonly string[];
  fallback?: { reference: string; code: string; context?: string };
  primaryAvailableFrom?: string;
  displayReference?: string;
  methodNote?: string;
};

// 국립해양조사원 조석예보(고·저조) 공식 예보지점 코드표(2025-12-12) 기준.
// directIds가 아닌 장소는 좌표형 TideBED 보정이 없을 때 이 공식 지점의 원값을 참고한다.
export const TIDE_POINT_ASSIGNMENTS: readonly TidePointAssignment[] = [
  { reference: "태안", code: "DT_0050", ids: ["gujina", "sinduri", "hakampo", "guryepo", "iwon_dike"] },
  { reference: "천리포항", code: "SO_0699", ids: ["mallipo", "gureumpo", "uihang", "baekripo"], directIds: ["mallipo"] },
  { reference: "안흥", code: "DT_0067", ids: ["anheung", "sinjindo", "gareumi", "yeonpo"], directIds: ["anheung"] },
  { reference: "어은돌항", code: "SO_1271", ids: ["eoeundol", "padory"], directIds: ["eoeundol"] },
  { reference: "백사장항", code: "SO_0574", ids: ["mongsanpo", "gomsom", "deuruni", "cheongpodae", "dalsanpo", "sambong", "yeonyukgyo", "hwangdo", "ganwoldo", "dangampo", "jinsanri"] },
  {
    reference: "안흥",
    code: "DT_0067",
    ids: ["mageompo"],
    displayReference: "마검포항",
    methodNote: "기상청 마검포 해수욕장 공식 조석표와 동일한 국립해양조사원 안흥 예보 적용",
  },
  { reference: "방포항", code: "SO_1260", ids: ["kkotji", "batgae", "saetbyeol", "baramarae"], directIds: ["kkotji"] },
  { reference: "대산", code: "DT_0017", ids: ["jungri", "garorim", "beolcheonpo"] },
  { reference: "무창포항", code: "SO_1261", ids: ["muchangpo", "doksan"], directIds: ["muchangpo"] },
  { reference: "보령", code: "DT_0025", ids: ["daecheon"] },
  { reference: "서천마량", code: "DT_0051", ids: ["seondori", "chunjangdae", "biin"] },
  { reference: "국화도", code: "SO_0564", ids: ["ippado"] },
  {
    reference: "왜목항",
    code: "SO_1290",
    ids: ["waemok"],
    directIds: ["waemok"],
    fallback: { reference: "삼길포항", code: "SO_1270" },
    primaryAvailableFrom: "2027-01-01",
  },
  {
    reference: "왜목항",
    code: "SO_1290",
    ids: ["janggohang"],
    fallback: { reference: "삼길포항", code: "SO_1270" },
    primaryAvailableFrom: "2027-01-01",
  },
  {
    reference: "가곡리",
    code: "SO_1291",
    ids: ["seokmun_dike"],
    fallback: { reference: "평택", code: "DT_0002", context: "당진 매산리·안섬포구권" },
    primaryAvailableFrom: "2027-01-01",
  },
  { reference: "삼길포항", code: "SO_1270", ids: ["dobido", "samgilpo"], directIds: ["samgilpo"] },
  { reference: "평택", code: "DT_0002", ids: ["haengdamdo"] },
  { reference: "안산", code: "DT_0008", ids: ["jebudo", "daebudo", "daebudo_dongju", "daebudo_yeongjeon", "heulgot", "jeburi_eochon", "seongam"] },
  { reference: "궁평항", code: "SO_1268", ids: ["gungpyeongri", "baekmiri"], directIds: ["gungpyeongri"] },
  { reference: "인천송도", code: "DT_0052", ids: ["songdo", "bangameori", "oido"], directIds: ["songdo"] },
  { reference: "영흥도", code: "DT_0043", ids: ["janggyeongri"] },
  { reference: "선재도", code: "SO_1282", ids: ["seonjaedo", "seonjaedo_eochon", "jonghyeon"], directIds: ["seonjaedo", "seonjaedo_eochon"] },
  { reference: "덕적도", code: "DT_0065", ids: ["deokjeokdo"], directIds: ["deokjeokdo"] },
  { reference: "영종왕산", code: "SO_0554", ids: ["wangsan", "eulwangri", "seonnyeobawi"], directIds: ["wangsan"] },
  { reference: "잠진도", code: "SO_1258", ids: ["keunmuri", "muui_silmi", "masian", "muui_hanagae"] },
  { reference: "소무의도", code: "DT_0093", ids: ["somuui"], directIds: ["somuui"] },
  { reference: "경인항", code: "DT_0058", ids: ["dongmak", "ganghwa_bunori", "ganghwa_hwangsando"] },
  { reference: "강화외포", code: "SO_0539", ids: ["ganghwa_oepoh", "ganghwa_janghwari"], directIds: ["ganghwa_oepoh"] },
  { reference: "어류정항", code: "SO_1256", ids: ["seokmodo"] },
  { reference: "강화대교", code: "DT_0032", ids: ["daemyeong"] },
  { reference: "승봉도", code: "SO_0562", ids: ["pungdo"] },
  { reference: "말도", code: "SO_0547", ids: ["seonyudo"] },
  { reference: "격포항", code: "SO_1262", ids: ["byeonsan"] },
  { reference: "목포", code: "DT_0007", ids: ["mokpo"], directIds: ["mokpo"] },
  { reference: "향화도항", code: "SO_0565", ids: ["muan"] },
] as const;

export const TIDE_UNSUPPORTED_IDS = ["ueumdo"] as const;

export function tidePointFor(locationId: string) {
  return TIDE_POINT_ASSIGNMENTS.find((assignment) => assignment.ids.includes(locationId));
}

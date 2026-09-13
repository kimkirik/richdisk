/** Community preference, not a scientific prediction of catch or safety. */
export function getTideAdjustment(mulLabel: string): number | null {
  if (["4물", "5물", "6물"].includes(mulLabel)) return 15;
  if (mulLabel === "9물" || mulLabel === "조금") return -15;
  if (/^(?:[1-9]|1[0-3])물$/.test(mulLabel) || mulLabel === "무시") return 0;
  return null;
}

export function getVisibilityAdjustment(level: string): number | null {
  switch (level) {
    case "비교적 깨끗": return 0;
    case "약간 흐림": return -10;
    case "많이 흐림": return -20;
    case "커피물 가능성 큼": return -30;
    default: return null;
  }
}

export function signedPoints(value: number | null | undefined) {
  return value == null ? "미확인" : `${value > 0 ? "+" : ""}${value}점`;
}

export const SCORE_POLICY_DESCRIPTION = "기본 60점 + 날씨 최대 25점. 4·5·6물 +15점, 9물·조금 −15점, 나머지 물때는 0점. 물색은 약간 흐림 −10점, 많이 흐림 −20점, 커피물 가능성 큼 −30점. 최종 점수는 0~100점입니다.";

export const SCORE_RATING_BANDS = [
  { min: 0, max: 60, rating: "비추", className: "bad" },
  { min: 61, max: 70, rating: "보통", className: "middle" },
  { min: 71, max: 85, rating: "좋음", className: "good" },
  { min: 86, max: 95, rating: "매우좋음", className: "great" },
  { min: 96, max: 100, rating: "당장 가야 함", className: "best" },
] as const;
export type ScoreRating = typeof SCORE_RATING_BANDS[number]["rating"];
/** Classify the displayed whole points, including comparison scores with decimals. */
export function getScoreRating(score: number): ScoreRating {
  const points = Number.isFinite(score) ? Math.round(score) : 0;
  return SCORE_RATING_BANDS.find(band => points <= band.max)?.rating ?? "당장 가야 함";
}

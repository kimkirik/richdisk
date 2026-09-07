const MUL_TTAE_LABELS = ["1물", "2물", "3물", "4물", "5물", "6물", "7물", "8물", "9물", "10물", "11물", "12물", "13물", "조금", "무시"] as const;

const lunarFormatters = ["dangi", "chinese"].flatMap(calendar => {
  try {
    return [new Intl.DateTimeFormat(`ko-KR-u-ca-${calendar}`, { day: "numeric", timeZone: "Asia/Seoul" })];
  } catch {
    return [];
  }
});

/** 서해안 7물때식: 음력 1일=7물, 4일=10물, 8일=조금, 9일=무시 */
export function getMulTtae(date: string) {
  const target = new Date(`${date}T12:00:00+09:00`);
  for (const formatter of lunarFormatters) {
    const lunarDay = Number(formatter.formatToParts(target).find(part => part.type === "day")?.value);
    if (Number.isFinite(lunarDay) && lunarDay >= 1 && lunarDay <= 30) return MUL_TTAE_LABELS[(lunarDay + 5) % 15];
  }
  return "확인";
}

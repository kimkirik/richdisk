/** An estimate from weather, recent rain and terrain; shared by the API and UI. */
export type VisibilityConditions = {
  sourceStatus: { weather: boolean; recentRain?: boolean };
  weather: { rain: number; wind: number; waveHeight: number | null };
  tides: Array<{ height: number }>;
  recentRain?: { last24h: number | null; last48h: number | null; last72h: number | null; consecutiveRainDays: number; coverageDays?: number } | null;
};

export function getWaterVisibility(data: VisibilityConditions | null, terrain: string) {
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

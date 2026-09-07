type Row = Record<string, unknown>;
type Tide = { time: string; height: number; type: "high" | "low" };

export function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/** KMA DFS Lambert conformal conic, 5 km grid (WGS84 degrees). */
export function toKmaGrid(lat: number, lon: number) {
  const rad = Math.PI / 180, re = 6371.00877 / 5;
  const sn = Math.log(Math.cos(30 * rad) / Math.cos(60 * rad)) /
    Math.log(Math.tan(Math.PI / 4 + 60 * rad / 2) / Math.tan(Math.PI / 4 + 30 * rad / 2));
  const sf = Math.pow(Math.tan(Math.PI / 4 + 30 * rad / 2), sn) * Math.cos(30 * rad) / sn;
  const ro = re * sf / Math.pow(Math.tan(Math.PI / 4 + 38 * rad / 2), sn);
  const ra = re * sf / Math.pow(Math.tan(Math.PI / 4 + lat * rad / 2), sn);
  const theta = (lon - 126) * rad * sn;
  return { nx: Math.floor(ra * Math.sin(theta) + 43.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136.5) };
}

export function parseForecastNumber(value: unknown): number | null {
  const text = String(value ?? "").trim();
  if (!text || text === "-") return null;
  if (text === "강수없음" || text === "적설없음") return 0;
  const numeric = finiteNumber(text);
  if (numeric !== null) return numeric <= -900 ? null : numeric;
  // Category bounds are retained as bounds, never invented midpoint rainfall.
  const range = text.match(/^(\d+(?:\.\d+)?)\s*(?:~|–|-)\s*(\d+(?:\.\d+)?)/);
  if (range) return Number(range[2]);
  if (/이상/.test(text)) return null; // no finite upper bound
  const amount = text.match(/^(\d+(?:\.\d+)?)\s*(?:mm|cm)/i);
  return amount ? Number(amount[1]) : null;
}

export function summarizeForecast(items: Row[], tides: Tide[]) {
  const minuteOf = (row: Row) => {
    const raw = String(row.fcstTime ?? "").padStart(4, "0");
    if (!/^\d{4}$/.test(raw)) return NaN;
    const hour = Number(raw.slice(0, 2)), minute = Number(raw.slice(2));
    return hour < 24 && minute < 60 ? hour * 60 + minute : NaN;
  };
  const lows = tides.filter(t => t.type === "low");
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const selected = items.filter(row => Number.isFinite(minuteOf(row)) &&
    (!lows.length || lows.some(low => minuteOf(row) >= minutes(low.time) - 120 && minuteOf(row) <= minutes(low.time) + 30)));
  if (!selected.length) throw new Error("선택한 간조 시간대의 예보가 없습니다. 다른 시간 예보로 대체하지 않습니다.");
  const rowsFor = (category: string) => selected.filter(row => row.category === category);
  const numbers = (category: string) => rowsFor(category).map(row => parseForecastNumber(row.fcstValue)).filter((n): n is number => n !== null);
  for (const category of ["TMP", "WSD", "PCP", "POP", "REH", "SKY", "PTY"]) {
    if (!numbers(category).length || rowsFor(category).some(row => parseForecastNumber(row.fcstValue) === null)) {
      throw new Error(`시간대 예보 ${category} 누락 또는 결측 · 임시 수치 미사용`);
    }
  }
  const timeSets = ["TMP", "WSD", "PCP", "POP", "REH", "SKY", "PTY"].map(category => new Set(rowsFor(category).map(minuteOf)));
  const forecastMinutes = [...new Set(selected.map(minuteOf))].sort((a, b) => a - b);
  if (forecastMinutes.some(time => timeSets.some(set => !set.has(time)))) throw new Error("시간별 필수 예보 항목 불완전");
  const focusTimes = lows.filter(low => forecastMinutes.some(time => time >= minutes(low.time) - 120 && time <= minutes(low.time) + 30)).map(low => low.time);
  const target = focusTimes.length ? minutes(focusTimes[0]) : 720;
  const representative = rowsFor("TMP").reduce((best, row) => Math.abs(minuteOf(row) - target) < Math.abs(minuteOf(best) - target) ? row : best);
  const atRepresentative = (category: string) => parseForecastNumber(rowsFor(category).find(row => minuteOf(row) === minuteOf(representative))!.fcstValue)!;
  const formatTime = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
  const dailyRain = new Map(items.filter(row => row.category === "PCP").map(row => [minuteOf(row), parseForecastNumber(row.fcstValue)]));
  const fullDay = Array.from({length: 24}, (_, hour) => dailyRain.get(hour * 60)).every(value => value !== undefined && value !== null);
  const pty = Math.max(...numbers("PTY")), sky = atRepresentative("SKY");
  const bounds = items.some(row => row.category === "PCP" && /미만|~|–/.test(String(row.fcstValue)));
  return {
    temperature: atRepresentative("TMP"), wind: Math.max(...numbers("WSD")), rain: Math.max(...numbers("PCP")),
    rainDayTotal: fullDay ? Number([...dailyRain.values()].reduce<number>((sum, value) => sum + (value ?? 0), 0).toFixed(1)) : null,
    rainProbability: Math.max(...numbers("POP")), rainDayProbability: Math.max(...numbers("POP")),
    waveHeight: numbers("WAV").length ? Math.max(...numbers("WAV")) : null,
    humidity: atRepresentative("REH"), sky: pty > 0 ? "강수" : sky <= 1 ? "맑음" : sky <= 3 ? "구름많음" : "흐림",
    basis: lows.length ? "OUTING_WINDOWS" as const : "DAY" as const, focusTimes, kind: "forecast" as const,
    forecastTimes: forecastMinutes.map(formatTime), representativeTime: formatTime(minuteOf(representative)),
    issuedAt: representative.baseDate && representative.baseTime ? `${representative.baseDate} ${representative.baseTime}` : null,
    rainUsesCategoryBounds: bounds,
    missingWindowTimes: lows.filter(low => !focusTimes.includes(low.time)).map(low => low.time),
    coverageNote: "표시된 예보 시각만 반영 · 풍속·강수·파고는 그중 최댓값 · 기온·습도는 대표 시각",
  };
}

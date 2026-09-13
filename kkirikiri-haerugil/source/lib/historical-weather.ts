/** Parse the public KMA observation tables without executing their scripts. */
const clean = (value: string) => value.replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/\s+/g," ").trim();
export type DailyObservation = { temperature: number; rain: number; cloud: number | null };
export function parseDailyObservations(html: string, year: string, month: string) {
  const table = html.match(/<table\b[^>]*class=["'][^"']*\btable-cal\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error("기상청 일별 관측 표 없음");
  const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match => match[1]);
  const result = new Map<string, DailyObservation>();
  const cells = (row: string) => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => clean(match[1]));
  for (let i=0;i<rows.length-1;i++) {
    const days = cells(rows[i]).map(cell => cell.match(/^(\d{1,2})일$/)?.[1]);
    if (!days.some(Boolean)) continue;
    const values = cells(rows[i+1]);
    if (values.length !== days.length) continue;
    days.forEach((day,index) => {
      if (!day) return;
      const text = values[index];
      const temperature = text.match(/평균기온:\s*(-?\d+(?:\.\d+)?)\s*℃/);
      const rain = text.match(/일강수량:\s*(\d+(?:\.\d+)?\s*mm|-)(?:\s|$)/);
      const cloud = text.match(/평균운량:\s*(\d+(?:\.\d+)?)/);
      // A completed daily temperature is required before a dash can mean no rain.
      if (!temperature || !rain) return;
      result.set(`${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`, {temperature:Number(temperature[1]), rain:rain[1] === "-" ? 0 : parseFloat(rain[1]), cloud: cloud ? Number(cloud[1]) : null});
    });
  }
  return result;
}
export function parseElementObservations(html: string, year: string, element: "wind" | "humidity") {
  const table = html.match(/<table\b[^>]*id=["']weather_table["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error("기상청 요소별 관측 표 없음");
  const result = new Map<string, number>();
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    const day = clean(cells[0] ?? "").match(/^(\d{1,2})일$/)?.[1];
    if (!day || cells.length !== 13) continue;
    for(let month=1;month<=12;month++) {
      const value = element === "wind" ? cells[month].match(/writeWindSpeed\(\s*['"](\d+(?:\.\d+)?)['"]/)?.[1] : clean(cells[month]).match(/^(\d+(?:\.\d+)?)$/)?.[1];
      if (value === undefined) continue;
      const number = Number(value);
      if (element === "humidity" && number > 100) continue;
      const date = `${year}-${String(month).padStart(2,"0")}-${day.padStart(2,"0")}`;
      if (new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date) continue;
      result.set(date, number);
    }
  }
  return result;
}

/** The city table may silently reset a query; require the returned date and station. */
export function parseHourlyWind(html: string, date: string, station: string) {
  const inputs = [...html.matchAll(/<input\b[^>]*>/gi)].map(match => match[0]);
  const inputValue = (name: string) => inputs.find(tag => new RegExp(`\\bname=["']${name}["']`).test(tag))?.match(/\bvalue=["']([^"']*)["']/)?.[1];
  if (inputValue("tm") !== `${date.replaceAll("-", ".")}.23:00` || inputValue("stn") !== station) throw new Error("기상청 시간별 관측의 날짜·지점 불일치");
  const table = html.match(/<table\b[^>]*id=["']weather_table["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if (!table) throw new Error("기상청 시간별 관측 표 없음");
  const hours = new Map<number, number>();
  for (const row of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => match[1]);
    const time = clean(cells[0] ?? "").match(/^(\d{1,2})\.(\d{1,2})H$/);
    if (!time || Number(time[1]) !== Number(date.slice(8)) || Number(time[2]) > 23) continue;
    const value = row[1].match(/writeWindSpeed\(\s*['"](\d+(?:\.\d+)?)['"]/)?.[1];
    if (value !== undefined) hours.set(Number(time[2]), Number(value));
  }
  // Sparse observations must not be promoted into a whole-day rating.
  if (hours.size < 20 || [0,6,12,18].some(start => ![...hours.keys()].some(hour => hour >= start && hour < start + 6))) throw new Error("시간별 풍속 관측이 충분하지 않아요");
  return {wind:Math.max(...hours.values()),hours:hours.size};
}

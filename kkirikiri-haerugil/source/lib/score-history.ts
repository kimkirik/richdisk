/** Previous ratings are historical records, never a replacement for fresh weather. */
export type RecordedScore = { score: number; rating: string; checkedAt: string; kind: "forecast" | "observation"; note?: string };
export type ScoreHistory = { forecast?: RecordedScore; observation?: RecordedScore };
type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };
const KEY = "kkirikiri-score-history-v1";
const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date));
function validRecord(value: unknown): value is RecordedScore {
  if (!value || typeof value !== "object") return false;
  const v = value as RecordedScore;
  return Number.isFinite(v.score) && v.score >= 0 && v.score <= 100 && typeof v.rating === "string" && v.rating.length < 30 && Number.isFinite(Date.parse(v.checkedAt)) && ["forecast","observation"].includes(v.kind);
}
export function readScoreHistory(storage: StorageLike, location: string, date: string): ScoreHistory {
  try {
    const all = JSON.parse(storage.getItem(KEY) ?? "{}");
    const row = all[`${location}:${date}`];
    return {forecast:validRecord(row?.forecast) ? row.forecast : undefined,observation:validRecord(row?.observation) ? row.observation : undefined};
  } catch { return {}; }
}
export function saveScoreHistory(storage: StorageLike, input: unknown, location: string, date: string): ScoreHistory {
  const previous = readScoreHistory(storage,location,date);
  if (!input || typeof input !== "object" || !validDate(date)) return previous;
  const value = input as {locationId?: string; date?: string; score?: number; rating?: string; scoreNote?: string; sourceStatus?: {tide?: boolean;weather?: boolean}; tidePreview?: boolean; pendingSources?: Record<string,boolean>; updatedAt?: string; weather?:{kind?:string};};
  if (value.locationId !== location || value.date !== date || !value.sourceStatus?.tide || !value.sourceStatus?.weather || value.tidePreview || Object.values(value.pendingSources ?? {}).some(Boolean)) return previous;
  const record = {score:value.score,rating:value.rating,checkedAt:value.updatedAt,kind:value.weather?.kind,note:value.scoreNote};
  if (!validRecord(record)) return previous;
  const next = {...previous,[record.kind]:record};
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? "{}");
    const all: Record<string,ScoreHistory> = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    all[`${location}:${date}`] = next;
    const ordered = Object.entries(all).sort(([,a],[,b]) => (b.observation?.checkedAt ?? b.forecast?.checkedAt ?? "").localeCompare(a.observation?.checkedAt ?? a.forecast?.checkedAt ?? "")).slice(0,120);
    storage.setItem(KEY,JSON.stringify(Object.fromEntries(ordered)));
  } catch { /* Storage failure does not affect live results. */ }
  return next;
}

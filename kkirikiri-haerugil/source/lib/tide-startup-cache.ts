/** Only dated tide predictions are kept for startup; weather and safety scores are never restored. */
export type SavedTide = {
  locationId: string; date: string;
  tides: Array<{ time: string; height: number; type: "high" | "low" }>;
  referencePort: string; tideRetrievedAt: string;
  tideMethod: "direct" | "coordinate" | "nearby";
  tideSource: { provider: string; stationName: string; stationCode: string; correctionLocation: string; correctionMethod: string };
};
type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
const KEY = "kkirikiri-tide-startup-v12";
const MAX_AGE = 6 * 60 * 60_000;
function valid(value: unknown, location: string, date: string, now: number): value is SavedTide {
  if (!value || typeof value !== "object") return false;
  const v = value as SavedTide, age = now - Date.parse(v.tideRetrievedAt);
  return v.locationId === location && v.date === date && Number.isFinite(age) && age >= -60_000 && age < MAX_AGE
    && ["direct", "coordinate", "nearby"].includes(v.tideMethod) && typeof v.referencePort === "string"
    && Boolean(v.tideSource && ["provider", "stationName", "stationCode", "correctionLocation", "correctionMethod"].every(key => typeof v.tideSource[key as keyof typeof v.tideSource] === "string"))
    && Array.isArray(v.tides) && v.tides.length >= 3 && v.tides.length <= 4
    && v.tides.every((t, i) => t && typeof t.height === "number" && Number.isFinite(t.height) && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(t.time)
      && ["high", "low"].includes(t.type) && (i === 0 || (t.time > v.tides[i - 1].time && t.type !== v.tides[i - 1].type)));
}
function entries(storage: Storage): unknown[] {
  const raw = storage.getItem(KEY);
  if (!raw || raw.length > 128_000) return [];
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.slice(-24) : [];
}
export function readSavedTide(storage: Storage, location: string, date: string, now = Date.now()): SavedTide | null {
  try { return entries(storage).find(v => valid(v, location, date, now)) as SavedTide ?? null; } catch { return null; }
}
export function saveTide(storage: Storage, value: unknown, location: string, date: string, now = Date.now()): SavedTide | null {
  try {
    const input = value as SavedTide & { sourceStatus?: { tide?: boolean }; tidePreview?: boolean };
    if (!input?.sourceStatus?.tide || input.tidePreview || !valid(input, location, date, now)) return null;
    const saved: SavedTide = { locationId: input.locationId, date: input.date, tides: input.tides, referencePort: input.referencePort, tideRetrievedAt: input.tideRetrievedAt, tideMethod: input.tideMethod, tideSource: input.tideSource };
    const keep = entries(storage).filter(v => {
      const item = v as SavedTide;
      return item && valid(item, item.locationId, item.date, now) && !(item.locationId === location && item.date === date);
    });
    storage.setItem(KEY, JSON.stringify([...keep, saved].slice(-24)));
    return saved;
  } catch { return null; }
}

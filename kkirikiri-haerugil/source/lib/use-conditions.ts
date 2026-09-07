"use client";
import { useEffect, useState } from "react";
import { fetchConditions } from "./conditions-client";
import { readSavedTide, saveTide, type SavedTide } from "./tide-startup-cache";

const kstFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const kstDate = () => kstFormatter.format(new Date());
export function useKstToday() {
  const [today, setToday] = useState(kstDate);
  useEffect(() => {
    const refresh = () => setToday(kstDate());
    const timer = setInterval(refresh, 30_000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, []);
  return today;
}

export function useConditions<T>(location: string, date: string, enabled = true) {
  const key = `${location}:${date}`;
  const [saved, setSaved] = useState<{ key: string; value: SavedTide | null }>({ key: "", value: null });
  const [state, setState] = useState<{ key: string; data: T | null; loading: boolean; error: string }>({ key: "", data: null, loading: true, error: "" });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    try { setSaved({ key, value: readSavedTide(window.localStorage, location, date) }); } catch { setSaved({ key, value: null }); }
    const rememberTide = (value: T) => {
      try { const tide = saveTide(window.localStorage, value, location, date); if (tide) setSaved({ key, value: tide }); } catch { /* Browser storage may be disabled. */ }
    };
    let controller: AbortController | null = null;
    let lastStarted = -Infinity;
    const refresh = async () => {
      // Focus and visibilitychange often arrive together. Keep the request already running.
      if (document.visibilityState === "hidden" || controller || Date.now() - lastStarted < 2000) return;
      lastStarted = Date.now();
      const request = new AbortController(); controller = request;
      const timeout = setTimeout(() => request.abort(), 55_000);
      // Clear numbers while updating: a failure must not leave old forecasts labelled current.
      setState({ key, data: null, loading: true, error: "" });
      try {
        const data = await fetchConditions<T>(location, date, request.signal, partial => {
          if (active && controller === request && !request.signal.aborted) { rememberTide(partial); setState({ key, data: partial, loading: true, error: "" }); }
        });
        if (active && controller === request && !request.signal.aborted) { rememberTide(data); setState({ key, data, loading: false, error: "" }); }
      } catch {
        if (active && controller === request) setState({ key, data: null, loading: false, error: "자료를 확인하지 못했어요. 잠시 후 다시 확인해 주세요." });
      } finally { clearTimeout(timeout); if (controller === request) controller = null; }
    };
    void refresh();
    const timer = setInterval(refresh, 5 * 60_000);
    window.addEventListener("focus", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { active = false; controller?.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [location, date, enabled, key]);
  return { ...(enabled && state.key === key ? state : { key, data: null, loading: enabled, error: "" }), savedTide: enabled && saved.key === key && saved.value && Date.now() - Date.parse(saved.value.tideRetrievedAt) < 6 * 60 * 60_000 ? saved.value : null };
}

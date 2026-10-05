(function (root) {
  "use strict";
  // A phone's localhost is the phone, not the Mac. Always use the same private
  // origin as the app; never silently send audio to another host.
  const BASE = location.origin;
  const HEADERS = { "X-Drumscore-Client": "studio-v1" };

  async function request(path, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(`${BASE}${path}`, {
        ...options, headers: { ...HEADERS, ...options.headers }, signal: controller.signal,
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        const error = new Error(typeof data.detail === "string" ? data.detail : `분석 엔진 오류 (${response.status})`);
        error.status = response.status;
        throw error;
      }
      return response;
    } finally { clearTimeout(timer); }
  }

  async function connect() {
    const response = await request("/api/health", {}, 15000);
    const health = await response.json();
    if (health.service !== "drum-score-engine" || health.protocolVersion !== 1) {
      throw new Error("이 앱과 호환되는 드럼 분석 엔진이 아닙니다.");
    }
    return health;
  }

  function validate(result) {
    const ids = new Set(["kick", "snare", "hat", "tom", "cymbal"]);
    if (!result || result.schemaVersion !== 1 || !Number.isFinite(result.duration) ||
        result.duration <= 0 || result.duration > 720 || !Array.isArray(result.events) ||
        result.events.length > 50000 || !Array.isArray(result.beatTimes) || result.beatTimes.length > 20000) {
      throw new Error("채보 결과 형식이 올바르지 않습니다.");
    }
    if ((result.bpm !== null && (!Number.isFinite(result.bpm) || result.bpm < 45 || result.bpm > 260)) ||
        !Array.isArray(result.warnings) || result.warnings.some(w => typeof w !== "string")) {
      throw new Error("채보 결과의 BPM 또는 안내 정보가 올바르지 않습니다.");
    }
    if (result.events.some(e => !e || !ids.has(e.instrument) || !Number.isFinite(e.time) || e.time < 0 ||
        e.time > result.duration || !Number.isFinite(e.confidence) || e.confidence < 0 || e.confidence > 1 ||
        !Number.isInteger(e.velocity) || e.velocity < 1 || e.velocity > 127)) {
      throw new Error("채보 결과의 타격 정보가 올바르지 않습니다.");
    }
    if (result.beatTimes.some((t, i, all) => !Number.isFinite(t) || t < 0 ||
        (i > 0 && t <= all[i - 1]))) throw new Error("채보 결과의 박자 정보가 올바르지 않습니다.");
    return result;
  }

  const retryable = error => !error.status || error.status >= 500 || [408, 429].includes(error.status);
  const cancelledError = () => Object.assign(new Error("분석을 취소했습니다."), { jobState: "cancelled" });

  function pause(ms = 1500) {
    // Returning to the tab or reconnecting wakes polling immediately. Hidden
    // mobile tabs may freeze altogether; the Mac job does not depend on them.
    return new Promise(resolve => {
      const done = () => {
        clearTimeout(timer);
        root.removeEventListener?.("online", done);
        root.document?.removeEventListener("visibilitychange", done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      root.addEventListener?.("online", done, { once: true });
      root.document?.addEventListener("visibilitychange", done, { once: true });
    });
  }

  const status = async id => (await request(`/api/jobs/${id}`)).json();
  const latest = async () => (await request("/api/jobs/latest")).json();

  async function monitor(id, onProgress, isCancelled = () => false) {
    let percent = 0;
    for (;;) {
      if (isCancelled()) {
        await cancel(id);
        const error = new Error("분석을 취소했습니다. 현재 구간 처리가 끝나면 엔진이 정지합니다.");
        error.jobState = "cancelled";
        throw error;
      }
      if (root.document?.hidden) { await pause(5000); continue; }
      let job;
      try { job = await status(id); }
      catch (error) {
        if (!retryable(error)) throw error;
        onProgress(percent, "연결을 다시 확인하고 있어요 · 맥의 작업은 계속됩니다");
        await pause(2500);
        continue;
      }
      percent = job.progress;
      onProgress(percent, job.detail);
      if (job.state === "completed") return { id, result: validate(job.result) };
      if (["failed", "cancelled"].includes(job.state)) {
        const error = new Error(job.error || "분석을 취소했습니다.");
        error.jobState = job.state;
        throw error;
      }
      await pause();
    }
  }

  async function analyze(blob, options, onProgress, onJob, isCancelled = () => false) {
    if (isCancelled()) throw cancelledError();
    const id = options.jobId || root.crypto.randomUUID().replaceAll("-", "");
    // Record the id BEFORE upload. A lost POST response must not create a
    // second transcription when a discarded tab reopens.
    await onJob(id);
    if (options.jobId) {
      for (;;) {
        if (isCancelled()) throw cancelledError();
        try { await status(id); return monitor(id, onProgress, isCancelled); }
        catch (error) {
          if (error.status === 404) break;
          if (!retryable(error)) throw error;
          onProgress(0, "이전 작업에 다시 연결 중 · 맥의 작업은 계속됩니다");
          await pause(2500);
        }
      }
    }
    if (!blob) throw Object.assign(new Error("저장된 작업이나 원곡을 찾지 못했습니다. 파일을 다시 선택해 주세요."), { status: 404 });
    // Old engines can keep completing an existing job during a safe update,
    // but cannot deduplicate a new upload whose response is lost.
    let health;
    for (;;) {
      if (isCancelled()) throw cancelledError();
      try { health = await connect(); break; }
      catch (error) {
        if (!retryable(error)) throw error;
        onProgress(0, "맥 연결을 기다리고 있어요 · 아직 새 분석을 시작하지 않았습니다");
        await pause(2500);
      }
    }
    if (!health.resumableJobs) throw Object.assign(new Error("진행 중인 곡이 끝나면 엔진 업데이트가 적용됩니다. 잠시 뒤 새 분석을 시작해 주세요."), { status: 409 });
    const form = new FormData();
    form.append("file", blob, "music.audio");
    form.append("client_id", id);
    form.append("title", options.title || "음악 파일");
    form.append("sensitivity", String(options.sensitivity));
    form.append("input_is_drums", String(options.inputIsDrums));
    if (options.bpm !== null) form.append("bpm", String(options.bpm));
    for (;;) {
      if (isCancelled()) throw Object.assign(new Error("업로드를 취소했습니다."), { jobState: "cancelled" });
      onProgress(2, "음악을 맥으로 전송 중 · 업로드 완료까지 이 화면을 유지해 주세요");
      try {
        const created = await (await request("/api/jobs", { method: "POST", body: form }, 180000)).json();
        if (created.id !== id) throw Object.assign(new Error("분석 작업 번호가 올바르지 않습니다."), { status: 400 });
        break;
      } catch (error) {
        if (!retryable(error)) throw error;
        // The server may have accepted the upload even if the response was lost.
        for (;;) {
          await pause(2500);
          if (isCancelled()) throw Object.assign(new Error("업로드를 취소했습니다."), { jobState: "cancelled" });
          try { await status(id); return monitor(id, onProgress, isCancelled); }
          catch (checkError) {
            if (checkError.status === 404) break;
            if (!retryable(checkError)) throw checkError;
            onProgress(2, "연결 복구 대기 중 · 같은 작업 번호로 업로드를 확인합니다");
          }
        }
      }
    }
    return monitor(id, onProgress, isCancelled);
  }

  const cancel = id => request(`/api/jobs/${id}`, { method: "DELETE" });
  const file = async (id, name, onRetry = () => {}, isCancelled = () => false) => {
    for (;;) {
      if (isCancelled()) throw cancelledError();
      try { return await (await request(`/api/jobs/${id}/files/${name}`, {}, 180000)).blob(); }
      catch (error) {
        if (!retryable(error)) throw error;
        onRetry();
        await pause(2500);
      }
    }
  };
  root.DrumPro = { connect, analyze, monitor, status, latest, cancel, file, validate, url: BASE };
})(globalThis);

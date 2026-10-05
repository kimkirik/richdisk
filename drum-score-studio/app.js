"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const INSTRUMENTS = [
  { id: "cymbal", short: "CY", name: "심벌 (종류 확인)", midi: 49, mark: "cross", staffY: 42, displayStep: "A", displayOctave: 5, voice: "upper" },
  { id: "tom", short: "TM", name: "탐 (높이 확인)", midi: 47, mark: "circle", staffY: 68, displayStep: "D", displayOctave: 5, voice: "upper" },
  { id: "crash", short: "CR", name: "크래시", midi: 49, mark: "cross", staffY: 42, displayStep: "A", displayOctave: 5, voice: "upper" },
  { id: "openHat", short: "OH", name: "오픈 하이햇", midi: 46, mark: "open-cross", staffY: 48.5, displayStep: "G", displayOctave: 5, voice: "upper" },
  { id: "hat", short: "HH", name: "하이햇", midi: 42, mark: "cross", staffY: 48.5, displayStep: "G", displayOctave: 5, voice: "upper" },
  { id: "ride", short: "RD", name: "라이드", midi: 51, mark: "cross", staffY: 55, displayStep: "F", displayOctave: 5, voice: "upper" },
  { id: "tomHigh", short: "T1", name: "탐1", midi: 50, mark: "circle", staffY: 61.5, displayStep: "E", displayOctave: 5, voice: "upper" },
  { id: "tomMid", short: "T2", name: "탐2", midi: 47, mark: "circle", staffY: 68, displayStep: "D", displayOctave: 5, voice: "upper" },
  { id: "snare", short: "SD", name: "스네어", midi: 38, mark: "circle", staffY: 74.5, displayStep: "C", displayOctave: 5, voice: "upper" },
  { id: "tomFloor", short: "T3", name: "탐3", midi: 43, mark: "circle", staffY: 87.5, displayStep: "A", displayOctave: 4, voice: "upper" },
  { id: "kick", short: "BD", name: "베이스 드럼", midi: 36, mark: "circle", staffY: 100.5, displayStep: "F", displayOctave: 4, voice: "lower" },
];

const DIFFICULTY_HELP = {
  easy: "큰 박자 중심으로 단순화해 처음 연습하기 좋게 만듭니다.",
  standard: "불확실한 타격과 지나치게 촘촘한 음을 정리합니다.",
  exact: "감지한 타격을 모두 표시합니다. 16분음표보다 촘촘한 연주는 연주 MIDI로 보존합니다.",
};

const ui = {
  uploadPanel: $("#uploadPanel"),
  workspace: $("#workspace"),
  audioFile: $("#audioFile"),
  projectFile: $("#projectFile"),
  dropZone: $("#dropZone"),
  demoButton: $("#demoButton"),
  trackName: $("#trackName"),
  trackDetails: $("#trackDetails"),
  waveform: $("#waveform"),
  waveEmpty: $("#waveEmpty"),
  playhead: $("#playhead"),
  audio: $("#audio"),
  playButton: $("#playButton"),
  stopButton: $("#stopButton"),
  rewindButton: $("#rewindButton"),
  forwardButton: $("#forwardButton"),
  currentTime: $("#currentTime"),
  duration: $("#duration"),
  volume: $("#volume"),
  bpmInput: $("#bpmInput"),
  detectBpmButton: $("#detectBpmButton"),
  timeSignature: $("#timeSignature"),
  difficultyGroup: $("#difficultyGroup"),
  difficultyHelp: $("#difficultyHelp"),
  sensitivity: $("#sensitivity"),
  sensitivityValue: $("#sensitivityValue"),
  drumIsolation: $("#drumIsolation"),
  analyzeButton: $("#analyzeButton"),
  progressCard: $("#progressCard"),
  progressTitle: $("#progressTitle"),
  progressDetail: $("#progressDetail"),
  progressPercent: $("#progressPercent"),
  progressBar: $("#progressBar"),
  scoreCard: $("#scoreCard"),
  resultBpm: $("#resultBpm"),
  resultBars: $("#resultBars"),
  resultHits: $("#resultHits"),
  editToggle: $("#editToggle"),
  metronomeToggle: $("#metronomeToggle"),
  exportButton: $("#exportButton"),
  exportPopover: $("#exportPopover"),
  instrumentPalette: $("#instrumentPalette"),
  scorePlayButton: $("#scorePlayButton"),
  scorePlayIcon: $("#scorePlayButton i"),
  scorePlayLabel: $("#scorePlayLabel"),
  scoreStopButton: $("#scoreStopButton"),
  scoreCurrentTime: $("#scoreCurrentTime"),
  scoreScroll: $("#scoreScroll"),
  helpButton: $("#helpButton"),
  helpDialog: $("#helpDialog"),
  toast: $("#toast"),
  analysisMode: $("#analysisMode"),
  enginePanel: $("#enginePanel"),
  engineStatus: $("#engineStatus"),
  connectEngine: $("#connectEngine"),
  inputIsDrums: $("#inputIsDrums"),
  quickIsolation: $("#quickIsolation"),
  bpmModeLabel: $("#bpmModeLabel"),
  gridOffset: $("#gridOffset"),
  cancelAnalysis: $("#cancelAnalysis"),
  analysisReport: $("#analysisReport"),
  stemControls: $("#stemControls"),
  listenOriginal: $("#listenOriginal"),
  listenDrums: $("#listenDrums"),
  downloadStem: $("#downloadStem"),
  exportPerformance: $("#exportPerformance"),
};

const state = {
  fileName: "",
  fileSize: 0,
  objectUrl: "",
  audioBuffer: null,
  envelopes: null,
  events: new Map(),
  bpm: 120,
  timeSignature: "4/4",
  gridStart: 0,
  totalSteps: 0,
  sensitivity: 62,
  drumIsolation: true,
  difficulty: "exact",
  selectedInstrument: "hat",
  editing: true,
  metronome: false,
  isDemo: false,
  demoTruth: null,
  analyzing: false,
  currentRenderedStep: -1,
  animationFrame: 0,
  lastClickBeat: -1,
  audioContext: null,
  barsPerSystem: 0,
  printing: false,
  audioBlob: null,
  loadVersion: 0,
  analysisMode: "pro",
  bpmManual: false,
  gridOffset: 0,
  gridTimes: null,
  proResult: null,
  stemBlob: null,
  stemUrl: "",
  activeSource: "original",
  currentJob: null,
  cancelRequested: false,
  removedAiHits: new Set(),
  workspaceId: "",
  jobStage: "idle",
  restoring: false,
};

let workspaceWrites = Promise.resolve();
let storageWarningShown = false;
function storageWarning(error) {
  console.warn("Workspace save unavailable", error);
  if (!storageWarningShown) {
    showToast("기기 저장 공간이 부족해 음원 자동 복구가 제한됩니다. 맥의 분석 작업은 계속됩니다.");
    storageWarningShown = true;
  }
}

function workspaceSnapshot() {
  return { id: state.workspaceId, jobId: state.currentJob, stage: state.jobStage,
    fileName: state.fileName, fileSize: state.fileSize, updatedAt: Date.now(),
    project: projectData(), options: { inputIsDrums: ui.inputIsDrums.checked,
      sensitivity: state.sensitivity, bpm: state.bpmManual ? state.bpm : null },
    analysisMode: state.analysisMode, playbackTime: ui.audio.currentTime || 0,
    activeSource: state.activeSource };
}

function saveWorkspace() {
  if (state.restoring || !state.workspaceId) return Promise.resolve();
  const snapshot = workspaceSnapshot();
  try { DrumWorkspace.remember(snapshot); } catch (error) { storageWarning(error); }
  workspaceWrites = workspaceWrites.catch(() => {}).then(() => DrumWorkspace.save(snapshot)).catch(storageWarning);
  return workspaceWrites;
}

async function attachStem(stem) {
  if (state.stemUrl) URL.revokeObjectURL(state.stemUrl);
  state.stemBlob = stem;
  state.stemUrl = URL.createObjectURL(stem);
  ui.stemControls.classList.remove("is-hidden");
  ui.listenOriginal.disabled = !state.audioBlob;
  if (!state.audioBlob) {
    state.audioBuffer = await getAudioContext().decodeAudioData(await stem.arrayBuffer());
    drawWaveform(state.audioBuffer);
    updateTrackMeta();
    ui.waveEmpty.classList.add("is-hidden");
    await selectAudioSource("drums");
    for (const control of [ui.playButton, ui.stopButton, ui.scorePlayButton, ui.scoreStopButton]) control.disabled = false;
  }
}

async function restoreWorkspace() {
  if (state.restoring || state.analyzing) return;
  state.restoring = true;
  setAnalysisBusy(true);
  try {
    let snapshot = await DrumWorkspace.load();
    if (!snapshot) {
      // Also recover work submitted by the old version, or from another tab
      // with no local handle. This endpoint is restricted to the owner.
      const { job } = await DrumPro.latest().catch(() => ({ job: null }));
      if (job && ["uploading", "queued", "running", "completed"].includes(job.state)) {
        snapshot = { id: crypto.randomUUID(), jobId: job.id, stage: "running",
          fileName: job.title || "진행 중이던 음악", options: job.options, fileSize: 0 };
      } else {
        const oldProject = JSON.parse(localStorage.getItem("drumscore:last-project") || "null");
        if (oldProject?.totalSteps) snapshot = { id: crypto.randomUUID(), stage: "completed", project: oldProject };
      }
    }
    if (!snapshot) return;
    state.workspaceId = snapshot.id;
    let original;
    try { original = await DrumWorkspace.media(snapshot.id, "original"); } catch {}
    if (original) await loadAudioBlob(original, snapshot.fileName || "저장한 음악", snapshot.fileSize, true);
    state.workspaceId = snapshot.id;
    state.currentJob = snapshot.jobId || null;
    state.jobStage = snapshot.stage || "idle";
    if (snapshot.project?.totalSteps) loadProjectData(snapshot.project, snapshot.fileName, true);
    else {
      state.fileName = snapshot.fileName || "이전 채보 작업";
      state.fileSize = snapshot.fileSize || 0;
      state.bpmManual = snapshot.options?.bpm != null;
      state.bpm = snapshot.options?.bpm || snapshot.project?.bpm || 120;
      state.sensitivity = snapshot.options?.sensitivity || 62;
      state.timeSignature = snapshot.project?.timeSignature || "4/4";
      ui.bpmInput.value = String(state.bpm);
      ui.timeSignature.value = state.timeSignature;
      ui.sensitivity.value = String(state.sensitivity);
      ui.sensitivityValue.textContent = `${state.sensitivity}%`;
    }
    state.fileName = snapshot.fileName || state.fileName;
    state.fileSize = snapshot.fileSize || 0;
    state.analysisMode = snapshot.analysisMode || "pro";
    ui.analysisMode.value = state.analysisMode;
    ui.enginePanel.classList.toggle("is-hidden", state.analysisMode !== "pro");
    ui.quickIsolation.classList.toggle("is-hidden", state.analysisMode === "pro");
    ui.inputIsDrums.checked = snapshot.options?.inputIsDrums === true;
    ui.trackName.textContent = state.fileName;
    ui.uploadPanel.classList.add("is-hidden");
    ui.workspace.classList.remove("is-hidden");
    updateBpmModeLabel();
    let stem;
    if (state.jobStage === "completed") {
      try { stem = await DrumWorkspace.media(snapshot.id, "drums"); } catch {}
      if (stem) await attachStem(stem);
    }
    state.restoring = false;
    if (state.currentJob && (["uploading", "running"].includes(state.jobStage) ||
        (state.jobStage === "completed" && !stem))) {
      await runAnalysis({ resume: true, preserveScore: state.jobStage === "completed" && !!state.proResult });
    } else {
      if (snapshot.activeSource === "drums" && stem) await selectAudioSource("drums");
      if (snapshot.playbackTime && ui.audio.readyState >= 1) ui.audio.currentTime = snapshot.playbackTime;
      showToast("이전 음악과 작업 상태를 자동으로 복구했어요.");
    }
    await saveWorkspace();
  } catch (error) {
    console.warn("Workspace restoration", error);
    showToast(error.message || "이전 작업 연결을 확인해 주세요.");
  } finally {
    state.restoring = false;
    if (!state.analyzing) setAnalysisBusy(false);
    ui.analyzeButton.disabled = state.analyzing || !state.audioBlob;
  }
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function formatBytes(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function sleep(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nextPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

let toastTimer = 0;
function showToast(message) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.classList.add("show");
  toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 2600);
}

function getAudioContext() {
  if (!state.audioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioContext = new AudioCtx();
  }
  if (state.audioContext.state === "suspended") state.audioContext.resume();
  return state.audioContext;
}

function signatureInfo(value = state.timeSignature) {
  if (value === "3/4") return { beats: 3, beatUnit: 4, stepsPerBeat: 4, pulseSteps: 4, stepsPerBar: 12 };
  if (value === "6/8") return { beats: 6, beatUnit: 8, stepsPerBeat: 2, pulseSteps: 4, stepsPerBar: 12 };
  return { beats: 4, beatUnit: 4, stepsPerBeat: 4, pulseSteps: 4, stepsPerBar: 16 };
}

function eventKey(step, instrument) {
  return `${step}:${instrument}`;
}

function addEvent(step, instrument, confidence = 1, source = "manual") {
  if (step < 0 || step >= state.totalSteps) return;
  state.events.set(eventKey(step, instrument), {
    step,
    instrument,
    confidence: clamp(confidence, 0, 1),
    source,
    ...(source === "manual" && state.gridTimes ? { time: state.gridTimes[step] } : {}),
  });
}

function removeEvent(step, instrument) {
  state.events.delete(eventKey(step, instrument));
}

function hasEvent(step, instrument) {
  return state.events.get(eventKey(step, instrument));
}

function eventIsVisible(event) {
  if (!event) return false;
  if (event.source === "manual") return true;
  if (event.source === "ai" && state.difficulty === "exact") return true;
  const info = signatureInfo();
  if (state.difficulty === "exact") return event.confidence >= 0.28;
  if (state.difficulty === "standard") return event.confidence >= 0.45;
  const eighthStep = info.stepsPerBeat === 4 ? event.step % 2 === 0 : true;
  if (event.instrument === "hat" || event.instrument === "ride") {
    return event.confidence >= 0.56 && eighthStep;
  }
  if (["tomHigh", "tomMid", "tomFloor"].includes(event.instrument)) return event.confidence >= 0.72 && eighthStep;
  return event.confidence >= 0.53 && eighthStep;
}

function visibleEvents() {
  return [...state.events.values()].filter(eventIsVisible);
}

function setProgress(percent, title, detail) {
  const rounded = Math.round(percent);
  ui.progressPercent.textContent = `${rounded}%`;
  ui.progressBar.style.width = `${rounded}%`;
  if (title) ui.progressTitle.textContent = title;
  if (detail) ui.progressDetail.textContent = detail;
}

function updateTrackMeta() {
  const duration = state.audioBuffer?.duration || ui.audio.duration || 0;
  const size = state.fileSize ? ` · ${formatBytes(state.fileSize)}` : "";
  ui.trackDetails.textContent = `${formatTime(duration)}${size}${state.isDemo ? " · 샘플" : ""}`;
  ui.duration.textContent = formatTime(duration);
}

function setPlaybackUi(playing) {
  ui.playButton.classList.toggle("playing", playing);
  ui.playButton.setAttribute("aria-label", playing ? "일시정지" : "재생");
  ui.scorePlayButton.classList.toggle("playing", playing);
  ui.scorePlayIcon.textContent = playing ? "Ⅱ" : "▶";
  ui.scorePlayLabel.textContent = playing ? "일시정지" : "재생";
}

function resetPlayback(showMessage = false) {
  ui.audio.pause();
  try {
    ui.audio.currentTime = 0;
  } catch (error) {
    console.warn("Playback position could not be reset", error);
  }
  setPlaybackUi(false);
  cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
  state.currentRenderedStep = -1;
  state.lastClickBeat = -1;
  updatePlayhead();
  if (showMessage) showToast("재생을 정지하고 처음으로 돌아갔어요.");
}

async function loadAudioFile(file) {
  if (state.analyzing || state.restoring) return;
  const extensionOkay = /\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(file.name);
  if (!file.type.startsWith("audio/") && !extensionOkay) {
    showToast("MP3, WAV, M4A 오디오 파일을 선택해 주세요.");
    return;
  }
  if (file.size > 220 * 1024 * 1024) {
    showToast("파일이 너무 큽니다. 220MB 이하의 곡을 선택해 주세요.");
    return;
  }

  state.isDemo = false;
  state.demoTruth = null;
  await loadAudioBlob(file, file.name, file.size);
}

async function loadAudioBlob(blob, name, size = blob.size, restoring = false) {
  if (state.analyzing) return;
  if (!restoring) {
    state.workspaceId = crypto.randomUUID();
    state.currentJob = null;
    state.jobStage = "idle";
    ui.engineStatus.textContent = "음악 준비 중 · 분석을 시작하면 맥에서 계속 처리합니다";
  }
  const loadVersion = ++state.loadVersion;
  const workspaceId = state.workspaceId;
  resetPlayback();
  clearProResult();
  state.audioBlob = blob;
  state.bpmManual = false;
  state.gridOffset = 0;
  ui.gridOffset.value = "0";
  updateBpmModeLabel();
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = URL.createObjectURL(blob);
  ui.audio.src = state.objectUrl;
  ui.audio.load();
  state.fileName = name;
  state.fileSize = size;
  state.audioBuffer = null;
  state.envelopes = null;
  state.events.clear();
  state.totalSteps = 0;
  ui.trackName.textContent = name.replace(/\.[^.]+$/, "");
  ui.trackDetails.textContent = "오디오를 읽고 있어요…";
  ui.uploadPanel.classList.add("is-hidden");
  ui.workspace.classList.remove("is-hidden");
  ui.scoreCard.classList.add("is-hidden");
  ui.progressCard.classList.add("is-hidden");
  ui.waveEmpty.classList.remove("is-hidden");
  ui.analyzeButton.disabled = true;
  ui.playButton.disabled = true;
  ui.stopButton.disabled = true;
  ui.scorePlayButton.disabled = true;
  ui.scoreStopButton.disabled = true;
  window.scrollTo({ top: 0, behavior: "smooth" });

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const ctx = getAudioContext();
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (loadVersion !== state.loadVersion) return;
    if (decoded.duration > 12 * 60 + 1) {
      throw new Error("12분을 넘는 곡은 아직 분석할 수 없어요.");
    }
    state.audioBuffer = decoded;
    drawWaveform(decoded);
    updateTrackMeta();
    ui.waveEmpty.classList.add("is-hidden");
    ui.analyzeButton.disabled = false;
    ui.playButton.disabled = false;
    ui.stopButton.disabled = false;
    ui.scorePlayButton.disabled = false;
    ui.scoreStopButton.disabled = false;
    if (!restoring) {
      await saveWorkspace();
      await DrumWorkspace.putMedia(workspaceId, "original", blob).catch(storageWarning);
    }
    if (loadVersion !== state.loadVersion) return;
    showToast("곡을 준비했어요. ‘드럼 악보 만들기’를 눌러 주세요.");
  } catch (error) {
    if (loadVersion !== state.loadVersion) return;
    console.error(error);
    ui.trackDetails.textContent = "파일을 읽지 못했어요";
    showToast(error.message || "이 오디오 형식은 브라우저에서 열 수 없어요.");
  }
}

function clearProResult() {
  if (state.stemUrl) URL.revokeObjectURL(state.stemUrl);
  state.stemUrl = "";
  state.stemBlob = null;
  state.activeSource = "original";
  state.proResult = null;
  state.removedAiHits.clear();
  state.gridTimes = null;
  ui.stemControls.classList.add("is-hidden");
  ui.analysisReport.classList.add("is-hidden");
  ui.exportPerformance.disabled = true;
  ui.listenOriginal.classList.add("active");
  ui.listenDrums.classList.remove("active");
  ui.listenOriginal.setAttribute("aria-pressed", "true");
  ui.listenOriginal.disabled = false;
  ui.listenDrums.setAttribute("aria-pressed", "false");
  ui.scoreCurrentTime.parentElement.firstChild.textContent = "원곡 ";
}

function updateBpmModeLabel() {
  ui.bpmModeLabel.textContent = state.bpmManual
    ? `BPM 수동 · ${state.bpm} BPM을 유지합니다.`
    : "BPM 자동 · AI가 분리된 드럼에서 박자를 찾습니다.";
  if (!state.bpmManual && state.proResult && !state.proResult.bpm) {
    ui.bpmModeLabel.textContent = "BPM 미검출 · 현재 값은 임시 박자입니다. 직접 맞춰 주세요.";
  }
}

async function connectEngine() {
  ui.connectEngine.disabled = true;
  ui.engineStatus.textContent = "엔진을 확인하고 있어요…";
  try {
    const health = await DrumPro.connect();
    ui.engineStatus.textContent = health.busy ? "연결됨 · 다른 분석 진행 중" : "연결됨 · AI 분석 준비 완료";
    return true;
  } catch (error) {
    ui.engineStatus.textContent = "연결 안 됨 · 맥의 실행 상태와 두 기기의 Tailscale 연결을 확인해 주세요.";
    return false;
  } finally { ui.connectEngine.disabled = false; }
}

function requantizeProResult() {
  if (!state.proResult) return;
  const result = state.proResult;
  const manualEvents = [...state.events.values()].filter(e => e.source === "manual" && Number.isFinite(e.time));
  const beats = state.bpmManual ? [] : result.beatTimes;
  state.gridTimes = DrumTiming.buildGrid(result.duration, state.bpm, beats, state.gridOffset);
  state.gridStart = state.gridTimes[0];
  state.totalSteps = state.gridTimes.length;
  const mapped = DrumTiming.quantize(result.events.filter(e => !state.removedAiHits.has(`${e.time}:${e.instrument}`)), state.gridTimes);
  state.events = new Map(mapped.events.map(event => [eventKey(event.step, event.instrument), event]));
  for (const event of manualEvents) {
    const step = DrumTiming.nearestStep(state.gridTimes, event.time);
    state.events.set(eventKey(step, event.instrument), { ...event, step });
  }
  const messages = [
    `AI 검출 원본 ${result.events.length}타격 · 16분음표 악보 ${mapped.events.length}타격 · 탐/심벌의 세부 종류는 직접 확인해 주세요.`,
    ...(result.warnings || []),
  ];
  if (mapped.collisions) messages.push(`${mapped.collisions}타격이 같은 악보 칸에 겹칩니다. 빠른 연타는 연주 MIDI에서 모두 유지됩니다.`);
  if (mapped.offGrid) messages.push(`${mapped.offGrid}타격의 위치 확인이 필요합니다. 스윙·셋잇단음표·템포/박자 위치 차이일 수 있습니다.`);
  ui.analysisReport.replaceChildren(...messages.map(message => {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    return paragraph;
  }));
  ui.analysisReport.classList.remove("is-hidden");
  ui.exportPerformance.disabled = false;
}

function setAnalysisBusy(busy) {
  for (const control of [ui.audioFile, ui.projectFile, ui.demoButton, ui.analysisMode,
    ui.inputIsDrums, ui.bpmInput, ui.detectBpmButton, ui.gridOffset, ui.timeSignature,
    ui.sensitivity, ui.drumIsolation, ui.connectEngine]) control.disabled = busy;
  ui.cancelAnalysis.classList.toggle("is-hidden", !busy || state.analysisMode !== "pro");
  ui.cancelAnalysis.disabled = false;
  if (!busy) ui.gridOffset.disabled = state.analysisMode !== "pro";
}

async function selectAudioSource(source) {
  const url = source === "drums" ? state.stemUrl : state.objectUrl;
  if (!url || state.activeSource === source) return;
  const time = ui.audio.currentTime || 0;
  const playing = !ui.audio.paused;
  ui.audio.pause();
  const ready = new Promise((resolve, reject) => {
    const cleanup = () => { ui.audio.removeEventListener("loadedmetadata", loaded); ui.audio.removeEventListener("error", failed); };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("오디오를 재생하지 못했습니다.")); };
    ui.audio.addEventListener("loadedmetadata", loaded, { once: true });
    ui.audio.addEventListener("error", failed, { once: true });
  });
  ui.audio.src = url;
  ui.audio.load();
  await ready;
  ui.audio.currentTime = Math.min(time, ui.audio.duration || time);
  state.activeSource = source;
  saveWorkspace();
  for (const [button, active] of [[ui.listenOriginal, source === "original"], [ui.listenDrums, source === "drums"]]) {
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
  ui.scoreCurrentTime.parentElement.firstChild.textContent = source === "drums" ? "드럼 " : "원곡 ";
  updatePlayhead();
  if (playing) {
    await ui.audio.play();
    setPlaybackUi(true);
    state.animationFrame = requestAnimationFrame(animationLoop);
  }
}

function drawWaveform(buffer) {
  const canvas = ui.waveform;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(500, Math.round(rect.width * dpr));
  const height = Math.max(120, Math.round(rect.height * dpr));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);

  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) channels.push(buffer.getChannelData(c));
  const center = height / 2;
  const samplesPerPixel = Math.max(1, Math.floor(buffer.length / width));
  const barWidth = Math.max(1, dpr);

  for (let x = 0; x < width; x += Math.max(1, Math.floor(dpr))) {
    const start = Math.floor((x / width) * buffer.length);
    const end = Math.min(buffer.length, start + samplesPerPixel);
    let peak = 0;
    for (let i = start; i < end; i += Math.max(1, Math.floor(samplesPerPixel / 24))) {
      let value = 0;
      for (const channel of channels) value += Math.abs(channel[i] || 0);
      peak = Math.max(peak, value / channels.length);
    }
    const amp = Math.max(1.2 * dpr, peak * center * 0.82);
    const gradient = ctx.createLinearGradient(0, center - amp, 0, center + amp);
    gradient.addColorStop(0, "rgba(82,214,217,.72)");
    gradient.addColorStop(0.5, "rgba(82,214,217,.28)");
    gradient.addColorStop(1, "rgba(255,91,46,.62)");
    ctx.fillStyle = gradient;
    ctx.fillRect(x, center - amp, barWidth, amp * 2);
  }

  ctx.strokeStyle = "rgba(255,255,255,.08)";
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.moveTo(0, center);
  ctx.lineTo(width, center);
  ctx.stroke();
}

function computeEnvelopes(buffer, onProgress) {
  const sampleRate = buffer.sampleRate;
  // 512 samples is about 11.6 ms at 44.1 kHz. The old 1024-sample hop
  // regularly put fast 16th notes in the wrong score cell.
  const hop = 512;
  const sampleStride = sampleRate > 64000 ? 2 : 1;
  const frameCount = Math.ceil(buffer.length / hop);
  const total = new Float32Array(frameCount);
  const low = new Float32Array(frameCount);
  const mid = new Float32Array(frameCount);
  const high = new Float32Array(frameCount);
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) channels.push(buffer.getChannelData(c));

  const aLow = 1 - Math.exp((-2 * Math.PI * 180) / sampleRate);
  const aMid = 1 - Math.exp((-2 * Math.PI * 2800) / sampleRate);
  const aHigh = 1 - Math.exp((-2 * Math.PI * 4200) / sampleRate);
  const filterStates = channels.map(() => ({ low: 0, mid: 0, high: 0 }));

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hop;
    const end = Math.min(buffer.length, start + hop);
    let sumTotal = 0;
    let sumLow = 0;
    let sumMid = 0;
    let sumHigh = 0;
    let count = 0;
    for (let i = start; i < end; i += sampleStride) {
      for (let channelIndex = 0; channelIndex < channels.length; channelIndex += 1) {
        const x = channels[channelIndex][i] || 0;
        const filter = filterStates[channelIndex];
        filter.low += aLow * (x - filter.low);
        filter.mid += aMid * (x - filter.mid);
        filter.high += aHigh * (x - filter.high);
        const lowBand = filter.low;
        const midBand = filter.mid - filter.low;
        const highBand = x - filter.high;
        // Accumulate channels as energy instead of summing samples first. This
        // avoids losing drums in wide or phase-shifted stereo masters.
        sumTotal += x * x;
        sumLow += lowBand * lowBand;
        sumMid += midBand * midBand;
        sumHigh += highBand * highBand;
        count += 1;
      }
    }
    total[frame] = Math.sqrt(sumTotal / Math.max(1, count));
    low[frame] = Math.sqrt(sumLow / Math.max(1, count));
    mid[frame] = Math.sqrt(sumMid / Math.max(1, count));
    high[frame] = Math.sqrt(sumHigh / Math.max(1, count));
    if (frame % 1200 === 0 && onProgress) onProgress(frame / frameCount);
  }

  const flux = (source) => {
    const result = new Float32Array(source.length);
    let rolling = source[0] || 0;
    let previous = source[0] || 0;
    for (let i = 1; i < source.length; i += 1) {
      rolling = rolling * 0.965 + source[i] * 0.035;
      const fastRise = Math.max(0, source[i] - previous * 0.88);
      const slowRise = Math.max(0, source[i] - rolling * 1.02);
      const relativeRise = (fastRise * 0.68 + slowRise * 0.32) / Math.max(0.00002, rolling);
      result[i] = Math.log1p(relativeRise * 3.4);
      previous = source[i];
    }
    const smoothed = new Float32Array(result.length);
    for (let i = 1; i < result.length - 1; i += 1) {
      smoothed[i] = result[i - 1] * 0.2 + result[i] * 0.62 + result[i + 1] * 0.18;
    }
    return smoothed;
  };

  return {
    sampleRate,
    hop,
    frameRate: sampleRate / hop,
    duration: buffer.duration,
    total: flux(total),
    low: flux(low),
    mid: flux(mid),
    high: flux(high),
    levels: { total, low, mid, high },
  };
}

function createAdaptiveThreshold(array, frameRate, percentile) {
  // Loudness changes dramatically between verses and choruses. Measure a
  // percentile in overlapping local windows instead of using one threshold for
  // the entire song, then interpolate to avoid a boundary discontinuity.
  const spacing = Math.max(16, Math.round(frameRate * 4));
  const radius = Math.max(spacing, Math.round(frameRate * 6));
  const points = [];
  for (let center = 0; center < array.length + spacing; center += spacing) {
    const values = [];
    const start = Math.max(0, center - radius);
    const end = Math.min(array.length, center + radius);
    const stride = Math.max(1, Math.floor((end - start) / 1800));
    for (let frame = start; frame < end; frame += stride) {
      if (array[frame] > 0.00001) values.push(array[frame]);
    }
    values.sort((a, b) => a - b);
    points.push(values.length
      ? values[Math.min(values.length - 1, Math.floor(values.length * percentile))]
      : 0.001);
  }
  return (frame) => {
    const position = Math.max(0, frame) / spacing;
    const left = Math.min(points.length - 1, Math.floor(position));
    const right = Math.min(points.length - 1, left + 1);
    const mix = position - left;
    return Math.max(0.0001, points[left] * (1 - mix) + points[right] * mix);
  };
}

function analysisFeatures(envelopes, sensitivity) {
  const quantile = 0.955 - ((sensitivity - 35) / 50) * 0.145;
  const thresholds = {
    total: createAdaptiveThreshold(envelopes.total, envelopes.frameRate, clamp(quantile - 0.035, 0.72, 0.96)),
    low: createAdaptiveThreshold(envelopes.low, envelopes.frameRate, clamp(quantile, 0.75, 0.97)),
    mid: createAdaptiveThreshold(envelopes.mid, envelopes.frameRate, clamp(quantile, 0.75, 0.97)),
    high: createAdaptiveThreshold(envelopes.high, envelopes.frameRate, clamp(quantile - 0.025, 0.73, 0.96)),
  };
  return { thresholds };
}

function onsetStrengthAt(envelopes, analysis, frame) {
  const ratios = {};
  for (const band of ["total", "low", "mid", "high"]) {
    ratios[band] = peakNear(envelopes[band], frame, 1) / analysis.thresholds[band](frame);
  }
  ratios.combined = Math.max(ratios.total * 1.04, ratios.low, ratios.mid, ratios.high * 0.92);
  return ratios;
}

function findOnsetCandidates(envelopes, analysis, sensitivity) {
  const candidates = [];
  const minimum = 0.86 - ((sensitivity - 35) / 50) * 0.14;
  const refractoryFrames = Math.max(2, Math.round(envelopes.frameRate * 0.026));
  let lastFrame = -refractoryFrames;
  let lastStrength = 0;

  for (let frame = 2; frame < envelopes.total.length - 2; frame += 1) {
    const ratios = onsetStrengthAt(envelopes, analysis, frame);
    if (ratios.combined < minimum) continue;
    const before = onsetStrengthAt(envelopes, analysis, frame - 1).combined;
    const after = onsetStrengthAt(envelopes, analysis, frame + 1).combined;
    if (ratios.combined < before || ratios.combined <= after) continue;

    if (frame - lastFrame < refractoryFrames) {
      if (ratios.combined > lastStrength) {
        candidates[candidates.length - 1] = { frame, ratios };
        lastFrame = frame;
        lastStrength = ratios.combined;
      }
      continue;
    }
    candidates.push({ frame, ratios });
    lastFrame = frame;
    lastStrength = ratios.combined;
  }
  return candidates;
}

function positivePercentile(array, percentile) {
  const values = [];
  const stride = Math.max(1, Math.floor(array.length / 12000));
  for (let i = 0; i < array.length; i += stride) {
    if (array[i] > 0.00001) values.push(array[i]);
  }
  if (!values.length) return 0.001;
  values.sort((a, b) => a - b);
  return values[Math.min(values.length - 1, Math.floor(values.length * percentile))];
}

function estimateBpm(envelopes) {
  // A weighted onset curve is much less likely than the full-band waveform to
  // lock onto a sustained vocal or bass note.
  const env = new Float32Array(envelopes.total.length);
  for (let i = 0; i < env.length; i += 1) {
    env[i] = envelopes.low[i] * 0.36 + envelopes.mid[i] * 0.34 + envelopes.high[i] * 0.2 + envelopes.total[i] * 0.1;
  }
  const frameRate = envelopes.frameRate;
  const threshold = positivePercentile(env, 0.66);
  const minBpm = 55;
  const maxBpm = 210;
  const minLag = Math.floor((60 * frameRate) / maxBpm);
  const maxLag = Math.ceil((60 * frameRate) / minBpm);
  const start = Math.min(env.length - 1, Math.floor(frameRate * 2));
  const sampleLimit = Math.min(env.length, start + Math.floor(frameRate * 240));
  let bestLag = Math.round((60 * frameRate) / 120);
  let bestScore = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    let weight = 0;
    for (let i = start + lag * 2; i < sampleLimit; i += 2) {
      const a = Math.max(0, env[i] - threshold * 0.3);
      if (!a) continue;
      const oneBeat = Math.max(0, env[i - lag] - threshold * 0.3);
      const twoBeats = Math.max(0, env[i - lag * 2] - threshold * 0.3);
      const halfBeatIndex = i - Math.round(lag / 2);
      const halfBeat = halfBeatIndex >= 0 ? Math.max(0, env[halfBeatIndex] - threshold * 0.3) : 0;
      score += a * (oneBeat + twoBeats * 0.42 + halfBeat * 0.16);
      weight += a;
    }
    score /= Math.max(0.001, weight);
    const bpm = (60 * frameRate) / lag;
    const commonTempoBias = 1 + Math.max(0, 1 - Math.abs(bpm - 116) / 105) * 0.025;
    score *= commonTempoBias;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  let bpm = (60 * frameRate) / bestLag;
  if (bpm < 72) bpm *= 2;
  if (bpm > 186 && bpm / 2 >= 72) bpm /= 2;
  return clamp(Math.round(bpm), 45, 260);
}

function findGridStart(envelopes, bpm, candidates = []) {
  const stepDuration = (60 / bpm) / 4;
  const bins = 48;
  const histogram = new Float64Array(bins);
  const maxFrame = Math.floor(envelopes.frameRate * 240);
  for (const candidate of candidates) {
    if (candidate.frame > maxFrame) break;
    const time = candidate.frame / envelopes.frameRate;
    const phase = ((time % stepDuration) + stepDuration) % stepDuration;
    const bin = Math.min(bins - 1, Math.floor((phase / stepDuration) * bins));
    const shellWeight = Math.max(candidate.ratios.low, candidate.ratios.mid);
    histogram[bin] += Math.min(4, candidate.ratios.combined) * (0.65 + Math.min(2, shellWeight) * 0.35);
  }
  let bestBin = 0;
  for (let i = 1; i < bins; i += 1) {
    if (histogram[i] > histogram[bestBin]) bestBin = i;
  }
  // Circular weighted refinement gives sub-bin timing without being pulled by
  // candidates on the opposite edge of the histogram.
  let weightedOffset = 0;
  let weight = 0;
  for (let delta = -2; delta <= 2; delta += 1) {
    const index = (bestBin + delta + bins) % bins;
    weightedOffset += delta * histogram[index];
    weight += histogram[index];
  }
  const refinedBin = bestBin + (weight ? weightedOffset / weight : 0);
  let signedBin = ((refinedBin + bins) % bins);
  if (signedBin > bins / 2) signedBin -= bins;
  return (signedBin / bins) * stepDuration;
}

function peakNear(array, center, radius = 2) {
  let peak = 0;
  for (let i = Math.max(0, center - radius); i <= Math.min(array.length - 1, center + radius); i += 1) {
    peak = Math.max(peak, array[i]);
  }
  return peak;
}

function strongestFrameNear(array, center, radius = 2) {
  let bestFrame = clamp(center, 0, array.length - 1);
  for (let frame = Math.max(0, center - radius); frame <= Math.min(array.length - 1, center + radius); frame += 1) {
    if (array[frame] > array[bestFrame]) bestFrame = frame;
  }
  return bestFrame;
}

function averageFrames(array, start, end) {
  let total = 0;
  let count = 0;
  for (let frame = Math.max(0, start); frame <= Math.min(array.length - 1, end); frame += 1) {
    total += array[frame];
    count += 1;
  }
  return count ? total / count : 0;
}

function transientProfile(envelopes, center, band = "total") {
  const source = envelopes[band] || envelopes.total;
  const frame = strongestFrameNear(source, center, 2);
  const peak = source[frame] || 0;
  const fluxBefore = averageFrames(source, frame - 6, frame - 3);
  const fluxAfter = averageFrames(source, frame + 3, frame + 6);
  const shoulder = (fluxBefore + fluxAfter) / 2;
  const raw = envelopes.levels?.[band] || envelopes.levels?.total;
  if (!raw) return { frame, sharpness: peak / Math.max(0.00001, shoulder), attack: 1, decay: 1 };
  const rawPeak = peakNear(raw, frame, 1);
  const rawBefore = averageFrames(raw, frame - 6, frame - 3);
  const rawAfter = averageFrames(raw, frame + 3, frame + 6);
  return {
    frame,
    sharpness: peak / Math.max(0.00001, shoulder),
    attack: rawPeak / Math.max(0.00001, rawBefore),
    decay: rawPeak / Math.max(0.00001, rawAfter),
  };
}

function spectralEnergyShares(envelopes, frame) {
  const levels = envelopes.levels;
  if (!levels) return { low: 1 / 3, mid: 1 / 3, high: 1 / 3 };
  const low = peakNear(levels.low, frame, 1) ** 2;
  const mid = peakNear(levels.mid, frame, 1) ** 2;
  const high = peakNear(levels.high, frame, 1) ** 2;
  const total = Math.max(0.0000000001, low + mid + high);
  return { low: low / total, mid: mid / total, high: high / total };
}

function transcribe(envelopes, bpm, sensitivity) {
  const info = signatureInfo();
  const stepDuration = (60 / bpm) / 4;
  const analysis = analysisFeatures(envelopes, sensitivity);
  const candidates = findOnsetCandidates(envelopes, analysis, sensitivity);
  state.gridStart = findGridStart(envelopes, bpm, candidates);
  state.totalSteps = Math.max(
    info.stepsPerBar,
    Math.ceil((envelopes.duration - state.gridStart) / stepDuration)
  );
  state.events.clear();

  let lastCrashStep = -info.stepsPerBar;
  let lastShellFrame = -1;
  let lastCymbalFrame = -1;
  const bestCandidateByStep = new Map();
  for (const candidate of candidates) {
    const time = candidate.frame / envelopes.frameRate;
    const step = Math.round((time - state.gridStart) / stepDuration);
    if (step < 0 || step >= state.totalSteps) continue;
    const gridTime = state.gridStart + step * stepDuration;
    const error = Math.abs(time - gridTime) / stepDuration;
    if (error > 0.46) continue;
    const score = candidate.ratios.combined * (1 - error * 0.42);
    const previous = bestCandidateByStep.get(step);
    if (!previous || score > previous.score) bestCandidateByStep.set(step, { ...candidate, score });
  }

  for (const [step, candidate] of [...bestCandidateByStep.entries()].sort((a, b) => a[0] - b[0])) {
    const frame = candidate.frame;
    const profile = transientProfile(envelopes, frame, "total");
    const cymbalProfile = transientProfile(envelopes, frame, "high");
    const spectrum = spectralEnergyShares(envelopes, profile.frame);
    const cymbalSpectrum = spectralEnergyShares(envelopes, cymbalProfile.frame);
    const shellRatios = onsetStrengthAt(envelopes, analysis, profile.frame);
    const cymbalRatios = onsetStrengthAt(envelopes, analysis, cymbalProfile.frame);
    const { total, low, mid, high } = shellRatios;
    const cymbalTotal = cymbalRatios.total;
    const cymbalHigh = cymbalRatios.high;
    const beatPosition = step % info.pulseSteps;
    const barPosition = step % info.stepsPerBar;
    const strict = state.drumIsolation;
    const shellTransient = !strict || profile.sharpness >= 1.28 || (
      profile.sharpness >= 1.12 && profile.attack >= 1.025 && profile.decay >= 1.01
    );
    const cymbalTransient = !strict || cymbalProfile.sharpness >= 1.2 || (
      cymbalProfile.sharpness >= 1.08 && cymbalProfile.attack >= 1.02
    );

    const shellCandidates = [];
    const shellFrameAvailable = !strict || profile.frame !== lastShellFrame;
    const kickMatch = shellFrameAvailable && shellTransient
      && low >= (strict ? 0.98 : 0.86)
      && total >= (strict ? 0.76 : 0.68)
      && low >= mid * (strict ? 0.74 : 0.58)
      && (!strict || (low >= high * 0.68 && spectrum.low >= 0.235));
    if (kickMatch) {
      shellCandidates.push({
        instrument: "kick",
        confidence: clamp(0.34 + (low - 0.72) * 0.36 + Math.min(0.1, (profile.sharpness - 1) * 0.06), 0.3, 0.98),
      });
    }

    const snareMatch = shellFrameAvailable && shellTransient
      && mid >= (strict ? 1.04 : 0.92)
      && total >= (strict ? 0.74 : 0.66)
      && mid >= low * (strict ? 0.66 : 0.54)
      && (!strict || (high >= 0.46 && spectrum.mid >= 0.28 && spectrum.high >= 0.028));
    if (snareMatch) {
      shellCandidates.push({
        instrument: "snare",
        confidence: clamp(0.33 + (mid - 0.75) * 0.34 + Math.min(0.09, (high - 0.45) * 0.05), 0.3, 0.97),
      });
    }

    const likelyTom = shellFrameAvailable && shellTransient
      && mid > (strict ? 1.62 : 1.48)
      && low > (strict ? 0.82 : 0.72)
      && high < (strict ? 1.18 : 1.35)
      && (!strict || (spectrum.low >= 0.22 && spectrum.mid >= 0.3 && spectrum.high < 0.2))
      && beatPosition !== 0;
    if (likelyTom) {
      const tomType = low > 1.1 ? "tomFloor" : mid > 1.9 ? "tomHigh" : "tomMid";
      shellCandidates.push({ instrument: tomType, confidence: clamp(0.42 + (mid - 1.3) * 0.23, 0.42, 0.86) });
    }

    shellCandidates.sort((a, b) => b.confidence - a.confidence);
    const kickCandidate = shellCandidates.find((candidate) => candidate.instrument === "kick");
    const snareCandidate = shellCandidates.find((candidate) => candidate.instrument === "snare");
    if (kickCandidate && snareCandidate && kickCandidate.confidence >= 0.72 && snareCandidate.confidence >= 0.72 && total >= 1.25) {
      addEvent(step, "kick", kickCandidate.confidence, "auto");
      addEvent(step, "snare", snareCandidate.confidence, "auto");
      lastShellFrame = profile.frame;
    } else if (shellCandidates.length) {
      addEvent(step, shellCandidates[0].instrument, shellCandidates[0].confidence, "auto");
      lastShellFrame = profile.frame;
    }

    const cymbalFrameAvailable = !strict || cymbalProfile.frame !== lastCymbalFrame;
    const hatMatch = cymbalFrameAvailable && cymbalTransient
      && cymbalHigh >= (strict ? 0.92 : 0.84)
      && (strict ? cymbalSpectrum.high >= 0.028 : cymbalTotal >= 0.35);
    if (hatMatch) {
      addEvent(step, "hat", clamp(0.31 + (cymbalHigh - 0.67) * 0.33, 0.28, 0.96), "auto");
      lastCymbalFrame = cymbalProfile.frame;
    }

    const likelyCrash = cymbalFrameAvailable && cymbalTransient
      && cymbalHigh > (strict ? 1.88 : 1.72)
      && cymbalTotal > (strict ? 0.82 : 1.34)
      && (!strict || cymbalSpectrum.high >= 0.04)
      && (barPosition <= 1 || beatPosition === 0);
    if (likelyCrash && step - lastCrashStep >= info.pulseSteps * 2) {
      addEvent(step, "crash", clamp(0.48 + (cymbalHigh - 1.45) * 0.22, 0.48, 0.94), "auto");
      lastCrashStep = step;
      lastCymbalFrame = cymbalProfile.frame;
    }
  }

  cleanEvents(info);
}

function cleanEvents(info) {
  for (let step = 0; step < state.totalSteps; step += 1) {
    const hat = hasEvent(step, "hat");
    const crash = hasEvent(step, "crash");
    if (hat && crash && crash.confidence >= hat.confidence) removeEvent(step, "hat");

    const kick = hasEvent(step, "kick");
    const snare = hasEvent(step, "snare");
    if (kick && snare && kick.confidence < 0.43 && snare.confidence > 0.7) removeEvent(step, "kick");
  }

  const hats = [...state.events.values()]
    .filter((event) => event.instrument === "hat")
    .sort((a, b) => a.step - b.step);
  for (let i = 1; i < hats.length - 1; i += 1) {
    if (hats[i].step - hats[i - 1].step === 1 && hats[i + 1].step - hats[i].step === 1) {
      hats[i].confidence = Math.max(hats[i].confidence, 0.5);
    }
  }

  if (!state.drumIsolation && ![...state.events.values()].some((event) => event.instrument === "crash")) {
    const firstKick = [...state.events.values()].find((event) => event.instrument === "kick" && event.step < info.stepsPerBar);
    if (firstKick) addEvent(firstKick.step, "crash", 0.5, "auto");
  }

  if (state.drumIsolation) {
    const automatic = [...state.events.values()].filter((event) => event.source === "auto");
    const tomIds = new Set(["tomHigh", "tomMid", "tomFloor"]);
    for (const event of automatic) {
      if (event.instrument === "crash" || event.confidence >= 0.72) continue;
      const supported = automatic.some((other) => {
        if (other === event) return false;
        const gap = Math.abs(other.step - event.step);
        if (!gap) return false;
        if (tomIds.has(event.instrument) && tomIds.has(other.instrument)) return gap <= 3;
        if (other.instrument !== event.instrument) return false;
        return gap <= info.pulseSteps || gap === info.pulseSteps * 2 || gap === info.stepsPerBar;
      });
      if (!supported) removeEvent(event.step, event.instrument);
    }
  }
}

async function ensureEnvelopes(showInlineProgress = false) {
  if (state.envelopes) return state.envelopes;
  if (!state.audioBuffer) throw new Error("먼저 곡을 선택해 주세요.");
  if (showInlineProgress) setProgress(18, "곡의 리듬을 듣고 있어요", "주파수 대역별 강약을 나누는 중…");
  await nextPaint();
  state.envelopes = computeEnvelopes(state.audioBuffer, (fraction) => {
    if (showInlineProgress && fraction > 0.05) {
      const progress = 18 + fraction * 34;
      ui.progressPercent.textContent = `${Math.round(progress)}%`;
      ui.progressBar.style.width = `${progress}%`;
    }
  });
  return state.envelopes;
}

async function runAnalysis({ resume = false, preserveScore = false } = {}) {
  if ((!resume && !state.audioBlob) || state.analyzing) return;
  state.analyzing = true;
  state.cancelRequested = false;
  if (!resume) state.currentJob = null;
  setAnalysisBusy(true);
  ui.analyzeButton.disabled = true;
  ui.scoreCard.classList.add("is-hidden");
  ui.progressCard.classList.remove("is-hidden");
  setProgress(4, "곡의 리듬을 듣고 있어요", "오디오 데이터를 준비하는 중…");
  ui.progressCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

  try {
    resetPlayback();
    if (state.analysisMode === "pro") {
      const { id, result } = await DrumPro.analyze(state.audioBlob, {
        inputIsDrums: ui.inputIsDrums.checked, sensitivity: state.sensitivity,
        bpm: state.bpmManual ? state.bpm : null,
        title: state.fileName.slice(0, 200), jobId: resume ? state.currentJob : undefined,
      }, (percent, detail) => {
        setProgress(percent, "드럼 분리 · AI 채보", detail);
        if (!preserveScore && percent >= 3 && state.jobStage !== "running") { state.jobStage = "running"; saveWorkspace(); }
        ui.engineStatus.textContent = percent >= 3 ? "맥에서 작업 중 · 다른 창을 봐도 계속됩니다" : detail;
      }, async id => {
        state.currentJob = id;
        if (!preserveScore) state.jobStage = "uploading";
        await saveWorkspace();
      }, () => state.cancelRequested);
      setProgress(99, "드럼 음원을 준비하고 있어요", "맥에서 분리된 드럼을 가져옵니다…");
      const stem = await DrumPro.file(id, "drums.wav", () =>
        setProgress(99, "완료된 드럼 음원 연결 중", "네트워크가 돌아오면 결과를 이어서 가져옵니다"), () => state.cancelRequested);
      if (state.cancelRequested) throw Object.assign(new Error("분석을 취소했습니다."), { jobState: "cancelled" });
      if (state.activeSource !== "original") await selectAudioSource("original");
      if (!preserveScore) {
        clearProResult();
        state.events.clear();
        state.proResult = result;
        state.bpm = state.bpmManual ? state.bpm : result.bpm || state.bpm;
        requantizeProResult();
      }
      await attachStem(stem);
      await DrumWorkspace.putMedia(state.workspaceId, "drums", stem).catch(storageWarning);
    } else {
      if (state.activeSource !== "original") await selectAudioSource("original");
      const envelopes = await ensureEnvelopes(true);
      clearProResult();
      setProgress(65, "타격을 찾고 있어요", "브라우저에서 빠른 채보를 진행합니다…");
      await nextPaint();
      if (!state.bpmManual) state.bpm = estimateBpm(envelopes);
      transcribe(envelopes, state.bpm, state.sensitivity);
    }
    ui.bpmInput.value = String(state.bpm);
    updateBpmModeLabel();

    renderScore();
    state.jobStage = "completed";
    saveLocalProject();
    await saveWorkspace();
    ui.engineStatus.textContent = "채보 완료 · 음악과 악보 자동 저장됨";
    setProgress(100, "악보가 완성됐어요", "원곡을 재생하며 주황색 음표부터 확인해 보세요.");
    await sleep(320);
    ui.progressCard.classList.add("is-hidden");
    ui.scoreCard.classList.remove("is-hidden");
    ui.scoreCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    ui.progressCard.classList.add("is-hidden");
    if (state.totalSteps) ui.scoreCard.classList.remove("is-hidden");
    showToast(error.message || "분석 중 문제가 생겼어요. 다른 파일로 다시 시도해 주세요.");
    ui.engineStatus.textContent = error.message || "분석에 실패했습니다.";
    if (error.jobState || [400, 403, 404, 409, 413, 422].includes(error.status)) {
      state.jobStage = error.jobState || "failed";
    }
    await saveWorkspace();
  } finally {
    state.analyzing = false;
    setAnalysisBusy(false);
    ui.analyzeButton.disabled = !state.audioBlob;
  }
}

function countLabelForStep(step, info) {
  const withinBeat = step % info.stepsPerBeat;
  if (info.stepsPerBeat === 2) return withinBeat === 0 ? String(Math.floor(step / 2) % info.beats + 1) : "+";
  const beat = Math.floor(step / info.stepsPerBeat) % info.beats + 1;
  return [String(beat), "e", "+", "a"][withinBeat] || "";
}

const SVG_NS = "http://www.w3.org/2000/svg";
const STAFF_LINES = [55, 68, 81, 94, 107];

function svgElement(tag, attributes = {}, text = "") {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  if (text) node.textContent = text;
  return node;
}

function svgLine(parent, x1, y1, x2, y2, className) {
  parent.append(svgElement("line", { x1, y1, x2, y2, class: className }));
}

function instrumentById(id) {
  return INSTRUMENTS.find((instrument) => instrument.id === id);
}

function barsPerNotationSystem() {
  if (state.printing) return 4;
  const width = ui.scoreScroll.clientWidth || window.innerWidth;
  if (width >= 1120) return 4;
  if (width >= 680) return 2;
  return 1;
}

function drawNoteHead(parent, x, instrument, event) {
  const lowConfidence = (event.confidence < 0.58 || event.needsTimingReview || ["tom", "cymbal"].includes(instrument.id)) && event.source !== "manual";
  const group = svgElement("g", {
    class: `notation-note ${lowConfidence ? "low-confidence" : ""}`,
    transform: `translate(${x} ${instrument.staffY})`,
  });
  const timing = event.needsTimingReview ? ` · 박자 오차 ${Math.round(event.timingError * 1000)}ms 확인` : "";
  group.append(svgElement("title", {}, `${instrument.name} · 모델 점수 ${Math.round(event.confidence * 100)}%${timing}`));

  if (instrument.mark === "circle") {
    group.append(svgElement("ellipse", { cx: 0, cy: 0, rx: 5.8, ry: 4.1, transform: "rotate(-18)", class: "filled-head" }));
  } else {
    svgLine(group, -5.3, -5.3, 5.3, 5.3, "cross-head");
    svgLine(group, -5.3, 5.3, 5.3, -5.3, "cross-head");
    if (instrument.mark === "open-cross") {
      group.append(svgElement("circle", { cx: 0, cy: 0, r: 8.2, class: "open-hat-ring" }));
    }
  }
  if (instrument.id === "crash") group.append(svgElement("text", { x: 0, y: -10, class: "accent-mark" }, ">"));
  parent.append(group);
}

function drawQuarterRest(parent, x, y, scale = 1, muted = false) {
  const rest = svgElement("g", {
    class: `notation-rest ${muted ? "muted-rest" : ""}`,
    transform: `translate(${x} ${y}) scale(${scale})`,
  });
  rest.append(svgElement("path", {
    d: "M-3 -14 L5 -7 L0 -1 L6 6 L-2 16 L1 7 L-6 1 L-1 -6 L-6 -11 Z",
  }));
  parent.append(rest);
}

function drawFlag(parent, stemX, beamY, count, direction) {
  const sign = direction === "up" ? 1 : -1;
  for (let index = 0; index < count; index += 1) {
    const y = beamY + sign * index * 7;
    const endY = y + sign * 16;
    const side = direction === "up" ? 13 : -13;
    parent.append(svgElement("path", {
      d: `M ${stemX} ${y} Q ${stemX + side} ${y + sign * 4} ${stemX + side * 0.78} ${endY}`,
      class: "note-flag",
    }));
  }
}

function drawVoiceGroup(parent, entries, beatStart, info, direction) {
  if (!entries.length) return;
  const relativeSteps = entries.map((entry) => entry.step - beatStart);
  const isQuarter = entries.length === 1 && relativeSteps[0] === 0;
  const stemXs = entries.map((entry) => entry.x + (direction === "up" ? 5.2 : -5.2));
  const beamY = direction === "up"
    ? Math.max(10, Math.min(...entries.map((entry) => entry.minY)) - 31)
    : Math.min(132, Math.max(...entries.map((entry) => entry.maxY)) + 28);

  entries.forEach((entry, index) => {
    const stemBase = direction === "up" ? entry.maxY + 1 : entry.minY - 1;
    svgLine(parent, stemXs[index], stemBase, stemXs[index], beamY, "note-stem");
  });

  if (entries.length > 1) {
    const first = stemXs[0];
    const last = stemXs[stemXs.length - 1];
    svgLine(parent, first, beamY, last, beamY, "note-beam");
    const secondaryY = beamY + (direction === "up" ? 7 : -7);
    for (let index = 0; index < relativeSteps.length - 1; index += 1) {
      if (relativeSteps[index + 1] - relativeSteps[index] === 1) {
        svgLine(parent, stemXs[index], secondaryY, stemXs[index + 1], secondaryY, "note-beam secondary");
      }
    }
  } else if (!isQuarter) {
    const relative = relativeSteps[0];
    drawFlag(parent, stemXs[0], beamY, relative % 2 !== 0 ? 2 : 1, direction);
  }

  for (const entry of entries) {
    for (const event of entry.events) drawNoteHead(parent, entry.x, instrumentById(event.instrument), event);
  }
}

function drawMeasureNotation(parent, bar, measureX, measureWidth, info, eventsByStep) {
  const measureStart = bar * info.stepsPerBar;
  const noteLeft = measureX + 10;
  const noteRight = measureX + measureWidth - 9;
  const stepWidth = (noteRight - noteLeft) / info.stepsPerBar;
  const xForLocalStep = (localStep) => noteLeft + (localStep + 0.5) * stepWidth;
  const measureEvents = [];
  for (let local = 0; local < info.stepsPerBar; local += 1) {
    const events = eventsByStep.get(measureStart + local) || [];
    measureEvents.push(...events);
    const slot = svgElement("rect", {
      x: noteLeft + local * stepWidth,
      y: 20,
      width: stepWidth,
      height: 113,
      rx: 2,
      class: `note-slot ${local % info.pulseSteps === 0 ? "pulse-start" : ""}`,
      "data-step": measureStart + local,
      "data-bar": bar,
      role: "button",
      tabindex: "0",
      "aria-label": `${bar + 1}마디 ${countLabelForStep(local, info)} 위치에 선택한 악기 입력`,
    });
    if (measureStart + local >= state.totalSteps) slot.classList.add("disabled");
    parent.append(slot);
  }

  parent.append(svgElement("text", { x: measureX + 7, y: 17, class: "measure-number" }, String(bar + 1)));
  if (!measureEvents.length) {
    parent.append(svgElement("rect", {
      x: measureX + measureWidth / 2 - 10,
      y: STAFF_LINES[2] - 1,
      width: 20,
      height: 5,
      class: "whole-rest",
    }));
    return;
  }

  for (let localBeat = 0; localBeat < info.stepsPerBar; localBeat += info.pulseSteps) {
    const beatStart = measureStart + localBeat;
    const upperEntries = [];
    const lowerEntries = [];
    for (let offset = 0; offset < info.pulseSteps; offset += 1) {
      const step = beatStart + offset;
      const events = eventsByStep.get(step) || [];
      const upper = events.filter((event) => instrumentById(event.instrument)?.voice === "upper");
      const lower = events.filter((event) => instrumentById(event.instrument)?.voice === "lower");
      if (upper.length) {
        const ys = upper.map((event) => instrumentById(event.instrument).staffY);
        upperEntries.push({ step, x: xForLocalStep(localBeat + offset), events: upper, minY: Math.min(...ys), maxY: Math.max(...ys) });
      }
      if (lower.length) {
        const ys = lower.map((event) => instrumentById(event.instrument).staffY);
        lowerEntries.push({ step, x: xForLocalStep(localBeat + offset), events: lower, minY: Math.min(...ys), maxY: Math.max(...ys) });
      }
    }

    const beatCenter = xForLocalStep(localBeat + (info.pulseSteps - 1) / 2);
    if (!upperEntries.length && !lowerEntries.length) {
      drawQuarterRest(parent, beatCenter, 80, 0.74);
      continue;
    }
    if (!upperEntries.length) drawQuarterRest(parent, beatCenter, 76, 0.62, true);
    if (!lowerEntries.length && upperEntries.length) drawQuarterRest(parent, beatCenter, 114, 0.43, true);
    drawVoiceGroup(parent, upperEntries, beatStart, info, "up");
    drawVoiceGroup(parent, lowerEntries, beatStart, info, "down");
  }
}

function drawPercussionClef(parent, firstSystem, info) {
  parent.append(svgElement("rect", { x: 19, y: 71, width: 4.5, height: 25, rx: 1, class: "percussion-clef" }));
  parent.append(svgElement("rect", { x: 28, y: 71, width: 4.5, height: 25, rx: 1, class: "percussion-clef" }));
  if (!firstSystem) return;
  parent.append(svgElement("text", { x: 47, y: 76, class: "time-signature" }, String(info.beats)));
  parent.append(svgElement("text", { x: 47, y: 104, class: "time-signature" }, String(info.beatUnit)));
}

function renderScore() {
  const info = signatureInfo();
  const barCount = Math.max(1, Math.ceil(state.totalSteps / info.stepsPerBar));
  const barsPerSystem = barsPerNotationSystem();
  state.barsPerSystem = barsPerSystem;
  const measureWidth = barsPerSystem === 1 ? 420 : barsPerSystem === 2 ? 340 : 300;
  const leftMargin = 66;
  const pages = document.createElement("div");
  pages.className = "notation-pages";

  const eventsByStep = new Map();
  for (const event of visibleEvents()) {
    if (!eventsByStep.has(event.step)) eventsByStep.set(event.step, []);
    eventsByStep.get(event.step).push(event);
  }

  for (let systemStart = 0; systemStart < barCount; systemStart += barsPerSystem) {
    const barsInSystem = Math.min(barsPerSystem, barCount - systemStart);
    const systemWidth = leftMargin + barsInSystem * measureWidth + 14;
    const svg = svgElement("svg", {
      viewBox: `0 0 ${systemWidth} 145`,
      width: systemWidth,
      height: 145,
      class: "notation-system",
      role: "group",
      "aria-label": `${systemStart + 1}마디부터 ${systemStart + barsInSystem}마디까지`,
      "data-system-start": systemStart,
    });
    svg.append(svgElement("rect", { x: 0, y: 0, width: systemWidth, height: 145, class: "score-paper" }));
    for (const y of STAFF_LINES) svgLine(svg, 12, y, systemWidth - 11, y, "staff-line");
    svgLine(svg, 12, STAFF_LINES[0], 12, STAFF_LINES[4], "system-barline");
    drawPercussionClef(svg, systemStart === 0, info);

    if (systemStart === 0) {
      svg.append(svgElement("text", { x: leftMargin + measureWidth - 9, y: 17, class: "tempo-mark", "text-anchor": "end" }, `♩ = ${Math.round(state.bpm)}`));
    }

    for (let position = 0; position < barsInSystem; position += 1) {
      const bar = systemStart + position;
      const measureX = leftMargin + position * measureWidth;
      if (position > 0) svgLine(svg, measureX, STAFF_LINES[0], measureX, STAFF_LINES[4], "measure-barline");
      drawMeasureNotation(svg, bar, measureX, measureWidth, info, eventsByStep);
    }

    const endX = leftMargin + barsInSystem * measureWidth;
    svgLine(svg, endX, STAFF_LINES[0], endX, STAFF_LINES[4], "end-barline");
    pages.append(svg);
  }

  ui.scoreScroll.replaceChildren(pages);
  ui.scoreCard.classList.toggle("editing", state.editing);
  state.currentRenderedStep = -1;
  updateCurrentScoreStep(ui.audio.currentTime || 0);
  updateScoreStats();
}

function rerenderMeasure() {
  const scrollLeft = ui.scoreScroll.scrollLeft;
  const scrollTop = ui.scoreScroll.scrollTop;
  renderScore();
  ui.scoreScroll.scrollLeft = scrollLeft;
  ui.scoreScroll.scrollTop = scrollTop;
}

function updateScoreStats() {
  const info = signatureInfo();
  ui.resultBpm.textContent = String(Math.round(state.bpm));
  ui.resultBars.textContent = String(Math.max(1, Math.ceil(state.totalSteps / info.stepsPerBar)));
  ui.resultHits.textContent = String(visibleEvents().length);
}

function updatePlayhead() {
  const duration = ui.audio.duration || state.audioBuffer?.duration || 0;
  const fraction = duration ? clamp(ui.audio.currentTime / duration, 0, 1) : 0;
  ui.playhead.style.left = `${fraction * 100}%`;
  ui.currentTime.textContent = formatTime(ui.audio.currentTime);
  ui.scoreCurrentTime.textContent = formatTime(ui.audio.currentTime);
  updateCurrentScoreStep(ui.audio.currentTime);
}

function updateCurrentScoreStep(time) {
  if (!state.totalSteps) return;
  const info = signatureInfo();
  const stepDuration = (60 / state.bpm) / 4;
  const step = state.gridTimes
    ? DrumTiming.nearestStep(state.gridTimes, time)
    : Math.floor((time - state.gridStart + stepDuration * 0.35) / stepDuration);
  if (step === state.currentRenderedStep) return;
  for (const current of $$(".note-slot.current-step", ui.scoreScroll)) current.classList.remove("current-step");
  state.currentRenderedStep = step;
  if (step >= 0 && step < state.totalSteps) {
    for (const cell of $$(`.note-slot[data-step="${step}"]`, ui.scoreScroll)) cell.classList.add("current-step");
    const first = $(`.note-slot[data-step="${step}"]`, ui.scoreScroll);
    if (first && !elementMostlyVisible(first, ui.scoreScroll)) {
      first.closest(".notation-system")?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }

  if (state.metronome && !ui.audio.paused && step >= 0 && step % info.pulseSteps === 0) {
    const beat = Math.floor(step / info.pulseSteps);
    if (beat !== state.lastClickBeat) {
      state.lastClickBeat = beat;
      playMetronome(step % info.stepsPerBar === 0);
    }
  }
}

function elementMostlyVisible(element, container) {
  const a = element.getBoundingClientRect();
  const b = container.getBoundingClientRect();
  return a.top >= b.top + 10 && a.bottom <= b.bottom - 10 && a.left >= b.left && a.right <= b.right;
}

function animationLoop() {
  updatePlayhead();
  if (!ui.audio.paused) state.animationFrame = requestAnimationFrame(animationLoop);
}

function playMetronome(accent = false) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = accent ? 1250 : 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.055);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.06);
}

function playInstrument(instrument) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  if (instrument === "kick") {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(130, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.14);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
    return;
  }

  const isTom = instrument.startsWith("tom");
  const length = instrument === "crash" ? 0.42 : instrument === "openHat" ? 0.28 : instrument === "ride" ? 0.23 : instrument === "hat" ? 0.07 : 0.15;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const decay = Math.pow(1 - i / data.length, instrument === "crash" ? 1.6 : 3.4);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = instrument === "snare" || isTom ? "bandpass" : "highpass";
  const tomFrequency = instrument === "tomHigh" ? 430 : instrument === "tomFloor" ? 190 : 290;
  filter.frequency.value = isTom ? tomFrequency : instrument === "snare" ? 1750 : 5200;
  gain.gain.value = instrument === "crash" ? 0.13 : 0.18;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(now);
}

function buildDemoPattern(bpm = 112, bars = 8) {
  const stepsPerBar = 16;
  const totalSteps = bars * stepsPerBar;
  const events = [];
  const push = (step, instrument, confidence = 0.9) => events.push({ step, instrument, confidence });

  for (let bar = 0; bar < bars; bar += 1) {
    const base = bar * stepsPerBar;
    for (let step = 0; step < stepsPerBar; step += 2) push(base + step, "hat", step % 4 === 0 ? 0.93 : 0.74);
    push(base, "kick", 0.96);
    push(base + 8, "kick", 0.91);
    if (bar % 2 === 1) push(base + 6, "kick", 0.7);
    if (bar === 2 || bar === 6) push(base + 11, "kick", 0.66);
    push(base + 4, "snare", 0.97);
    push(base + 12, "snare", 0.97);
    if (bar === 0 || bar === 4) push(base, "crash", 0.94);
  }
  push(totalSteps - 4, "tomHigh", 0.84);
  push(totalSteps - 3, "tomMid", 0.78);
  push(totalSteps - 2, "tomFloor", 0.87);
  push(totalSteps - 1, "snare", 0.9);
  return { bpm, totalSteps, events };
}

function createDemoWav(pattern) {
  const sampleRate = 22050;
  const stepDuration = (60 / pattern.bpm) / 4;
  const duration = pattern.totalSteps * stepDuration + 0.7;
  const samples = new Float32Array(Math.ceil(duration * sampleRate));
  let seed = 928371;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const addKick = (start) => {
    const length = Math.floor(sampleRate * 0.26);
    let phase = 0;
    for (let i = 0; i < length && start + i < samples.length; i += 1) {
      const t = i / sampleRate;
      const frequency = 125 * Math.exp(-t * 9) + 42;
      phase += (2 * Math.PI * frequency) / sampleRate;
      samples[start + i] += Math.sin(phase) * Math.exp(-t * 17) * 0.82;
    }
  };

  const addNoise = (start, lengthSeconds, amount, bright = false) => {
    const length = Math.floor(sampleRate * lengthSeconds);
    let previous = 0;
    for (let i = 0; i < length && start + i < samples.length; i += 1) {
      const t = i / sampleRate;
      const noise = random() * 2 - 1;
      const shaped = bright ? noise - previous * 0.8 : noise * 0.72 + previous * 0.28;
      previous = noise;
      samples[start + i] += shaped * Math.exp(-t * (bright ? 28 : 18)) * amount;
    }
  };

  for (const event of pattern.events) {
    const start = Math.floor(event.step * stepDuration * sampleRate);
    if (event.instrument === "kick") addKick(start);
    if (event.instrument === "snare") addNoise(start, 0.2, 0.52, false);
    if (event.instrument === "hat") addNoise(start, 0.07, 0.27, true);
    if (event.instrument === "openHat") addNoise(start, 0.26, 0.28, true);
    if (event.instrument === "crash") addNoise(start, 0.62, 0.34, true);
    if (event.instrument.startsWith("tom")) {
      addKick(start);
      addNoise(start, 0.13, 0.18, false);
    }
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (offset, text) => [...text].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (const sample of samples) {
    view.setInt16(offset, clamp(sample, -1, 1) * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function loadDemo() {
  if (state.analyzing) return;
  const pattern = buildDemoPattern();
  state.isDemo = true;
  state.demoTruth = pattern;
  const blob = createDemoWav(pattern);
  await loadAudioBlob(blob, "펑키 록 샘플.wav", blob.size);
  state.isDemo = true;
  state.demoTruth = pattern;
  state.bpm = pattern.bpm;
  state.bpmManual = false;
  ui.bpmInput.value = String(pattern.bpm);
  await runAnalysis();
}

function projectData() {
  return {
    format: "drumscore-project",
    version: 4,
    title: state.fileName.replace(/\.[^.]+$/, "") || "드럼 악보",
    createdAt: new Date().toISOString(),
    bpm: state.bpm,
    timeSignature: state.timeSignature,
    gridStart: state.gridStart,
    totalSteps: state.totalSteps,
    difficulty: state.difficulty,
    sensitivity: state.sensitivity,
    drumIsolation: state.drumIsolation,
    events: [...state.events.values()],
    proResult: state.proResult,
    gridTimes: state.gridTimes,
    gridOffset: state.gridOffset,
    bpmManual: state.bpmManual,
    removedAiHits: [...state.removedAiHits],
  };
}

function saveLocalProject() {
  try {
    localStorage.setItem("drumscore:last-project", JSON.stringify(projectData()));
  } catch (error) {
    console.warn("Local save unavailable", error);
  }
  saveWorkspace();
}

function loadProjectData(project, fileName = "저장한 드럼 악보", preserveAudio = false) {
  if (!project || project.format !== "drumscore-project" || !Array.isArray(project.events)) {
    throw new Error("드럼스코어 프로젝트 파일이 아닙니다.");
  }
  resetPlayback();
  ++state.loadVersion;
  clearProResult();
  if (!preserveAudio) {
    if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
    state.objectUrl = "";
    state.audioBlob = null;
    state.audioBuffer = null;
    state.workspaceId = crypto.randomUUID();
    state.currentJob = null;
    state.jobStage = "completed";
  }
  state.fileName = typeof project.title === "string" ? project.title : fileName;
  if (!preserveAudio) state.fileSize = 0;
  state.envelopes = null;
  state.isDemo = false;
  state.demoTruth = null;
  state.bpm = clamp(Number(project.bpm) || 120, 45, 260);
  state.timeSignature = ["4/4", "3/4", "6/8"].includes(project.timeSignature) ? project.timeSignature : "4/4";
  state.gridStart = Number(project.gridStart) || 0;
  state.totalSteps = clamp(Math.floor(Number(project.totalSteps) || 16), 1, 20000);
  state.difficulty = ["easy", "standard", "exact"].includes(project.difficulty) ? project.difficulty : "standard";
  state.sensitivity = clamp(Number(project.sensitivity) || 62, 35, 85);
  state.drumIsolation = project.drumIsolation !== false;
  state.bpmManual = project.bpmManual === true;
  state.gridOffset = clamp(Number(project.gridOffset) || 0, -10, 10);
  if (Array.isArray(project.gridTimes) && project.gridTimes.length === state.totalSteps &&
      project.gridTimes.every((t, i, times) => Number.isFinite(t) && (i === 0 || t > times[i - 1]))) {
    state.gridTimes = project.gridTimes;
  }
  if (project.proResult) state.proResult = DrumPro.validate(project.proResult);
  state.removedAiHits = new Set(Array.isArray(project.removedAiHits) ? project.removedAiHits.filter(v => typeof v === "string").slice(0, 50000) : []);
  state.events.clear();
  for (const event of project.events) {
    if (!event || typeof event !== "object") continue;
    const instrumentId = project.version < 4 && event.instrument === "tom" ? "tomMid" : event.instrument;
    if (INSTRUMENTS.some((item) => item.id === instrumentId)) {
      const step = Number(event.step);
      if (!Number.isInteger(step) || step < 0 || step >= state.totalSteps) continue;
      addEvent(step, instrumentId, Number.isFinite(event.confidence) ? event.confidence : 1, event.source || "manual");
      const restored = hasEvent(step, instrumentId);
      for (const key of ["time", "velocity", "timingError"]) if (Number.isFinite(event[key])) restored[key] = event[key];
      restored.needsTimingReview = event.needsTimingReview === true;
    }
  }
  if (!preserveAudio) { ui.audio.removeAttribute("src"); ui.audio.load(); }
  ui.currentTime.textContent = "0:00";
  ui.duration.textContent = "0:00";
  ui.playhead.style.left = "0%";
  ui.trackName.textContent = state.fileName;
  ui.trackDetails.textContent = "저장한 프로젝트 악보 · 음원은 포함되지 않습니다";
  ui.uploadPanel.classList.add("is-hidden");
  ui.workspace.classList.remove("is-hidden");
  ui.waveEmpty.textContent = "원곡 오디오가 연결되지 않은 프로젝트입니다.";
  ui.waveEmpty.classList.remove("is-hidden");
  const context = ui.waveform.getContext("2d");
  context.clearRect(0, 0, ui.waveform.width, ui.waveform.height);
  ui.playButton.disabled = true;
  ui.stopButton.disabled = true;
  ui.scorePlayButton.disabled = true;
  ui.scoreStopButton.disabled = true;
  ui.analyzeButton.disabled = true;
  ui.bpmInput.value = String(state.bpm);
  ui.gridOffset.value = String(state.gridOffset * 1000);
  updateBpmModeLabel();
  ui.exportPerformance.disabled = !state.proResult;
  if (state.proResult) {
    ui.analysisReport.textContent = `저장한 AI 검출 원본 ${state.proResult.events.length}타격. ${state.proResult.warnings.join(" ")}`;
    ui.analysisReport.classList.remove("is-hidden");
  }
  ui.timeSignature.value = state.timeSignature;
  ui.sensitivity.value = String(state.sensitivity);
  ui.sensitivityValue.textContent = `${state.sensitivity}%`;
  ui.drumIsolation.checked = state.drumIsolation;
  for (const button of $$('[data-difficulty]', ui.difficultyGroup)) {
    button.classList.toggle("active", button.dataset.difficulty === state.difficulty);
  }
  ui.difficultyHelp.textContent = DIFFICULTY_HELP[state.difficulty];
  renderScore();
  ui.scoreCard.classList.remove("is-hidden");
  if (preserveAudio && state.audioBuffer) {
    updateTrackMeta();
    drawWaveform(state.audioBuffer);
    ui.waveEmpty.classList.add("is-hidden");
    for (const control of [ui.playButton, ui.stopButton, ui.scorePlayButton, ui.scoreStopButton]) control.disabled = false;
  }
  saveWorkspace();
  showToast("프로젝트 악보를 열었어요.");
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function safeBaseName() {
  return (state.fileName.replace(/\.[^.]+$/, "") || "drum-score")
    .replace(/[\\/:*?"<>|]/g, "-")
    .trim();
}

function exportProject() {
  const json = JSON.stringify(projectData(), null, 2);
  downloadBlob(new Blob([json], { type: "application/json" }), `${safeBaseName()}.drumscore.json`);
}

function escapeXml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function musicXmlNoteValue(duration) {
  if (duration >= 4) return { type: "quarter", dots: "" };
  if (duration === 3) return { type: "eighth", dots: "<dot/>" };
  if (duration === 2) return { type: "eighth", dots: "" };
  return { type: "16th", dots: "" };
}

function musicXmlVoiceBody(byStep, measureStart, info, voice, stem) {
  const onsets = [];
  for (let local = 0; local < info.stepsPerBar; local += 1) {
    const hits = (byStep.get(measureStart + local) || [])
      .filter((event) => instrumentById(event.instrument)?.voice === voice)
      .sort((a, b) => INSTRUMENTS.findIndex((item) => item.id === a.instrument) - INSTRUMENTS.findIndex((item) => item.id === b.instrument));
    if (hits.length) onsets.push({ local, hits });
  }

  let cursor = 0;
  let body = "";
  for (let index = 0; index < onsets.length; index += 1) {
    const onset = onsets[index];
    if (onset.local > cursor) body += `<forward><duration>${onset.local - cursor}</duration></forward>`;
    const nextLocal = onsets[index + 1]?.local ?? info.stepsPerBar;
    const duration = Math.max(1, Math.min(info.pulseSteps, nextLocal - onset.local));
    const value = musicXmlNoteValue(duration);
    onset.hits.forEach((event, hitIndex) => {
      const instrument = instrumentById(event.instrument);
      const notehead = instrument.mark.includes("cross") ? "x" : "normal";
      body += `<note>${hitIndex ? "<chord/>" : ""}<unpitched><display-step>${instrument.displayStep}</display-step><display-octave>${instrument.displayOctave}</display-octave></unpitched><duration>${duration}</duration><instrument id="P1-${instrument.id}"/><voice>${voice === "upper" ? 1 : 2}</voice><type>${value.type}</type>${value.dots}<stem>${stem}</stem><notehead>${notehead}</notehead></note>`;
    });
    cursor = onset.local + duration;
  }
  if (cursor < info.stepsPerBar) body += `<forward><duration>${info.stepsPerBar - cursor}</duration></forward>`;
  return { body, hasEvents: onsets.length > 0 };
}

function exportMusicXml() {
  const info = signatureInfo();
  const bars = Math.ceil(state.totalSteps / info.stepsPerBar);
  const events = visibleEvents();
  const byStep = new Map();
  for (const event of events) {
    if (!byStep.has(event.step)) byStep.set(event.step, []);
    byStep.get(event.step).push(event);
  }

  let measures = "";
  for (let bar = 0; bar < bars; bar += 1) {
    let body = "";
    if (bar === 0) {
      body += `<attributes><divisions>4</divisions><key><fifths>0</fifths></key><time><beats>${info.beats}</beats><beat-type>${info.beatUnit}</beat-type></time><clef><sign>percussion</sign><line>2</line></clef></attributes>`;
      body += `<direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${Math.round(state.bpm)}</per-minute></metronome></direction-type><sound tempo="${Math.round(state.bpm)}"/></direction>`;
    }
    const measureStart = bar * info.stepsPerBar;
    const upper = musicXmlVoiceBody(byStep, measureStart, info, "upper", "up");
    const lower = musicXmlVoiceBody(byStep, measureStart, info, "lower", "down");
    body += upper.body;
    if (lower.hasEvents) body += `<backup><duration>${info.stepsPerBar}</duration></backup>${lower.body}`;
    measures += `<measure number="${bar + 1}">${body}</measure>`;
  }

  const scoreInstruments = INSTRUMENTS.map((item) => `<score-instrument id="P1-${item.id}"><instrument-name>${escapeXml(item.name)}</instrument-name></score-instrument>`).join("");
  const midiInstruments = INSTRUMENTS.map((item) => `<midi-instrument id="P1-${item.id}"><midi-channel>10</midi-channel><midi-unpitched>${item.midi + 1}</midi-unpitched></midi-instrument>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?><!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd"><score-partwise version="4.0"><work><work-title>${escapeXml(safeBaseName())}</work-title></work><part-list><score-part id="P1"><part-name>Drumset</part-name>${scoreInstruments}${midiInstruments}</score-part></part-list><part id="P1">${measures}</part></score-partwise>`;
  downloadBlob(new Blob([xml], { type: "application/vnd.recordare.musicxml+xml" }), `${safeBaseName()}.musicxml`);
}

function variableLength(value) {
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function pushUint32(target, value) {
  target.push((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

function exportMidi(performance = false) {
  if (performance && !state.proResult) return;
  const ppq = 480;
  const ticksPerStep = 120;
  const microseconds = Math.round(60000000 / state.bpm);
  const info = signatureInfo();
  const denominatorPower = Math.log2(info.beatUnit);
  const track = [];
  track.push(0x00, 0xff, 0x51, 0x03, (microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff);
  track.push(0x00, 0xff, 0x58, 0x04, info.beats, denominatorPower, 24, 8);
  const midiEvents = [];
  for (const event of performance ? state.proResult.events : visibleEvents()) {
    const instrument = INSTRUMENTS.find((item) => item.id === event.instrument);
    const tick = performance ? Math.round(event.time * ppq * 1000000 / microseconds) : event.step * ticksPerStep;
    const velocity = clamp(Math.round(event.velocity || 48 + event.confidence * 76), 1, 127);
    midiEvents.push({ tick, order: 1, data: [0x99, instrument.midi, velocity] });
    midiEvents.push({ tick: tick + 42, order: 0, data: [0x89, instrument.midi, 0] });
  }
  midiEvents.sort((a, b) => a.tick - b.tick || a.order - b.order);
  let previousTick = 0;
  for (const event of midiEvents) {
    track.push(...variableLength(event.tick - previousTick), ...event.data);
    previousTick = event.tick;
  }
  track.push(0x00, 0xff, 0x2f, 0x00);

  const bytes = [0x4d, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, 0x01, (ppq >> 8) & 0xff, ppq & 0xff];
  bytes.push(0x4d, 0x54, 0x72, 0x6b);
  pushUint32(bytes, track.length);
  const file = new Uint8Array(bytes.length + track.length);
  file.set(bytes);
  file.set(track, bytes.length);
  downloadBlob(new Blob([file], { type: "audio/midi" }), `${safeBaseName()}${performance ? "-AI-performance" : "-score"}.mid`);
}

async function autoDetectBpm() {
  if ((!state.audioBuffer && !state.proResult) || state.analyzing) return;
  const oldText = ui.detectBpmButton.textContent;
  ui.detectBpmButton.textContent = "…";
  ui.detectBpmButton.disabled = true;
  try {
    state.bpmManual = false;
    if (state.proResult) {
      if (state.proResult.bpm) state.bpm = state.proResult.bpm;
      ui.bpmInput.value = String(state.bpm);
      requantizeProResult();
      renderScore();
      saveLocalProject();
      showToast("AI가 검출한 박자 지도로 돌아갔어요.");
      return;
    }
    if (state.analysisMode === "pro") {
      showToast("다음 AI 채보에서 BPM을 자동으로 찾습니다.");
      return;
    }
    const envelopes = await ensureEnvelopes(false);
    const bpm = estimateBpm(envelopes);
    state.bpm = bpm;
    ui.bpmInput.value = String(bpm);
    if (state.totalSteps) {
      renderScore();
      saveLocalProject();
    }
    showToast(`예상 속도는 ${bpm} BPM이에요.`);
  } catch (error) {
    showToast(error.message || "BPM을 찾지 못했어요.");
  } finally {
    updateBpmModeLabel();
    ui.detectBpmButton.textContent = oldText;
    ui.detectBpmButton.disabled = false;
  }
}

ui.audioFile.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) loadAudioFile(file);
  event.target.value = "";
});

ui.projectFile.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const project = JSON.parse(await file.text());
    loadProjectData(project, file.name);
  } catch (error) {
    showToast(error.message || "프로젝트 파일을 열지 못했어요.");
  }
  event.target.value = "";
});

for (const eventName of ["dragenter", "dragover"]) {
  ui.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    ui.dropZone.classList.add("dragging");
  });
}

for (const eventName of ["dragleave", "drop"]) {
  ui.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    ui.dropZone.classList.remove("dragging");
  });
}

ui.dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file) loadAudioFile(file);
});

ui.demoButton.addEventListener("click", loadDemo);
ui.helpButton.addEventListener("click", () => ui.helpDialog.showModal());
ui.analyzeButton.addEventListener("click", runAnalysis);
ui.detectBpmButton.addEventListener("click", autoDetectBpm);
ui.connectEngine.addEventListener("click", connectEngine);
ui.analysisMode.addEventListener("change", () => {
  state.analysisMode = ui.analysisMode.value;
  ui.enginePanel.classList.toggle("is-hidden", state.analysisMode !== "pro");
  ui.quickIsolation.classList.toggle("is-hidden", state.analysisMode === "pro");
  ui.gridOffset.disabled = state.analysisMode !== "pro";
});
ui.cancelAnalysis.addEventListener("click", () => {
  state.cancelRequested = true;
  ui.cancelAnalysis.disabled = true;
  setProgress(0, "분석을 취소하고 있어요", "현재 오디오 구간 처리가 끝나면 취소됩니다.");
  if (state.currentJob) DrumPro.cancel(state.currentJob).catch(error => showToast(error.message));
});
ui.listenOriginal.addEventListener("click", () => selectAudioSource("original").catch(error => showToast(error.message)));
ui.listenDrums.addEventListener("click", () => selectAudioSource("drums").catch(error => showToast(error.message)));
ui.downloadStem.addEventListener("click", () => {
  if (state.stemBlob) downloadBlob(state.stemBlob, `${safeBaseName()}-drums.wav`);
});
ui.gridOffset.addEventListener("change", () => {
  state.gridOffset = clamp(Number(ui.gridOffset.value) || 0, -10000, 10000) / 1000;
  ui.gridOffset.value = String(state.gridOffset * 1000);
  if (state.proResult) {
    requantizeProResult();
    renderScore();
    saveLocalProject();
  }
});

ui.playButton.addEventListener("click", async () => {
  if (!ui.audio.src) return;
  if (ui.audio.paused) {
    try {
      await ui.audio.play();
      if (ui.audio.paused) return;
      setPlaybackUi(true);
      cancelAnimationFrame(state.animationFrame);
      state.animationFrame = requestAnimationFrame(animationLoop);
    } catch (error) {
      showToast("재생을 시작하지 못했어요. 한 번 더 눌러 주세요.");
    }
  } else {
    ui.audio.pause();
  }
});

ui.stopButton.addEventListener("click", () => resetPlayback(true));
ui.scorePlayButton.addEventListener("click", () => ui.playButton.click());
ui.scoreStopButton.addEventListener("click", () => resetPlayback(true));

ui.audio.addEventListener("pause", () => {
  setPlaybackUi(false);
  cancelAnimationFrame(state.animationFrame);
  state.animationFrame = 0;
});

ui.audio.addEventListener("ended", () => {
  setPlaybackUi(false);
  state.currentRenderedStep = -1;
  state.lastClickBeat = -1;
  updatePlayhead();
});

ui.audio.addEventListener("loadedmetadata", updateTrackMeta);
ui.audio.addEventListener("timeupdate", updatePlayhead);
ui.rewindButton.addEventListener("click", () => {
  ui.audio.currentTime = Math.max(0, ui.audio.currentTime - 5);
  updatePlayhead();
});
ui.forwardButton.addEventListener("click", () => {
  ui.audio.currentTime = Math.min(ui.audio.duration || 0, ui.audio.currentTime + 5);
  updatePlayhead();
});
ui.volume.addEventListener("input", () => {
  ui.audio.volume = Number(ui.volume.value);
});
ui.audio.volume = Number(ui.volume.value);

ui.waveform.parentElement.addEventListener("click", (event) => {
  if (!ui.audio.duration) return;
  const rect = ui.waveform.getBoundingClientRect();
  const fraction = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  ui.audio.currentTime = fraction * ui.audio.duration;
  updatePlayhead();
});

ui.bpmInput.addEventListener("change", () => {
  state.bpm = clamp(Number(ui.bpmInput.value) || 120, 45, 260);
  state.bpmManual = true;
  ui.bpmInput.value = String(state.bpm);
  updateBpmModeLabel();
  if (state.proResult) requantizeProResult();
  if (state.totalSteps) {
    renderScore();
    saveLocalProject();
  }
});

ui.timeSignature.addEventListener("change", () => {
  state.timeSignature = ui.timeSignature.value;
  if (state.totalSteps) {
    renderScore();
    saveLocalProject();
  }
});

ui.sensitivity.addEventListener("input", () => {
  state.sensitivity = Number(ui.sensitivity.value);
  ui.sensitivityValue.textContent = `${state.sensitivity}%`;
});

ui.drumIsolation.addEventListener("change", () => {
  state.drumIsolation = ui.drumIsolation.checked;
  if (state.totalSteps) saveLocalProject();
});

ui.difficultyGroup.addEventListener("click", (event) => {
  const button = event.target.closest("[data-difficulty]");
  if (!button) return;
  state.difficulty = button.dataset.difficulty;
  for (const item of $$('[data-difficulty]', ui.difficultyGroup)) item.classList.toggle("active", item === button);
  ui.difficultyHelp.textContent = DIFFICULTY_HELP[state.difficulty];
  if (state.totalSteps) {
    renderScore();
    saveLocalProject();
  }
});

ui.instrumentPalette.addEventListener("click", (event) => {
  const button = event.target.closest("[data-inst]");
  if (!button) return;
  state.selectedInstrument = button.dataset.inst;
  for (const item of $$('[data-inst]', ui.instrumentPalette)) item.classList.toggle("active", item === button);
  playInstrument(state.selectedInstrument);
});

ui.editToggle.addEventListener("click", () => {
  state.editing = !state.editing;
  ui.editToggle.classList.toggle("active", state.editing);
  ui.editToggle.setAttribute("aria-pressed", String(state.editing));
  ui.scoreCard.classList.toggle("editing", state.editing);
  showToast(state.editing ? "편집 모드가 켜졌어요." : "편집 모드를 껐어요.");
});

ui.metronomeToggle.addEventListener("click", () => {
  state.metronome = !state.metronome;
  state.lastClickBeat = -1;
  ui.metronomeToggle.classList.toggle("active", state.metronome);
  ui.metronomeToggle.setAttribute("aria-pressed", String(state.metronome));
  if (state.metronome) playMetronome(true);
});

function toggleSelectedInstrumentAtStep(step) {
  const instrument = state.selectedInstrument;
  const existing = hasEvent(step, instrument);
  if (existing) {
    if (existing.source === "ai") {
      for (const raw of state.proResult?.events || []) {
        if (raw.instrument === instrument && DrumTiming.nearestStep(state.gridTimes, raw.time) === step) {
          state.removedAiHits.add(`${raw.time}:${instrument}`);
        }
      }
    }
    removeEvent(step, instrument);
  } else {
    addEvent(step, instrument, 1, "manual");
    playInstrument(instrument);
  }
  rerenderMeasure();
  saveLocalProject();
}

ui.scoreScroll.addEventListener("click", (event) => {
  const slot = event.target.closest(".note-slot");
  if (!slot || slot.classList.contains("disabled") || !state.editing) return;
  toggleSelectedInstrumentAtStep(Number(slot.dataset.step));
});

ui.scoreScroll.addEventListener("keydown", (event) => {
  const slot = event.target.closest(".note-slot");
  if (!slot || !["Enter", " "].includes(event.key) || slot.classList.contains("disabled") || !state.editing) return;
  event.preventDefault();
  event.stopPropagation();
  toggleSelectedInstrumentAtStep(Number(slot.dataset.step));
});

ui.exportButton.addEventListener("click", () => {
  const open = ui.exportPopover.classList.toggle("is-hidden") === false;
  ui.exportButton.setAttribute("aria-expanded", String(open));
});

ui.exportPopover.addEventListener("click", (event) => {
  const button = event.target.closest("[data-export]");
  if (!button) return;
  ui.exportPopover.classList.add("is-hidden");
  ui.exportButton.setAttribute("aria-expanded", "false");
  if (button.dataset.export === "pdf") window.print();
  if (button.dataset.export === "midi") exportMidi();
  if (button.dataset.export === "performance") exportMidi(true);
  if (button.dataset.export === "musicxml") exportMusicXml();
  if (button.dataset.export === "project") exportProject();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".export-menu")) {
    ui.exportPopover.classList.add("is-hidden");
    ui.exportButton.setAttribute("aria-expanded", "false");
  }
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isForm = target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement;
  if (event.code === "Space" && !isForm && ui.audio.src) {
    event.preventDefault();
    ui.playButton.click();
  }
  if (event.key === "Escape") ui.exportPopover.classList.add("is-hidden");
});

let scoreResizeTimer = 0;
window.addEventListener("resize", () => {
  if (state.audioBuffer) drawWaveform(state.audioBuffer);
  clearTimeout(scoreResizeTimer);
  scoreResizeTimer = setTimeout(() => {
    if (state.totalSteps && barsPerNotationSystem() !== state.barsPerSystem) renderScore();
  }, 140);
});

window.addEventListener("beforeprint", () => {
  if (!state.totalSteps) return;
  state.printing = true;
  renderScore();
});

window.addEventListener("afterprint", () => {
  if (!state.totalSteps) return;
  state.printing = false;
  renderScore();
});

// Save on edits and lifecycle transitions, not beforeunload (unreliable on
// phones and can exclude Firefox pages from its back/forward cache).
window.addEventListener("pagehide", saveWorkspace);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveWorkspace();
});
window.addEventListener("online", () => {
  if (!state.analyzing && !state.restoring && ["running", "uploading"].includes(state.jobStage)) restoreWorkspace();
});

ui.scoreCard.classList.add("editing");
restoreWorkspace();

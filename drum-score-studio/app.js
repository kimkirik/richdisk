"use strict";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const INSTRUMENTS = [
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
  exact: "감지된 작은 타격까지 최대한 많이 표시합니다.",
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
  difficulty: "standard",
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
};

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
  const extensionOkay = /\.(mp3|wav|m4a|aac)$/i.test(file.name);
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

async function loadAudioBlob(blob, name, size = blob.size) {
  resetPlayback();
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
    showToast("곡을 준비했어요. ‘드럼 악보 만들기’를 눌러 주세요.");
  } catch (error) {
    console.error(error);
    ui.trackDetails.textContent = "파일을 읽지 못했어요";
    showToast(error.message || "이 오디오 형식은 브라우저에서 열 수 없어요.");
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
  const hop = 1024;
  const sampleStride = sampleRate > 48000 ? 3 : 2;
  const frameCount = Math.ceil(buffer.length / hop);
  const total = new Float32Array(frameCount);
  const low = new Float32Array(frameCount);
  const mid = new Float32Array(frameCount);
  const high = new Float32Array(frameCount);
  const channels = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) channels.push(buffer.getChannelData(c));

  const aLow = 1 - Math.exp((-2 * Math.PI * 190) / sampleRate);
  const aMid = 1 - Math.exp((-2 * Math.PI * 1550) / sampleRate);
  const aHigh = 1 - Math.exp((-2 * Math.PI * 5200) / sampleRate);
  let lowState = 0;
  let midState = 0;
  let highState = 0;

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * hop;
    const end = Math.min(buffer.length, start + hop);
    let sumTotal = 0;
    let sumLow = 0;
    let sumMid = 0;
    let sumHigh = 0;
    let count = 0;
    for (let i = start; i < end; i += sampleStride) {
      let x = 0;
      for (const channel of channels) x += channel[i] || 0;
      x /= channels.length;
      lowState += aLow * (x - lowState);
      midState += aMid * (x - midState);
      highState += aHigh * (x - highState);
      const lowBand = lowState;
      const midBand = midState - lowState;
      const highBand = x - highState;
      sumTotal += x * x;
      sumLow += lowBand * lowBand;
      sumMid += midBand * midBand;
      sumHigh += highBand * highBand;
      count += 1;
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
    for (let i = 1; i < source.length; i += 1) {
      rolling = rolling * 0.9 + source[i - 1] * 0.1;
      const rise = Math.max(0, source[i] - rolling * 0.98);
      result[i] = Math.log1p(rise * 85);
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
  const env = envelopes.total;
  const frameRate = envelopes.frameRate;
  const threshold = positivePercentile(env, 0.7);
  const minBpm = 68;
  const maxBpm = 190;
  const minLag = Math.floor((60 * frameRate) / maxBpm);
  const maxLag = Math.ceil((60 * frameRate) / minBpm);
  const start = Math.min(env.length - 1, Math.floor(frameRate * 2));
  const sampleLimit = Math.min(env.length, start + Math.floor(frameRate * 240));
  let bestLag = Math.round((60 * frameRate) / 120);
  let bestScore = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let score = 0;
    let weight = 0;
    for (let i = start + lag; i < sampleLimit; i += 2) {
      const a = Math.max(0, env[i] - threshold * 0.34);
      if (!a) continue;
      const b = Math.max(0, env[i - lag] - threshold * 0.34);
      score += a * b;
      weight += a;
    }
    score /= Math.max(0.001, weight);
    const bpm = (60 * frameRate) / lag;
    const commonTempoBias = 1 + Math.max(0, 1 - Math.abs(bpm - 118) / 90) * 0.035;
    score *= commonTempoBias;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  let bpm = (60 * frameRate) / bestLag;
  if (bpm < 78) bpm *= 2;
  if (bpm > 176 && bpm / 2 >= 78) bpm /= 2;
  return clamp(Math.round(bpm), 45, 260);
}

function findGridStart(envelopes, bpm) {
  const beatDuration = 60 / bpm;
  const env = envelopes.total;
  const threshold = positivePercentile(env, 0.82);
  const bins = 64;
  const histogram = new Float64Array(bins);
  const maxFrame = Math.min(env.length, Math.floor(envelopes.frameRate * 180));
  for (let i = 0; i < maxFrame; i += 1) {
    if (env[i] < threshold) continue;
    const time = i / envelopes.frameRate;
    const phase = ((time % beatDuration) + beatDuration) % beatDuration;
    const bin = Math.min(bins - 1, Math.floor((phase / beatDuration) * bins));
    histogram[bin] += env[i] * env[i];
  }
  let bestBin = 0;
  for (let i = 1; i < bins; i += 1) {
    if (histogram[i] > histogram[bestBin]) bestBin = i;
  }
  return (bestBin / bins) * beatDuration;
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
  state.gridStart = findGridStart(envelopes, bpm);
  state.totalSteps = Math.max(
    info.stepsPerBar,
    Math.ceil((envelopes.duration - state.gridStart) / stepDuration)
  );
  state.events.clear();

  const quantile = 0.955 - ((sensitivity - 35) / 50) * 0.145;
  const totalThreshold = positivePercentile(envelopes.total, clamp(quantile - 0.03, 0.72, 0.96));
  const lowThreshold = positivePercentile(envelopes.low, clamp(quantile, 0.75, 0.97));
  const midThreshold = positivePercentile(envelopes.mid, clamp(quantile, 0.75, 0.97));
  const highThreshold = positivePercentile(envelopes.high, clamp(quantile - 0.02, 0.73, 0.96));

  let lastCrashStep = -info.stepsPerBar;
  let lastShellFrame = -1;
  let lastCymbalFrame = -1;
  for (let step = 0; step < state.totalSteps; step += 1) {
    const time = state.gridStart + step * stepDuration;
    const frame = Math.round(time * envelopes.frameRate);
    const profile = transientProfile(envelopes, frame, "total");
    const cymbalProfile = transientProfile(envelopes, frame, "high");
    const spectrum = spectralEnergyShares(envelopes, profile.frame);
    const cymbalSpectrum = spectralEnergyShares(envelopes, cymbalProfile.frame);
    const total = peakNear(envelopes.total, profile.frame, 1) / Math.max(0.0001, totalThreshold);
    const low = peakNear(envelopes.low, profile.frame, 1) / Math.max(0.0001, lowThreshold);
    const mid = peakNear(envelopes.mid, profile.frame, 1) / Math.max(0.0001, midThreshold);
    const high = peakNear(envelopes.high, profile.frame, 1) / Math.max(0.0001, highThreshold);
    const cymbalTotal = peakNear(envelopes.total, cymbalProfile.frame, 1) / Math.max(0.0001, totalThreshold);
    const cymbalHigh = peakNear(envelopes.high, cymbalProfile.frame, 1) / Math.max(0.0001, highThreshold);
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

async function runAnalysis() {
  if (!state.audioBuffer || state.analyzing) return;
  state.analyzing = true;
  ui.analyzeButton.disabled = true;
  ui.scoreCard.classList.add("is-hidden");
  ui.progressCard.classList.remove("is-hidden");
  setProgress(4, "곡의 리듬을 듣고 있어요", "오디오 데이터를 준비하는 중…");
  ui.progressCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

  try {
    await sleep(120);
    const envelopes = await ensureEnvelopes(true);
    setProgress(56, "박자와 속도를 찾고 있어요", "강한 타격의 반복 간격을 비교하는 중…");
    await nextPaint();

    let bpm;
    if (state.isDemo && state.demoTruth) {
      bpm = state.demoTruth.bpm;
    } else {
      bpm = estimateBpm(envelopes);
    }
    state.bpm = bpm;
    ui.bpmInput.value = String(bpm);
    await sleep(80);

    setProgress(72, "드럼 타격을 구분하고 있어요", "기타·보컬의 지속음과 순간 타격음을 나누는 중…");
    await nextPaint();

    if (state.isDemo && state.demoTruth) {
      applyDemoTruth();
    } else {
      transcribe(envelopes, bpm, state.sensitivity);
    }

    setProgress(91, "악보로 정리하고 있어요", "타격 간격에 따라 8분·16분음표로 묶는 중…");
    await sleep(130);
    renderScore();
    saveLocalProject();
    setProgress(100, "악보가 완성됐어요", "원곡을 재생하며 주황색 음표부터 확인해 보세요.");
    await sleep(320);
    ui.progressCard.classList.add("is-hidden");
    ui.scoreCard.classList.remove("is-hidden");
    ui.scoreCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    ui.progressCard.classList.add("is-hidden");
    showToast(error.message || "분석 중 문제가 생겼어요. 다른 파일로 다시 시도해 주세요.");
  } finally {
    state.analyzing = false;
    ui.analyzeButton.disabled = !state.audioBuffer;
  }
}

function applyDemoTruth() {
  state.events.clear();
  state.bpm = state.demoTruth.bpm;
  state.gridStart = 0;
  state.totalSteps = state.demoTruth.totalSteps;
  for (const event of state.demoTruth.events) addEvent(event.step, event.instrument, event.confidence, "auto");
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
  const lowConfidence = event.confidence < 0.58 && event.source !== "manual";
  const group = svgElement("g", {
    class: `notation-note ${lowConfidence ? "low-confidence" : ""}`,
    transform: `translate(${x} ${instrument.staffY})`,
  });
  group.append(svgElement("title", {}, `${instrument.name} · 신뢰도 ${Math.round(event.confidence * 100)}%`));

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
  const step = Math.floor((time - state.gridStart + stepDuration * 0.35) / stepDuration);
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
  const pattern = buildDemoPattern();
  state.isDemo = true;
  state.demoTruth = pattern;
  const blob = createDemoWav(pattern);
  await loadAudioBlob(blob, "펑키 록 샘플.wav", blob.size);
  state.isDemo = true;
  state.demoTruth = pattern;
  state.bpm = pattern.bpm;
  ui.bpmInput.value = String(pattern.bpm);
  await runAnalysis();
}

function projectData() {
  return {
    format: "drumscore-project",
    version: 3,
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
  };
}

function saveLocalProject() {
  try {
    localStorage.setItem("drumscore:last-project", JSON.stringify(projectData()));
  } catch (error) {
    console.warn("Local save unavailable", error);
  }
}

function loadProjectData(project, fileName = "저장한 드럼 악보") {
  if (!project || project.format !== "drumscore-project" || !Array.isArray(project.events)) {
    throw new Error("드럼스코어 프로젝트 파일이 아닙니다.");
  }
  resetPlayback();
  state.fileName = project.title || fileName;
  state.fileSize = 0;
  state.audioBuffer = null;
  state.envelopes = null;
  state.isDemo = false;
  state.demoTruth = null;
  state.bpm = clamp(Number(project.bpm) || 120, 45, 260);
  state.timeSignature = ["4/4", "3/4", "6/8"].includes(project.timeSignature) ? project.timeSignature : "4/4";
  state.gridStart = Number(project.gridStart) || 0;
  state.totalSteps = Math.max(1, Number(project.totalSteps) || 16);
  state.difficulty = ["easy", "standard", "exact"].includes(project.difficulty) ? project.difficulty : "standard";
  state.sensitivity = clamp(Number(project.sensitivity) || 62, 35, 85);
  state.drumIsolation = project.drumIsolation !== false;
  state.events.clear();
  for (const event of project.events) {
    const instrumentId = event.instrument === "tom" ? "tomMid" : event.instrument;
    if (INSTRUMENTS.some((item) => item.id === instrumentId)) {
      addEvent(Number(event.step), instrumentId, Number(event.confidence) || 1, event.source || "manual");
    }
  }
  ui.audio.removeAttribute("src");
  ui.audio.load();
  ui.currentTime.textContent = "0:00";
  ui.duration.textContent = "0:00";
  ui.playhead.style.left = "0%";
  ui.trackName.textContent = state.fileName;
  ui.trackDetails.textContent = "프로젝트 악보 · 원곡은 다시 선택하면 함께 들을 수 있어요";
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
      body += `<note>${hitIndex ? "<chord/>" : ""}<unpitched><display-step>${instrument.displayStep}</display-step><display-octave>${instrument.displayOctave}</display-octave></unpitched><duration>${duration}</duration><instrument id="P1-I${instrument.midi}"/><voice>${voice === "upper" ? 1 : 2}</voice><type>${value.type}</type>${value.dots}<stem>${stem}</stem><notehead>${notehead}</notehead></note>`;
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

  const scoreInstruments = INSTRUMENTS.map((item) => `<score-instrument id="P1-I${item.midi}"><instrument-name>${escapeXml(item.name)}</instrument-name></score-instrument>`).join("");
  const midiInstruments = INSTRUMENTS.map((item) => `<midi-instrument id="P1-I${item.midi}"><midi-channel>10</midi-channel><midi-unpitched>${item.midi + 1}</midi-unpitched></midi-instrument>`).join("");
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

function exportMidi() {
  const ppq = 480;
  const ticksPerStep = 120;
  const microseconds = Math.round(60000000 / state.bpm);
  const info = signatureInfo();
  const denominatorPower = Math.log2(info.beatUnit);
  const track = [];
  track.push(0x00, 0xff, 0x51, 0x03, (microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff);
  track.push(0x00, 0xff, 0x58, 0x04, info.beats, denominatorPower, 24, 8);
  const midiEvents = [];
  for (const event of visibleEvents()) {
    const instrument = INSTRUMENTS.find((item) => item.id === event.instrument);
    const tick = event.step * ticksPerStep;
    const velocity = clamp(Math.round(48 + event.confidence * 76), 1, 127);
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
  bytes.push(...track);
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: "audio/midi" }), `${safeBaseName()}.mid`);
}

async function autoDetectBpm() {
  if (!state.audioBuffer || state.analyzing) return;
  const oldText = ui.detectBpmButton.textContent;
  ui.detectBpmButton.textContent = "…";
  ui.detectBpmButton.disabled = true;
  try {
    const envelopes = await ensureEnvelopes(false);
    const bpm = state.isDemo && state.demoTruth ? state.demoTruth.bpm : estimateBpm(envelopes);
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
  ui.bpmInput.value = String(Math.round(state.bpm));
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
  if (hasEvent(step, instrument)) {
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

window.addEventListener("beforeunload", () => {
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
});

ui.scoreCard.classList.add("editing");

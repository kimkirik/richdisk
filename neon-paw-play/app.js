"use strict";

const COLORS = [
  { accent: "#2f80ff", accentTwo: "#9bd4ff", rgb: "47, 128, 255" },
  { accent: "#63cfff", accentTwo: "#3478ff", rgb: "99, 207, 255" },
  { accent: "#ffd84a", accentTwo: "#fff3a0", rgb: "255, 216, 74" },
  { accent: "#ffb52e", accentTwo: "#ffe36e", rgb: "255, 181, 46" },
  { accent: "#526bff", accentTwo: "#8fcaff", rgb: "82, 107, 255" },
  { accent: "#f5e9a6", accentTwo: "#6ba8ff", rgb: "245, 233, 166" },
];

const MAX_STAMPS = 32;
const RECORDING_LIMIT_MS = 4000;
const MICROPHONE_TIMEOUT_MS = 30000;
const EXIT_HOLD_MS = 1600;

const elements = {
  welcomeScreen: document.querySelector("#welcome-screen"),
  playScreen: document.querySelector("#play-screen"),
  setupForm: document.querySelector("#setup-form"),
  petName: document.querySelector("#pet-name"),
  inputCount: document.querySelector("#input-count"),
  voiceGuide: document.querySelector("#voice-guide"),
  recorderCard: document.querySelector("#recorder-card"),
  recorderStatus: document.querySelector("#recorder-status"),
  recordButton: document.querySelector("#record-button"),
  recordButtonLabel: document.querySelector("#record-button-label"),
  recordingWave: document.querySelector("#recording-wave"),
  waveLabel: document.querySelector("#wave-label"),
  listenButton: document.querySelector("#listen-button"),
  recordingError: document.querySelector("#recording-error"),
  startButton: document.querySelector("#start-button"),
  startHelp: document.querySelector("#start-help"),
  installButton: document.querySelector("#install-button"),
  modeChip: document.querySelector("#mode-chip"),
  playingName: document.querySelector("#playing-name"),
  soundButton: document.querySelector("#sound-button"),
  exitButton: document.querySelector("#exit-button"),
  playHint: document.querySelector("#play-hint"),
  playHintCopy: document.querySelector("#play-hint-copy"),
  stampLayer: document.querySelector("#stamp-layer"),
  stampTemplate: document.querySelector("#stamp-template"),
};

let recordingState = "idle";
let recordingError = "";
let recordedName = "";
let recordingUrl = null;
let recordedBuffer = null;
let mediaRecorder = null;
let mediaStream = null;
let recordingStopTimer = null;
let permissionTimer = null;
let recordingSession = 0;
let recordingBusy = false;

let audioContext = null;
let masterGain = null;
let activeSources = new Set();
let activeHtmlAudio = new Set();
let playbackGeneration = 0;
let soundEnabled = true;

let stampSequence = 0;
let lastStamp = null;
let hasTouched = false;
let isPlaying = false;
let deferredInstallPrompt = null;
let wakeLock = null;
let exitTimer = null;
let exitProgressTimer = null;
let exitStartedAt = 0;

function normalizedName() {
  return elements.petName.value.trim().replace(/\s+/g, " ");
}

function setRecordingState(nextState, errorMessage = "") {
  recordingState = nextState;
  recordingError = errorMessage;
  renderSetup();
}

function renderSetup() {
  const name = normalizedName();
  const busy = ["requesting", "recording", "processing"].includes(recordingState);
  const ready = recordingState === "ready" && Boolean(recordingUrl) && recordedName === name;

  elements.inputCount.textContent = `${elements.petName.value.length}/12`;
  elements.petName.disabled = busy;
  elements.recordButton.disabled = !name || (busy && recordingState !== "recording");
  elements.startButton.disabled = !ready;
  elements.recorderCard.className = `recorder-card ${recordingState}`;
  elements.recordingWave.className = `recording-wave ${busy ? recordingState : "hidden"}`;
  elements.listenButton.classList.toggle("hidden", !ready);
  elements.recordingError.classList.toggle("hidden", !recordingError);
  elements.recordingError.textContent = recordingError;

  elements.voiceGuide.textContent = name
    ? `이제 “${name}”라고 한 번 불러주세요`
    : "먼저 이름을 입력해 주세요";

  if (recordingState === "requesting") {
    elements.recorderStatus.textContent = "마이크 연결을 기다리고 있어요";
    elements.recordButton.className = "record-button busy";
    elements.recordButtonLabel.textContent = "마이크 연결 중…";
    elements.waveLabel.textContent = "마이크 사용 권한을 확인해 주세요";
  } else if (recordingState === "recording") {
    elements.recorderStatus.textContent = `지금 “${name}”라고 불러주세요`;
    elements.recordButton.className = "record-button recording";
    elements.recordButton.innerHTML = '<span class="record-stop" aria-hidden="true"></span><span id="record-button-label">녹음 완료</span>';
    elements.recordButtonLabel = document.querySelector("#record-button-label");
    elements.waveLabel.textContent = "최대 4초 후 자동으로 완료돼요";
  } else if (recordingState === "processing") {
    elements.recorderStatus.textContent = "녹음한 목소리를 준비하고 있어요";
    elements.recordButton.className = "record-button busy";
    elements.recordButton.innerHTML = '<span class="record-dot" aria-hidden="true"></span><span id="record-button-label">목소리 준비 중…</span>';
    elements.recordButtonLabel = document.querySelector("#record-button-label");
    elements.waveLabel.textContent = "겹쳐 재생할 목소리를 준비 중이에요";
  } else {
    elements.recordButton.className = "record-button";
    elements.recordButton.innerHTML = '<span class="record-dot" aria-hidden="true"></span><span id="record-button-label"></span>';
    elements.recordButtonLabel = document.querySelector("#record-button-label");
    elements.recordButtonLabel.textContent = ready
      ? "다시 녹음"
      : recordingState === "error"
        ? "다시 시도"
        : "목소리 녹음하기";

    elements.recorderStatus.textContent = ready
      ? `“${recordedName}” 목소리가 준비됐어요`
      : "버튼을 누르고 이름을 한 번 불러주세요";
  }

  elements.startHelp.textContent = !name
    ? "이름을 입력하면 녹음할 수 있어요"
    : ready
      ? `${name}의 네온 놀이터가 준비됐어요!`
      : "목소리 녹음을 마치면 시작할 수 있어요";
}

function ensureAudioGraph() {
  if (audioContext) return audioContext;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  const limiter = audioContext.createDynamicsCompressor();
  masterGain.gain.value = 0.72;
  limiter.threshold.value = -14;
  limiter.knee.value = 20;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.24;
  masterGain.connect(limiter).connect(audioContext.destination);
  return audioContext;
}

function clearRecordingTimers() {
  if (recordingStopTimer) window.clearTimeout(recordingStopTimer);
  if (permissionTimer) window.clearTimeout(permissionTimer);
  recordingStopTimer = null;
  permissionTimer = null;
}

function stopMediaStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
}

function clearRecordingData() {
  stopAllSounds();
  recordedBuffer = null;
  recordedName = "";
  if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  recordingUrl = null;
}

function resetRecording() {
  recordingSession += 1;
  recordingBusy = false;
  clearRecordingTimers();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onerror = null;
    mediaRecorder.onstop = null;
    try { mediaRecorder.stop(); } catch { /* already stopping */ }
  }
  mediaRecorder = null;
  stopMediaStream();
  clearRecordingData();
  setRecordingState("idle");
}

function supportedMimeType() {
  if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== "function") return "";
  return [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

async function decodeRecording(blob) {
  const context = ensureAudioGraph();
  if (!context) return null;
  try {
    return await context.decodeAudioData(await blob.arrayBuffer());
  } catch {
    return null;
  }
}

async function startRecording() {
  const name = normalizedName();
  if (!name || recordingBusy) return;

  if (!window.isSecureContext) {
    setRecordingState("error", "목소리 녹음은 HTTPS 보안 주소에서 사용할 수 있어요.");
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setRecordingState("error", "이 브라우저에서는 목소리 녹음을 사용할 수 없어요.");
    return;
  }

  recordingSession += 1;
  const session = recordingSession;
  recordingBusy = true;
  clearRecordingTimers();
  clearRecordingData();
  setRecordingState("requesting");

  let requestedStream = null;

  try {
    permissionTimer = window.setTimeout(() => {
      if (session !== recordingSession) return;
      recordingSession += 1;
      recordingBusy = false;
      permissionTimer = null;
      setRecordingState("error", "마이크 연결이 늦어지고 있어요. 권한을 확인한 뒤 다시 시도해 주세요.");
    }, MICROPHONE_TIMEOUT_MS);

    requestedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    if (permissionTimer) window.clearTimeout(permissionTimer);
    permissionTimer = null;

    if (session !== recordingSession) {
      requestedStream.getTracks().forEach((track) => track.stop());
      return;
    }

    mediaStream = requestedStream;
    const chunks = [];
    const mimeType = supportedMimeType();
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream);

    const currentRecorder = mediaRecorder;
    let recorderFailed = false;

    currentRecorder.ondataavailable = (event) => {
      if (event.data?.size) chunks.push(event.data);
    };

    currentRecorder.onerror = () => {
      recorderFailed = true;
      if (session !== recordingSession) return;
      clearRecordingTimers();
      stopMediaStream();
      mediaRecorder = null;
      recordingBusy = false;
      setRecordingState("error", "녹음 중 문제가 생겼어요. 다시 시도해 주세요.");
    };

    currentRecorder.onstop = async () => {
      clearRecordingTimers();
      stopMediaStream();
      if (mediaRecorder === currentRecorder) mediaRecorder = null;
      if (recorderFailed || session !== recordingSession) return;

      setRecordingState("processing");
      if (!chunks.length) {
        recordingBusy = false;
        setRecordingState("error", "녹음된 목소리가 없어요. 다시 녹음해 주세요.");
        return;
      }

      const blob = new Blob(chunks, {
        type: currentRecorder.mimeType || chunks[0]?.type || "audio/webm",
      });

      if (!blob.size) {
        recordingBusy = false;
        setRecordingState("error", "녹음된 목소리가 없어요. 다시 녹음해 주세요.");
        return;
      }

      const nextUrl = URL.createObjectURL(blob);
      const nextBuffer = await decodeRecording(blob);

      if (session !== recordingSession) {
        URL.revokeObjectURL(nextUrl);
        return;
      }

      recordingUrl = nextUrl;
      recordedBuffer = nextBuffer;
      recordedName = name;
      recordingBusy = false;
      setRecordingState("ready");
    };

    currentRecorder.start(100);
    setRecordingState("recording");
    recordingStopTimer = window.setTimeout(stopRecording, RECORDING_LIMIT_MS);
  } catch (error) {
    if (permissionTimer) window.clearTimeout(permissionTimer);
    permissionTimer = null;
    requestedStream?.getTracks().forEach((track) => track.stop());
    if (session !== recordingSession) return;

    recordingBusy = false;
    mediaRecorder = null;
    stopMediaStream();

    const errorName = error instanceof DOMException ? error.name : "";
    if (["NotAllowedError", "SecurityError"].includes(errorName)) {
      setRecordingState("error", "주소창의 권한 설정에서 마이크를 허용한 뒤 다시 눌러주세요.");
    } else if (errorName === "NotFoundError") {
      setRecordingState("error", "사용할 수 있는 마이크를 찾지 못했어요.");
    } else if (errorName === "NotReadableError") {
      setRecordingState("error", "다른 앱이 마이크를 사용 중이에요. 다른 앱을 닫고 다시 시도해 주세요.");
    } else {
      setRecordingState("error", "마이크를 확인한 뒤 다시 눌러주세요.");
    }
  }
}

function stopRecording() {
  if (recordingStopTimer) window.clearTimeout(recordingStopTimer);
  recordingStopTimer = null;
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    setRecordingState("processing");
    try { mediaRecorder.stop(); } catch { /* handled by recorder callbacks */ }
  }
}

function stopAllSounds() {
  playbackGeneration += 1;
  activeSources.forEach((source) => {
    try { source.stop(); } catch { /* already stopped */ }
  });
  activeSources.clear();
  activeHtmlAudio.forEach((audio) => {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  });
  activeHtmlAudio.clear();
}

function trimActiveSounds() {
  while (activeSources.size > 32) {
    const oldest = activeSources.values().next().value;
    try { oldest.stop(); } catch { /* already stopped */ }
    activeSources.delete(oldest);
  }
  while (activeHtmlAudio.size > 16) {
    const oldest = activeHtmlAudio.values().next().value;
    oldest.pause();
    activeHtmlAudio.delete(oldest);
  }
}

function playWithWebAudio(x, generation) {
  const context = ensureAudioGraph();
  if (!context || !recordedBuffer || generation !== playbackGeneration) return false;

  const startSource = () => {
    if (generation !== playbackGeneration || !recordedBuffer) return;

    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = typeof context.createStereoPanner === "function"
      ? context.createStereoPanner()
      : null;

    source.buffer = recordedBuffer;
    gain.gain.value = 0.95;
    source.connect(gain);

    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, (x / window.innerWidth) * 2 - 1));
      gain.connect(panner).connect(masterGain);
    } else {
      gain.connect(masterGain);
    }

    const cleanup = () => {
      activeSources.delete(source);
      try { source.disconnect(); } catch { /* disconnected */ }
      try { gain.disconnect(); } catch { /* disconnected */ }
      try { panner?.disconnect(); } catch { /* disconnected */ }
    };

    source.onended = cleanup;
    activeSources.add(source);
    trimActiveSounds();
    try { source.start(0); } catch { cleanup(); }
  };

  if (context.state === "running") {
    startSource();
  } else {
    context.resume().then(startSource).catch(() => playWithHtmlAudio(generation));
  }
  return true;
}

function playWithHtmlAudio(generation) {
  if (!recordingUrl || generation !== playbackGeneration) return;
  const audio = new Audio(recordingUrl);
  audio.preload = "auto";
  audio.volume = 0.78;
  activeHtmlAudio.add(audio);
  trimActiveSounds();
  const cleanup = () => activeHtmlAudio.delete(audio);
  audio.addEventListener("ended", cleanup, { once: true });
  audio.addEventListener("error", cleanup, { once: true });
  audio.play().catch(cleanup);
}

function playRecorded(x, force = false) {
  if ((!soundEnabled && !force) || !recordingUrl) return;
  const generation = playbackGeneration;
  if (!playWithWebAudio(x, generation)) playWithHtmlAudio(generation);
}

function calculateRotation(x, y) {
  const now = performance.now();
  const previous = lastStamp;
  const deltaX = previous ? x - previous.x : x - window.innerWidth / 2;
  const deltaY = previous ? y - previous.y : y - window.innerHeight / 2;
  const distance = Math.hypot(deltaX, deltaY);
  const followsPrevious = previous && now - previous.time < 2200 && distance > 12;
  const directionX = followsPrevious ? deltaX : x - window.innerWidth / 2;
  const directionY = followsPrevious ? deltaY : y - window.innerHeight / 2;
  const directionDistance = Math.hypot(directionX, directionY);
  const fallback = previous?.rotation ?? 0;
  const rotation = directionDistance > 8
    ? (Math.atan2(directionY, directionX) * 180 / Math.PI + 90 + 360) % 360
    : fallback;

  lastStamp = { x, y, time: now, rotation };
  return rotation;
}

function createStamp(x, y) {
  const stamp = elements.stampTemplate.content.firstElementChild.cloneNode(true);
  const color = COLORS[stampSequence % COLORS.length];
  const rotation = calculateRotation(x, y);
  const scale = 0.9 + Math.random() * 0.28;
  stampSequence += 1;

  stamp.style.left = `${x}px`;
  stamp.style.top = `${y}px`;
  stamp.style.setProperty("--paw-rotate", `${rotation}deg`);
  stamp.style.setProperty("--paw-scale", String(scale));
  stamp.style.setProperty("--accent", color.accent);
  stamp.style.setProperty("--accent-two", color.accentTwo);
  stamp.style.setProperty("--accent-rgb", color.rgb);
  stamp.querySelector(".stamp-sound").textContent = normalizedName();
  elements.stampLayer.append(stamp);

  while (elements.stampLayer.childElementCount > MAX_STAMPS) {
    elements.stampLayer.firstElementChild?.remove();
  }
  window.setTimeout(() => stamp.remove(), 1780);
}

function handlePlayPointer(event) {
  if (!isPlaying || event.target.closest("[data-control]")) return;
  event.preventDefault();
  hasTouched = true;
  elements.playHint.classList.add("touched");
  createStamp(event.clientX, event.clientY);
  playRecorded(event.clientX);
}

async function requestWakeLock() {
  if (!isPlaying || document.visibilityState !== "visible" || !navigator.wakeLock) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    wakeLock = null;
  }
}

async function releaseWakeLock() {
  if (!wakeLock) return;
  try { await wakeLock.release(); } catch { /* already released */ }
  wakeLock = null;
}

function updateSoundButton() {
  elements.soundButton.setAttribute("aria-pressed", String(soundEnabled));
  elements.soundButton.setAttribute("aria-label", soundEnabled ? "음성 끄기" : "음성 켜기");
  elements.soundButton.querySelector("span").textContent = soundEnabled ? "🔊" : "🔇";
  elements.soundButton.querySelector("b").textContent = soundEnabled ? "음성 켜짐" : "음성 꺼짐";
}

async function enterPlayMode() {
  const name = normalizedName();
  if (!name || recordingState !== "ready" || recordedName !== name || !recordingUrl) return;

  isPlaying = true;
  hasTouched = false;
  lastStamp = null;
  elements.playHint.classList.remove("touched");
  elements.welcomeScreen.classList.add("hidden");
  elements.playScreen.classList.remove("hidden");
  elements.playingName.textContent = `${name} 놀이 중`;
  elements.modeChip.setAttribute("aria-label", `${name} 놀이 중`);
  elements.playScreen.setAttribute("aria-label", `${name} 네온 발바닥 놀이 화면`);
  elements.playHintCopy.textContent = `누를 때마다 녹음한 “${name}” 목소리가 나와요`;

  const context = ensureAudioGraph();
  if (context?.state !== "running") context?.resume().catch(() => undefined);

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  createStamp(centerX, centerY);
  playRecorded(centerX, true);
  requestWakeLock();

  try { await document.documentElement.requestFullscreen?.(); } catch { /* optional on iOS */ }
}

async function exitPlayMode() {
  cancelExitHold();
  stopAllSounds();
  await releaseWakeLock();
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch { /* already exited */ }
  }
  elements.stampLayer.replaceChildren();
  lastStamp = null;
  hasTouched = false;
  isPlaying = false;
  elements.playScreen.classList.add("hidden");
  elements.welcomeScreen.classList.remove("hidden");
  window.setTimeout(() => elements.petName.focus({ preventScroll: true }), 0);
}

function cancelExitHold() {
  if (exitTimer) window.clearTimeout(exitTimer);
  if (exitProgressTimer) window.clearInterval(exitProgressTimer);
  exitTimer = null;
  exitProgressTimer = null;
  exitStartedAt = 0;
  elements.exitButton.style.setProperty("--exit-progress", "0deg");
}

function startExitHold(event) {
  event.preventDefault();
  event.stopPropagation();
  if (exitTimer) return;
  exitStartedAt = performance.now();
  try { elements.exitButton.setPointerCapture(event.pointerId); } catch { /* optional */ }

  exitProgressTimer = window.setInterval(() => {
    const progress = Math.min(1, (performance.now() - exitStartedAt) / EXIT_HOLD_MS);
    elements.exitButton.style.setProperty("--exit-progress", `${progress * 360}deg`);
  }, 40);

  exitTimer = window.setTimeout(() => {
    cancelExitHold();
    exitPlayMode();
  }, EXIT_HOLD_MS);
}

function cancelRecordingForPageChange() {
  if (!recordingBusy) return;
  recordingSession += 1;
  recordingBusy = false;
  clearRecordingTimers();
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.ondataavailable = null;
    mediaRecorder.onerror = null;
    mediaRecorder.onstop = null;
    try { mediaRecorder.stop(); } catch { /* already stopped */ }
  }
  mediaRecorder = null;
  stopMediaStream();
  setRecordingState("error", "화면이 전환되어 녹음이 중단됐어요. 다시 녹음해 주세요.");
}

function onNameInput() {
  const nextName = normalizedName();
  if (recordingState === "ready" && nextName !== recordedName) resetRecording();
  renderSetup();
}

function onRecordButton() {
  if (recordingState === "recording") stopRecording();
  else startRecording();
}

function onSoundToggle() {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) stopAllSounds();
  updateSoundButton();
}

async function installApp() {
  if (!deferredInstallPrompt) return;
  try {
    await deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
  } catch {
    // The browser keeps its own install guidance.
  }
  deferredInstallPrompt = null;
  elements.installButton.classList.add("hidden");
}

elements.petName.addEventListener("input", onNameInput);
elements.recordButton.addEventListener("click", onRecordButton);
elements.listenButton.addEventListener("click", () => playRecorded(window.innerWidth / 2, true));
elements.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  enterPlayMode();
});
elements.installButton.addEventListener("click", installApp);
elements.playScreen.addEventListener("pointerdown", handlePlayPointer, { passive: false });
elements.playScreen.addEventListener("contextmenu", (event) => event.preventDefault());
elements.soundButton.addEventListener("click", onSoundToggle);
elements.exitButton.addEventListener("pointerdown", startExitHold);
elements.exitButton.addEventListener("pointerup", cancelExitHold);
elements.exitButton.addEventListener("pointercancel", cancelExitHold);
elements.exitButton.addEventListener("pointerleave", cancelExitHold);
elements.exitButton.addEventListener("click", (event) => event.preventDefault());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  elements.installButton.classList.remove("hidden");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  elements.installButton.classList.add("hidden");
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    stopAllSounds();
    cancelRecordingForPageChange();
    releaseWakeLock();
  } else if (isPlaying) {
    requestWakeLock();
  }
});

window.addEventListener("pagehide", () => {
  stopAllSounds();
  cancelRecordingForPageChange();
  releaseWakeLock();
});

window.addEventListener("load", () => {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => undefined);
  }
});

window.addEventListener("dblclick", (event) => {
  if (isPlaying) event.preventDefault();
}, { passive: false });

renderSetup();
updateSoundButton();

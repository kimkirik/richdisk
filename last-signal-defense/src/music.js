// Original orchestral score: three synchronized, locally hosted 48-second stems.
export const SCORE_SECONDS = 48;
export const STEMS = ["foundation", "battle", "boss"];
export function scoreMix(game) {
  if (game.phase === "victory") return [0, 0, 0];
  const combat = game.phase === "combat";
  const boss = game.enemies.some((enemy) =>
    ["titan", "sovereign"].includes(enemy.kind),
  );
  return [
    game.phase === "defeat" ? 0.36 : 0.86,
    combat ? 0.56 + game.wave * 0.12 : 0,
    combat
      ? boss
        ? 1
        : game.core < 30
          ? 0.65
          : game.wave === 3
            ? 0.36
            : 0
      : 0,
  ];
}
export class OrchestralAudio {
  constructor() {
    this.enabled = true;
    this.paused = false;
    this.mix = [0.86, 0, 0];
    this.nodes = [];
    this.voices = 0;
    this.cueToken = 0;
  }
  async unlock() {
    if (!this.enabled) return;
    if (!this.context) {
      const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
      try {
        this.context = new Context({
          sampleRate: 24000,
          latencyHint: "playback",
        });
      } catch {
        this.context = new Context();
      }
      this.master = this.context.createGain();
      this.master.gain.value = 0;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -9;
      limiter.knee.value = 12;
      limiter.ratio.value = 4;
      this.master.connect(limiter).connect(this.context.destination);
      this.noise = this.context.createBuffer(1, 24000, 24000);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (!this.paused) await this.context.resume();
    if (!this.loading) {
      this.loading = this.load().catch((error) => {
        this.loading = null;
        throw error;
      });
    }
    await this.loading;
    this.sync(true);
  }
  async load() {
    const buffers = await Promise.all(
      STEMS.map(async (name) => {
        const response = await fetch(
          new URL(`../assets/music/${name}.mp3`, import.meta.url),
        );
        if (!response.ok) throw new Error("Music could not be loaded");
        return this.context.decodeAudioData(await response.arrayBuffer());
      }),
    );
    const start = this.context.currentTime + 0.08;
    this.nodes = buffers.map((buffer, i) => {
      const source = this.context.createBufferSource(),
        gain = this.context.createGain();
      source.buffer = buffer;
      source.loop = true;
      source.loopEnd = Math.min(SCORE_SECONDS, buffer.duration);
      gain.gain.value = this.mix[i];
      source.connect(gain).connect(this.master);
      source.start(start);
      return { source, gain };
    });
    this.ready = true;
    // A failed optional fanfare must not prevent the main score from playing.
    this.fanfareLoading = fetch(
      new URL("../assets/music/victory.mp3", import.meta.url),
    )
      .then((response) => (response.ok ? response.arrayBuffer() : null))
      .then((data) => (data ? this.context.decodeAudioData(data) : null))
      .then((buffer) => {
        this.fanfareBuffer = buffer;
      })
      .catch(() => {});
  }
  playVictory() {
    this.stopVictory();
    if (!this.enabled || !this.context) return;
    const token = this.cueToken;
    this.victoryActive = true;
    this.sync(true);
    Promise.resolve(this.loading)
      .then(() => this.fanfareLoading)
      .then(() => {
        if (token !== this.cueToken || !this.fanfareBuffer || !this.enabled)
          return;
        const source = this.context.createBufferSource();
        const gain = this.context.createGain();
        source.buffer = this.fanfareBuffer;
        source.loop = false;
        gain.gain.value = 0.95;
        source.connect(gain).connect(this.master);
        this.fanfare = { source, gain };
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
          if (this.fanfare?.source === source) this.fanfare = null;
        };
        source.start(this.context.currentTime + 0.015);
      })
      .catch(() => {});
  }
  stopVictory() {
    this.cueToken++;
    this.victoryActive = false;
    if (this.fanfare) {
      const { source, gain } = this.fanfare;
      this.fanfare = null;
      gain.gain.cancelScheduledValues(this.context.currentTime);
      gain.gain.setTargetAtTime(0, this.context.currentTime, 0.04);
      source.stop(this.context.currentTime + 0.18);
    }
    this.sync(true);
  }
  setEnabled(value) {
    this.enabled = value;
    this.sync(true);
    return value ? this.unlock() : Promise.resolve();
  }
  setScene(game, hidden = false) {
    const mix = scoreMix(game),
      paused = game.paused || hidden;
    const changed =
      mix.some((v, i) => v !== this.mix[i]) || paused !== this.paused;
    this.mix = mix;
    this.paused = paused;
    // Mobile browsers can interrupt audio independently of our pause state.
    // Restore the existing sources after focus/pageshow without starting new ones.
    if (
      changed ||
      (!paused &&
        this.enabled &&
        this.context &&
        this.context.state !== "running")
    )
      this.sync(true);
  }
  sync(force = false) {
    if (!this.context) return;
    const playing = this.enabled && !this.paused;
    if (playing !== this.playing || force) {
      clearTimeout(this.suspendTimer);
      this.playing = playing;
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(playing ? 0.8 : 0, now, 0.08);
      if (playing) this.context.resume().catch(() => {});
      else
        this.suspendTimer = setTimeout(() => {
          if (!this.playing) this.context.suspend().catch(() => {});
        }, 350);
      this.nodes.forEach(({ gain }, i) => {
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(
          this.victoryActive ? 0 : this.mix[i],
          now,
          this.victoryActive ? 0.1 : 0.7,
        );
      });
    }
  }
  effect(type) {
    if (
      !this.context ||
      !this.playing ||
      this.context.state !== "running" ||
      this.voices > 12
    )
      return;
    const ctx = this.context,
      now = ctx.currentTime;
    if (
      ![
        "shot",
        "explosion",
        "build",
        "emp",
        "airstrike",
        "corehit",
        "victory",
      ].includes(type)
    )
      return;
    if (type === "shot" && now - (this.lastShot || 0) < 0.12) return;
    if (type === "shot") this.lastShot = now;
    const gain = ctx.createGain();
    const impact = ["explosion", "airstrike", "corehit"].includes(type);
    const length = impact ? 0.38 : type === "emp" ? 0.5 : 0.1;
    let source;
    if (type === "build" || type === "victory") {
      source = ctx.createOscillator();
      source.type = "sine";
      source.frequency.value = type === "victory" ? 587.33 : 440;
      source.connect(gain);
    } else {
      source = ctx.createBufferSource();
      source.buffer = this.noise;
      const filter = ctx.createBiquadFilter();
      filter.type = impact ? "lowpass" : "bandpass";
      filter.frequency.value = impact ? 230 : type === "emp" ? 700 : 1800;
      filter.Q.value = 0.65;
      source.connect(filter).connect(gain);
    }
    gain.gain.setValueAtTime(impact ? 0.13 : 0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
    gain.connect(this.master);
    this.voices++;
    source.onended = () => {
      this.voices--;
      source.disconnect();
      gain.disconnect();
    };
    source.start();
    source.stop(now + length);
  }
}

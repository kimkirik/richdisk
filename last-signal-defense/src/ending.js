export const VICTORY_SECONDS = 3;
export const FINALE_SECONDS = 8;

// The ending uses visible real time, never the simulation's 1× / 2× / 3× clock.
export class EndingSequence {
  constructor(finale = false, reduced = false) {
    this.finale = finale;
    this.reduced = reduced;
    this.elapsed = 0;
    this.finished = false;
  }
  advance(seconds, hidden = false) {
    if (!hidden && !this.finished) {
      this.elapsed += Math.max(0, Math.min(seconds, 0.1));
      if (this.elapsed + 1e-7 >= this.duration) this.skip();
    }
    return this.state;
  }
  get duration() {
    return this.reduced
      ? 0.8
      : VICTORY_SECONDS + (this.finale ? FINALE_SECONDS : 0);
  }
  get state() {
    return this.finished
      ? "complete"
      : this.elapsed < VICTORY_SECONDS
        ? "victory"
        : "finale";
  }
  get connected() {
    if (this.finished) return 20;
    return Math.min(
      20,
      Math.max(0, Math.floor((this.elapsed - VICTORY_SECONDS) / 0.22)),
    );
  }
  skip() {
    this.elapsed = this.duration;
    this.finished = true;
  }
}

export function campaignSummary(progress) {
  const stars = Array.from({ length: 20 }, (_, i) =>
    Math.min(3, Math.max(0, Math.trunc(Number(progress.stars?.[i + 1]) || 0))),
  );
  return {
    stars: stars.reduce((a, b) => a + b, 0),
    cleared: stars.filter(Boolean).length,
  };
}

export function recordVictory(
  progress,
  game,
  practice = false,
  completedAt = Date.now(),
) {
  if (practice || game.phase !== "victory") return false;
  const stars = game.core >= 90 ? 3 : game.core >= 60 ? 2 : 1;
  progress.unlocked = Math.min(
    20,
    Math.max(progress.unlocked, game.stage.id + 1),
  );
  progress.stars[game.stage.id] = Math.max(
    progress.stars[game.stage.id] || 0,
    stars,
  );
  if (game.stage.id === 20 && campaignSummary(progress).cleared === 20) {
    progress.completedAt ||= completedAt;
    progress.finalBestScore = Math.max(
      Number(progress.finalBestScore) || 0,
      game.score,
    );
  }
  return true;
}

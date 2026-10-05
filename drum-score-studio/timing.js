(function (root) {
  "use strict";
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  function buildGrid(duration, bpm, beatTimes = [], offset = 0) {
    if (!Number.isFinite(duration) || duration <= 0 || duration > 721 ||
        !Number.isFinite(bpm) || bpm < 45 || bpm > 260 || !Number.isFinite(offset)) {
      throw new Error("박자 지도를 만들 수 없습니다. BPM을 확인해 주세요.");
    }
    let beats = beatTimes.filter((t, i) => Number.isFinite(t) && t >= 0 && t <= duration + 2 &&
      (i === 0 || t > beatTimes[i - 1]));
    if (beats.length < 3) {
      const interval = 60 / bpm;
      beats = Array.from({ length: Math.ceil(duration / interval) + 2 }, (_, i) => i * interval);
    }
    const firstGap = median(beats.slice(1, 5).map((t, i) => t - beats[i]));
    const lastGap = median(beats.slice(-5).slice(1).map((t, i) => t - beats.slice(-5)[i]));
    if (firstGap < 0.05 || lastGap < 0.05) throw new Error("박자 간격이 올바르지 않습니다.");
    // A beat detected 20 ms into the file is the first beat, not a reason to
    // invent a preceding beat of rests. Longer lead-ins still keep their time.
    while (beats[0] > Math.min(0.08, firstGap / 4)) beats.unshift(beats[0] - firstGap);
    while (beats[beats.length - 1] < duration) beats.push(beats[beats.length - 1] + lastGap);
    const grid = [];
    for (let i = 0; i < beats.length - 1; i += 1) {
      for (let subdivision = 0; subdivision < 4; subdivision += 1) {
        grid.push(beats[i] + (beats[i + 1] - beats[i]) * subdivision / 4 + offset);
      }
    }
    grid.push(beats[beats.length - 1] + offset);
    return grid.filter(time => time <= duration + offset);
  }

  function nearestStep(grid, time) {
    let left = 0, right = grid.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (grid[mid] < time) left = mid + 1;
      else right = mid;
    }
    return left > 0 && Math.abs(grid[left - 1] - time) <= Math.abs(grid[left] - time) ? left - 1 : left;
  }

  function quantize(events, grid) {
    const byCell = new Map();
    let collisions = 0, offGrid = 0;
    for (const event of events) {
      const step = nearestStep(grid, event.time);
      const gap = (grid[step + 1] ?? grid[step] + 0.125) - grid[step];
      const timingError = event.time - grid[step];
      const needsTimingReview = Math.abs(timingError) > Math.min(0.035, gap * 0.28);
      if (needsTimingReview) offGrid += 1;
      const key = `${step}:${event.instrument}`;
      const previous = byCell.get(key);
      if (previous) collisions += 1;
      if (!previous || event.confidence > previous.confidence) {
        byCell.set(key, { ...event, step, source: "ai", timingError, needsTimingReview });
      }
    }
    return { events: [...byCell.values()], collisions, offGrid };
  }

  const api = { buildGrid, nearestStep, quantize };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.DrumTiming = api;
})(typeof globalThis === "undefined" ? this : globalThis);

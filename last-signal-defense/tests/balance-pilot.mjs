import {
  createGame,
  build,
  upgrade,
  upgradeCost,
  towerStats,
  startWave,
  skill,
  tick,
} from "../src/engine.js";
import { TOWERS, STAGES, pointAt, pathLength } from "../src/data.js";
export function run(id) {
  const g = createGame(id);
  const samples = g.stage.paths.flatMap((path) =>
    Array.from({ length: 28 }, (_, i) =>
      pointAt(path, (pathLength(path) * i) / 28),
    ),
  );
  function coverage(p, r) {
    return samples.reduce(
      (sum, s) => sum + (Math.hypot(s.x - p.x, s.y - p.y) < r ? 1 : 0),
      0,
    );
  }
  function buy() {
    const candidates = [];
    for (const pad of g.stage.pads.filter(
      (p) => !g.towers.some((t) => t.padId === p.id),
    ))
      for (const [kind, d] of Object.entries(TOWERS)) {
        if (d.unlock > id || d.cost > g.energy) continue;
        const role =
          d.pierce && id >= 13
            ? 3
            : d.chain
              ? 2
              : d.splash
                ? 2.2
                : d.slow
                  ? 2.4
                  : d.nova
                    ? 3.3
                    : 1;
        const crowdPenalty = g.towers.reduce(
          (n, t) => n + (Math.hypot(t.x - pad.x, t.y - pad.y) < 220 ? 0.3 : 0),
          0,
        );
        const rating =
          (((coverage(pad, d.range) * d.damage) / d.rate / d.cost) * role) /
          (1 + crowdPenalty);
        candidates.push({ rating, kind, pad });
      }
    for (const t of g.towers) {
      if (t.level < 3 && upgradeCost(t) <= g.energy) {
        const d = towerStats(t),
          role =
            d.pierce && id >= 13
              ? 3
              : d.chain
                ? 2
                : d.splash
                  ? 2.2
                  : d.slow
                    ? 2.4
                    : d.nova
                      ? 3.3
                      : 1;
        candidates.push({
          rating:
            ((((coverage(t, d.range) * d.damage) / d.rate) * 0.65) /
              upgradeCost(t)) *
            role,
          tower: t,
        });
      }
    }
    candidates.sort((a, b) => b.rating - a.rating);
    if (!candidates.length) return false;
    const best = candidates[0];
    if (best.tower) upgrade(g, best.tower.id);
    else build(g, best.kind, best.pad.id);
    return true;
  }
  let boss;
  let frames = 0;
  for (
    ;
    frames < 60 * 60 * 6 && g.phase !== "victory" && g.phase !== "defeat";
    frames++
  ) {
    if (frames % 30 === 0) {
      let n = 0;
      while (n++ < 20 && buy());
      if (g.phase === "build" && g.wave === 0) startWave(g);
      if (g.core <= 70) skill(g, "repair");
      const bossThreat = g.enemies.some(
        (e) =>
          ["titan", "sovereign"].includes(e.kind) &&
          e.distance > e.length * 0.25,
      );
      if (g.enemies.length >= 5 || bossThreat) skill(g, "emp");
      if (g.enemies.length >= 9 || bossThreat) skill(g, "airstrike");
    }
    boss = g.enemies.find((e) => e.kind === "sovereign")
      ? { ...g.enemies.find((e) => e.kind === "sovereign") }
      : boss;
    tick(g, 1 / 60);
  }
  return {
    boss,
    stage: id,
    phase: g.phase,
    core: g.core,
    kills: g.kills,
    energy: g.energy,
    towers: g.towers.map((t) => t.kind + ":" + t.level).join(","),
    time: Math.round(g.time),
  };
}
if (process.argv[1]?.endsWith("balance-pilot.mjs"))
  console.log(
    JSON.stringify(
      STAGES.map((s) => run(s.id)),
      null,
      2,
    ),
  );

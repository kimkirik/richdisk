import test from "node:test";
import assert from "node:assert/strict";
import {
  STAGES,
  TOWERS,
  ENEMIES,
  pathDistance,
  pathLength,
  wavePlan,
} from "../src/data.js";
import {
  createGame,
  build,
  upgrade,
  sell,
  startWave,
  skill,
  setSpeed,
  advance,
  tick,
  spawnEnemy,
} from "../src/engine.js";
import { run } from "./balance-pilot.mjs";
test("20 distinct maps have connected paths and valid separated build pads", () => {
  assert.equal(STAGES.length, 20);
  assert.equal(new Set(STAGES.map((s) => JSON.stringify(s.paths))).size, 20);
  for (const s of STAGES) {
    assert.ok(s.pads.length >= 13);
    for (const p of s.paths) {
      assert.deepEqual(p.at(-1), s.core);
      assert.ok(pathLength(p) > 500);
      for (const q of p)
        assert.ok(q.x >= 0 && q.x <= 1280 && q.y >= 0 && q.y <= 720);
    }
    for (const p of s.pads) {
      assert.ok(
        Math.min(...s.paths.map((path) => pathDistance(p, path))) >= 48,
      );
      for (const q of s.pads)
        if (p !== q) assert.ok(Math.hypot(q.x - p.x, q.y - p.y) > 105);
    }
  }
});
test("stage-based unlocks, mixed waves, escalating stats and a balanced boss in every wave", () => {
  assert.equal(Object.keys(TOWERS).length, 8);
  assert.equal(Object.keys(ENEMIES).length, 12);
  for (const s of STAGES) {
    for (let w = 1; w <= 3; w++) {
      const plan = wavePlan(s, w);
      assert.ok(plan.every((e) => ENEMIES[e.kind].unlock <= s.id));
      if (s.id >= 3) assert.ok(new Set(plan.map((e) => e.kind)).size >= 3);
      assert.equal(plan.filter((e) => ENEMIES[e.kind].boss).length, 1);
      if (s.id === 20 && w === 3)
        assert.equal(
          plan.at(-1).kind === "sovereign" ||
            plan.some((e) => e.kind === "sovereign"),
          true,
        );
    }
    if (s.id > 1) assert.ok(s.hpScale > STAGES[s.id - 2].hpScale);
  }
  const g = createGame(1);
  assert.equal(build(g, "nova", 0), false);
  assert.equal(g.energy, g.stage.budget);
});
test("1×, 2× and 3× produce the same simulation for equal game time", () => {
  const play = (speed, frames) => {
    const g = createGame(5);
    build(g, "gatling", 0);
    build(g, "cryo", 4);
    setSpeed(g, speed);
    startWave(g);
    for (let i = 0; i < frames; i++) advance(g, 1 / 60);
    return g;
  };
  const a = play(1, 720),
    b = play(2, 360),
    c = play(3, 240);
  for (const g of [b, c]) {
    assert.ok(Math.abs(a.time - g.time) < 1e-8);
    for (const key of ["core", "energy", "kills", "spawnIndex"])
      assert.equal(g[key], a[key]);
    assert.equal(g.enemies.length, a.enemies.length);
    g.enemies.forEach((e, i) => {
      assert.ok(Math.abs(e.hp - a.enemies[i].hp) < 1e-6);
      assert.ok(Math.abs(e.distance - a.enemies[i].distance) < 1e-6);
    });
  }
  assert.equal(setSpeed(a, 4), false);
});
test("pause freezes simulation, projectiles and cooldowns and blocks economy actions", () => {
  const g = createGame(20);
  build(g, "gatling", 0);
  const id = g.towers[0].id;
  startWave(g);
  spawnEnemy(g, { kind: "crawler", lane: 0 });
  skill(g, "emp");
  g.paused = true;
  const before = JSON.stringify(g);
  advance(g, 0.1);
  tick(g);
  assert.equal(build(g, "cryo", 1), false);
  assert.equal(upgrade(g, id), false);
  assert.equal(sell(g, id), false);
  assert.equal(startWave(g), false);
  assert.equal(skill(g, "airstrike"), false);
  assert.equal(JSON.stringify(g), before);
});
test("build IDs stay unique, upgrade costs are charged, sale returns 70% invested", () => {
  const g = createGame(20),
    initial = g.energy;
  assert.ok(build(g, "gatling", 5));
  assert.ok(build(g, "cryo", 1));
  const id = g.towers[0].id;
  assert.notEqual(id, g.towers[1].id);
  assert.equal(build(g, "gatling", 5), false);
  assert.ok(upgrade(g, id));
  const spent = g.towers[0].spent;
  assert.ok(sell(g, id));
  assert.equal(g.energy, initial - 125 - spent + Math.floor(spent * 0.7));
  assert.equal(sell(g, id), false);
});
test("missiles delay damage until impact, while railguns bypass armor", () => {
  const g = createGame(20);
  build(g, "missile", 0);
  const t = g.towers[0],
    e = spawnEnemy(g, { kind: "armored", lane: 0 });
  e.x = t.x;
  e.y = t.y;
  e.stun = 10;
  e.distance = 0; // Pin to a known nearby lane point through a deterministic test route.
  g.stage = {
    ...g.stage,
    paths: [
      [
        { x: t.x, y: t.y },
        { x: t.x + 300, y: t.y },
      ],
    ],
  };
  e.length = 300;
  const before = e.hp;
  tick(g, 1 / 60);
  assert.equal(e.hp, before);
  assert.equal(g.projectiles.length, 1);
  for (let i = 0; i < 25; i++) tick(g, 1 / 60);
  assert.ok(e.hp < before);
  const h = createGame(20);
  build(h, "railgun", 0);
  const r = h.towers[0];
  h.stage = {
    ...h.stage,
    paths: [
      [
        { x: r.x, y: r.y },
        { x: r.x + 300, y: r.y },
      ],
    ],
  };
  const armored = spawnEnemy(h, { kind: "armored", lane: 0 });
  armored.stun = 10;
  const hp = armored.hp;
  tick(h, 1 / 60);
  assert.ok(Math.abs(hp - armored.hp - TOWERS.railgun.damage) < 0.001);
});
test("skills validate their target conditions and enforce cooldowns", () => {
  const g = createGame(20);
  assert.equal(skill(g, "airstrike"), false);
  assert.equal(skill(g, "repair"), false);
  g.core = 65;
  assert.ok(skill(g, "repair"));
  assert.equal(g.core, 95);
  assert.equal(skill(g, "repair"), false);
  const e = spawnEnemy(g, { kind: "shield", lane: 0 });
  assert.ok(skill(g, "emp"));
  assert.equal(e.stun, 4.5);
  assert.ok(e.shield < e.maxShield);
  assert.equal(skill(g, "emp"), false);
});
test("kill rewards occur once and defeat cannot advance to another wave", () => {
  const g = createGame(1);
  const e = spawnEnemy(g, { kind: "crawler", lane: 0 });
  e.hp = 0;
  const energy = g.energy;
  tick(g);
  assert.equal(g.kills, 1);
  assert.ok(g.energy > energy);
  const after = g.energy;
  tick(g);
  assert.equal(g.kills, 1);
  assert.equal(g.energy, after);
  const h = createGame(20);
  startWave(h);
  const boss = spawnEnemy(h, { kind: "sovereign", lane: 0 });
  boss.distance = boss.length;
  tick(h);
  assert.equal(h.phase, "defeat");
  assert.equal(startWave(h), false);
});
for (const s of STAGES)
  test(`stage ${s.id}: all three waves and boss are clearable by a budget-limited strategy`, () => {
    const result = run(s.id);
    assert.equal(result.phase, "victory", JSON.stringify(result));
    assert.ok(result.core > 0);
  });
test("cryo slows, tesla chains, plasma burns, nova stuns and healers restore nearby allies", () => {
  for (const kind of ["cryo", "tesla", "plasma", "nova"]) {
    const g = createGame(20);
    build(g, kind, 0);
    const t = g.towers[0];
    g.stage = {
      ...g.stage,
      paths: [
        [
          { x: t.x, y: t.y },
          { x: t.x + 300, y: t.y },
        ],
      ],
    };
    const enemies = [0, 1, 2].map(() =>
      spawnEnemy(g, { kind: "armored", lane: 0 }),
    );
    tick(g, 1 / 60);
    if (kind === "cryo") assert.ok(enemies[0].slow > 0);
    if (kind === "tesla") assert.ok(enemies.every((e) => e.hp < e.maxHp));
    if (kind === "plasma") assert.ok(enemies.every((e) => e.burn > 0));
    if (kind === "nova") assert.ok(enemies.every((e) => e.stun > 0));
  }
  const g = createGame(20),
    ally = spawnEnemy(g, { kind: "armored", lane: 0 });
  ally.hp -= 100;
  const hp = ally.hp;
  spawnEnemy(g, { kind: "healer", lane: 0 });
  tick(g, 1 / 60);
  assert.ok(ally.hp > hp);
});
test("a completed third wave emits victory once; restart resets combat and speed", () => {
  const g = createGame(1);
  g.phase = "combat";
  g.wave = 3;
  g.spawnIndex = 0;
  g.plan = [];
  tick(g);
  assert.equal(g.phase, "victory");
  tick(g);
  assert.equal(g.events.filter((e) => e.type === "victory").length, 1);
  setSpeed(g, 3);
  const fresh = createGame(1);
  assert.equal(fresh.speed, 1);
  assert.equal(fresh.wave, 0);
  assert.deepEqual(fresh.towers, []);
  assert.equal(fresh.core, 100);
});

test("waves continue automatically once, while initial setup and pauses wait for the player", () => {
  const g = createGame(1);
  for (let i = 0; i < 180; i++) advance(g, 1 / 60);
  assert.equal(g.wave, 0);
  startWave(g);
  g.plan = [];
  tick(g);
  assert.equal(g.phase, "build");
  assert.equal(g.nextWaveIn, 2);
  const supplied = g.energy;
  g.paused = true;
  for (let i = 0; i < 180; i++) advance(g, 1 / 60);
  assert.equal(g.nextWaveIn, 2);
  g.paused = false;
  for (let i = 0; i < 119; i++) advance(g, 1 / 60);
  assert.equal(g.wave, 1);
  advance(g, 1 / 60);
  assert.equal(g.wave, 2);
  assert.equal(g.phase, "combat");
  assert.equal(g.nextWaveIn, null);
  assert.equal(g.energy, supplied);
  assert.equal(g.events.filter((e) => e.type === "wave").length, 2);
  assert.equal(startWave(g), false);
});

test("auto-wave delay follows game speed, can be skipped, and keeps boss stats proportional", () => {
  for (const speed of [1, 2, 3]) {
    const g = createGame(1);
    g.phase = "combat";
    g.wave = 1;
    tick(g);
    setSpeed(g, speed);
    for (let i = 0; i < 120 / speed; i++) advance(g, 1 / 60);
    assert.equal(g.wave, 2);
  }
  const g = createGame(1);
  g.phase = "combat";
  g.wave = 1;
  tick(g);
  assert.ok(startWave(g));
  assert.equal(g.nextWaveIn, null);
  const item = wavePlan(g.stage, 1).find((e) => ENEMIES[e.kind].boss);
  const boss = spawnEnemy(g, item);
  assert.ok(boss.maxHp < ENEMIES.titan.hp);
  assert.ok(boss.coreDamage < ENEMIES.titan.damage);
  assert.equal(boss.rewardScale, item.strength);
  assert.ok(boss.name.includes("타이탄"));
});

import {
  STAGES,
  TOWERS,
  ENEMIES,
  pointAt,
  pathLength,
  wavePlan,
} from "./data.js?v=20260909-resume";
export const STEP = 1 / 60;
export function createGame(stageId = 1) {
  const stage = STAGES[stageId - 1];
  if (!stage) throw new RangeError("Unknown stage");
  return {
    stage,
    phase: "build",
    paused: false,
    speed: 1,
    time: 0,
    accumulator: 0,
    core: 100,
    energy: stage.budget,
    wave: 0,
    waveTime: 0,
    plan: [],
    spawnIndex: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    events: [],
    eventId: 0,
    nextId: 1,
    kills: 0,
    score: 0,
    cooldowns: { airstrike: 0, emp: 0, repair: 0 },
    status: stage.brief,
  };
}
const emit = (g, type, data = {}) => {
  g.events.push({ id: ++g.eventId, type, time: g.time, ...data });
  if (g.events.length > 240) g.events.splice(0, g.events.length - 240);
};
export function setSpeed(g, speed) {
  if (![1, 2, 3].includes(speed)) return false;
  g.speed = speed;
  return true;
}
export function build(g, kind, padId) {
  if (g.paused || !["build", "combat"].includes(g.phase)) return false;
  const t = TOWERS[kind],
    pad = g.stage.pads[padId];
  if (
    !t ||
    !pad ||
    t.unlock > g.stage.id ||
    g.towers.some((t) => t.padId === padId)
  )
    return false;
  if (g.energy < t.cost) {
    g.status = "건설 에너지가 부족합니다.";
    return false;
  }
  g.energy -= t.cost;
  g.towers.push({
    ...pad,
    id: g.nextId++,
    padId,
    kind,
    level: 1,
    cooldown: 0,
    spent: t.cost,
  });
  emit(g, "build", { ...pad, color: t.color });
  g.status = `${t.name} 배치 완료`;
  return true;
}
export const upgradeCost = (t) =>
  Math.round(TOWERS[t.kind].cost * (0.7 + t.level * 0.3));
export const towerStats = (t) => {
  const d = TOWERS[t.kind];
  return {
    ...d,
    damage: d.damage * (1 + (t.level - 1) * 0.7),
    rate: d.rate / (1 + (t.level - 1) * 0.14),
    range: d.range * (1 + (t.level - 1) * 0.1),
  };
};
export function upgrade(g, id) {
  const t = g.towers.find((t) => t.id === id);
  if (!t || t.level >= 3 || g.paused || !["build", "combat"].includes(g.phase))
    return false;
  const cost = upgradeCost(t);
  if (g.energy < cost) {
    g.status = "강화 에너지가 부족합니다.";
    return false;
  }
  g.energy -= cost;
  t.spent += cost;
  t.level++;
  emit(g, "build", { x: t.x, y: t.y, color: TOWERS[t.kind].color });
  g.status = `${TOWERS[t.kind].name} Mk.${t.level} 강화 완료`;
  return true;
}
export function sell(g, id) {
  if (g.paused || !["build", "combat"].includes(g.phase)) return false;
  const t = g.towers.find((t) => t.id === id);
  if (!t) return false;
  g.energy += Math.floor(t.spent * 0.7);
  g.towers = g.towers.filter((t) => t.id !== id);
  g.status = "시설 회수 · 투자 에너지 70% 반환";
  return true;
}
export function startWave(g) {
  if (g.paused || g.phase !== "build") return false;
  g.wave++;
  g.phase = "combat";
  g.waveTime = 0;
  g.spawnIndex = 0;
  g.plan = wavePlan(g.stage, g.wave);
  emit(g, "wave", { wave: g.wave });
  g.status = `공세 ${g.wave}/3 · 전선 개방`;
  return true;
}
function hurt(enemy, damage, pierce = false) {
  let amount = damage * (pierce ? 1 : 1 - (ENEMIES[enemy.kind].armor || 0));
  if (enemy.shield > 0) {
    const absorbed = Math.min(enemy.shield, amount);
    enemy.shield -= absorbed;
    amount -= absorbed;
  }
  enemy.hp -= amount;
  enemy.flash = 0.1;
}
export function skill(g, kind) {
  if (
    g.paused ||
    !["build", "combat"].includes(g.phase) ||
    g.cooldowns[kind] !== 0
  )
    return false;
  if (kind === "repair") {
    if (g.core >= 100) return false;
    g.core = Math.min(100, g.core + 30);
    g.cooldowns.repair = 36;
    emit(g, "repair", { ...g.stage.core, color: "#82ffcb" });
    g.status = "코어 복구 +30";
    return true;
  }
  if (!g.enemies.length) return false;
  if (kind === "emp") {
    g.enemies.forEach((e) => {
      e.stun = 4.5;
      hurt(e, 25 + g.stage.id * 4, true);
    });
    g.cooldowns.emp = 30;
    emit(g, "emp", { x: 640, y: 360, color: "#b8a0ff" });
    g.status = "EMP · 모든 적 4.5초 정지";
    return true;
  }
  if (kind === "airstrike") {
    g.enemies.forEach((e) => {
      hurt(e, (ENEMIES[e.kind].boss ? 350 : 170) * g.stage.hpScale, true);
      emit(g, "explosion", { x: e.x, y: e.y, color: "#ffaf67", power: 2 });
    });
    g.cooldowns.airstrike = 24;
    emit(g, "airstrike");
    g.status = "궤도 폭격 · 전 구역 타격";
    return true;
  }
  return false;
}
export function spawnEnemy(g, item) {
  const d = ENEMIES[item.kind],
    path = g.stage.paths[item.lane];
  const scale = g.stage.hpScale * (1 + (g.wave - 1) * 0.13);
  const p = path[0];
  const e = {
    id: g.nextId++,
    kind: item.kind,
    lane: item.lane,
    distance: 0,
    length: pathLength(path),
    x: p.x,
    y: p.y,
    hp: d.hp * scale,
    maxHp: d.hp * scale,
    shield: (d.shield || 0) * scale,
    maxShield: (d.shield || 0) * scale,
    speed: d.speed * g.stage.speedScale,
    stun: 0,
    slow: 0,
    burn: 0,
    flash: 0,
  };
  g.enemies.push(e);
  if (d.boss) emit(g, "boss", { name: d.name });
  return e;
}
export function tick(g, dt = STEP) {
  if (g.paused || !["build", "combat"].includes(g.phase)) return;
  g.time += dt;
  for (const k in g.cooldowns)
    g.cooldowns[k] = Math.max(0, g.cooldowns[k] - dt);
  if (g.phase === "combat") {
    g.waveTime += dt;
    while (
      g.spawnIndex < g.plan.length &&
      g.plan[g.spawnIndex].at <= g.waveTime
    ) {
      spawnEnemy(g, g.plan[g.spawnIndex++]);
    }
  }
  for (const e of g.enemies) {
    e.stun = Math.max(0, e.stun - dt);
    e.slow = Math.max(0, e.slow - dt);
    e.flash = Math.max(0, e.flash - dt);
    if (e.burn > 0) {
      e.burn -= dt;
      hurt(e, 18 * dt, true);
    }
    if (e.hp <= 0) continue;
    if (ENEMIES[e.kind].heal && e.stun === 0)
      for (const ally of g.enemies)
        if (ally.hp > 0 && Math.hypot(ally.x - e.x, ally.y - e.y) < 110)
          ally.hp = Math.min(ally.maxHp, ally.hp + ENEMIES[e.kind].heal * dt);
    const phaseBoost =
      e.kind === "specter" && Math.sin(g.time * 2 + e.id) > 0.65 ? 1.55 : 1;
    if (e.stun === 0)
      e.distance += e.speed * (e.slow > 0 ? 0.45 : 1) * phaseBoost * dt;
    Object.assign(e, pointAt(g.stage.paths[e.lane], e.distance));
    if (e.distance >= e.length) {
      e.escaped = true;
      g.core = Math.max(0, g.core - ENEMIES[e.kind].damage);
      emit(g, "corehit", { ...g.stage.core, color: "#ff736b" });
      g.status = "코어 피격 · 전선을 보강하세요";
    }
  }
  for (const projectile of g.projectiles) {
    const target = g.enemies.find(
      (e) => e.id === projectile.targetId && !e.escaped && e.hp > 0,
    );
    if (projectile.kind === "missile" && target) {
      projectile.x2 = target.x;
      projectile.y2 = target.y;
    }
    projectile.remaining -= dt;
    if (projectile.remaining <= 0) {
      for (const e of g.enemies)
        if (
          !e.escaped &&
          e.hp > 0 &&
          Math.hypot(e.x - projectile.x2, e.y - projectile.y2) <=
            projectile.splash
        )
          hurt(e, projectile.damage);
      emit(g, "explosion", {
        x: projectile.x2,
        y: projectile.y2,
        color: projectile.color,
        power: projectile.kind === "mortar" ? 2 : 1.3,
      });
    }
  }
  g.projectiles = g.projectiles.filter((p) => p.remaining > 0);
  for (const t of g.towers) {
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown > 0) continue;
    const d = towerStats(t);
    const targets = g.enemies
      .filter(
        (e) =>
          e.hp > 0 && !e.escaped && Math.hypot(t.x - e.x, t.y - e.y) <= d.range,
      )
      .sort((a, b) => b.distance / b.length - a.distance / a.length);
    if (!targets.length) continue;
    const count = d.nova ? targets.length : d.chain ? d.chain + t.level - 1 : 1;
    t.cooldown = d.rate;
    for (const [i, e] of targets.slice(0, count).entries()) {
      if (t.kind === "missile" || t.kind === "mortar") {
        g.projectiles.push({
          id: g.nextId++,
          kind: t.kind,
          targetId: e.id,
          x1: t.x,
          y1: t.y,
          x2: e.x,
          y2: e.y,
          remaining: 0.38,
          total: 0.38,
          damage: d.damage,
          splash: d.splash,
          color: d.color,
        });
      } else {
        hurt(
          e,
          d.damage * (d.chain ? Math.max(0.6, 1 - i * 0.12) : 1),
          d.pierce,
        );
        if (d.slow) e.slow = d.slow;
        if (d.burn) {
          e.burn = d.burn;
          for (const a of targets)
            if (a !== e && Math.hypot(a.x - e.x, a.y - e.y) < d.splash) {
              hurt(a, d.damage * 0.6);
              a.burn = d.burn;
            }
        }
        if (d.nova) e.stun = 0.35;
      }
      emit(g, "shot", {
        kind: t.kind,
        x1: t.x,
        y1: t.y,
        x2: e.x,
        y2: e.y,
        color: d.color,
        targetId: e.id,
      });
    }
  }
  for (const e of g.enemies)
    if (e.hp <= 0 && !e.escaped) {
      g.kills++;
      const reward = Math.round(
        ENEMIES[e.kind].reward * (1 + g.stage.id * 0.025),
      );
      g.energy += reward;
      g.score += reward * 10;
      emit(g, "kill", {
        kind: e.kind,
        x: e.x,
        y: e.y,
        color: ENEMIES[e.kind].color,
        boss: !!ENEMIES[e.kind].boss,
        reward,
      });
    }
  g.enemies = g.enemies.filter((e) => e.hp > 0 && !e.escaped);
  if (g.core <= 0) {
    g.phase = "defeat";
    emit(g, "defeat");
    return;
  }
  if (
    g.phase === "combat" &&
    g.spawnIndex === g.plan.length &&
    g.enemies.length === 0 &&
    g.projectiles.length === 0
  ) {
    g.energy += 85 + g.stage.id * 8;
    g.phase = g.wave === 3 ? "victory" : "build";
    g.status =
      g.wave === 3
        ? "구역 확보 · 다음 스테이지 진입 가능"
        : "공세 방어 성공 · 보급 도착";
    emit(g, g.phase === "victory" ? "victory" : "clear");
  }
}
// A fixed simulation step makes all systems agree at 1×, 2× and 3×.
export function advance(g, realDelta) {
  if (g.paused || !["build", "combat"].includes(g.phase)) {
    g.accumulator = 0;
    return;
  }
  g.accumulator += Math.min(0.1, Math.max(0, realDelta)) * g.speed;
  while (g.accumulator >= STEP) {
    tick(g, STEP);
    g.accumulator -= STEP;
  }
}

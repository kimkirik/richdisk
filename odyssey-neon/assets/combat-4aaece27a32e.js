// Combat uses a fixed 60 Hz clock in an 800 × 960 playfield.
export const WEAPONS = [
  {
    id: "laser",
    name: "관통 레이저",
    short: "관통",
    color: "#55f7ff",
    damage: 1.65,
    interval: 10,
    speed: 19,
    description: "좁은 직선 · 최대 3기 관통",
  },
  {
    id: "bullet",
    name: "확산탄",
    short: "확산",
    color: "#ffd86a",
    damage: 0.7,
    interval: 12,
    speed: 13,
    description: "3~7갈래 부채꼴 · 넓은 범위",
  },
  {
    id: "rocket",
    name: "폭발 미사일",
    short: "폭발",
    color: "#ff9457",
    damage: 3.4,
    interval: 24,
    speed: 10,
    description: "묵직한 직격 · 주변 적 폭발 피해",
  },
  {
    id: "homing",
    name: "유도탄",
    short: "유도",
    color: "#a9ff8c",
    damage: 1.35,
    interval: 18,
    speed: 12,
    description: "적을 추적 · 이동하는 표적에 유리",
  },
];
export const weaponSpec = (id) =>
  WEAPONS.find((w) => w.id === id) || WEAPONS[0];
export const formationOffsets = (double) => (double === 1 ? [-22, 22] : [0]);

export const shipGeometry = (double) => ({
  scale: double >= 2 ? 1 : 0.6,
  marginX: double >= 2 ? 46 : double === 1 ? 50 : 28,
  bottomMargin: double >= 2 ? 62 : 42,
  hitRadius: double >= 2 ? 14 : 10,
});

export function clampShip(ship, width = 800, height = 960) {
  const geometry = shipGeometry(ship.double);
  ship.x = Math.max(
    geometry.marginX,
    Math.min(width - geometry.marginX, ship.x),
  );
  ship.y = Math.max(60, Math.min(height - geometry.bottomMargin, ship.y));
}

// Keep every target visible and within reach of the outermost player barrel.
// Previously enemies could drift beyond the screen while a large hull stopped
// its center gun too far from the edge to hit even visible enemies there.
export function keepFoeInPlay(foe, width = 800) {
  const margin = foe.r + 12;
  if (foe.x < margin) {
    foe.x = margin;
    foe.vx = Math.abs(foe.vx || 0);
  } else if (foe.x > width - margin) {
    foe.x = width - margin;
    foe.vx = -Math.abs(foe.vx || 0);
  }
}

export function announce(state, text, color = "#55f7ff") {
  state.notice = text;
  state.noticeColor = color;
  state.noticeTicks = 150;
}

export function fireVolley(state) {
  const ship = state.ship,
    spec = weaponSpec(ship.weapon);
  const boost = state.driveTicks > 0;
  const interval = Math.max(
    5,
    Math.round((spec.interval - ship.rapid) * (boost ? 0.7 : 1)),
  );
  if (state.tick - state.lastFire < interval) return [];
  const room = 220 - state.shots.filter((s) => !s.enemy && !s.dead).length;
  if (room <= 0) return [];
  state.lastFire = state.tick;
  const level = Math.max(0, Math.min(4, ship.weaponLevel));
  const count =
    spec.id === "bullet"
      ? 3 + 2 * Math.floor(level / 2)
      : spec.id === "laser"
        ? 1 + Math.floor(level / 2)
        : spec.id === "rocket"
          ? level >= 4
            ? 2
            : 1
          : level >= 3
            ? 2
            : 1;
  // Two ships fire side by side. The third joins into one larger fighter:
  // same weapon pattern as a single ship, exactly three times the damage.
  const fused = ship.double >= 2;
  const power =
    spec.damage * (1 + level * 0.4) * (boost ? 1.25 : 1) * (fused ? 3 : 1);
  const offsets = formationOffsets(ship.double),
    result = [];
  // Interleave barrels so every joined ship fires even near the shot limit.
  for (let barrel = 0; barrel < count; barrel++) {
    for (const offset of offsets) {
      if (result.length >= room) break;
      const slot = barrel - (count - 1) / 2;
      const angle =
        spec.id === "bullet"
          ? slot * 0.14
          : spec.id === "homing"
            ? slot * 0.24
            : 0;
      const x =
        ship.x +
        offset +
        (spec.id === "laser" || spec.id === "rocket" ? slot * 10 : 0);
      const y = ship.y - 43 * shipGeometry(ship.double).scale + (offset ? 4 : 0);
      result.push({
        x,
        y,
        prevX: x,
        prevY: y,
        vx: Math.sin(angle) * spec.speed,
        vy: -Math.cos(angle) * spec.speed,
        kind: spec.id,
        power,
        fused,
        age: 0,
        pierce: spec.id === "laser" ? 3 : 1,
        hit: new Set(),
        blast: spec.id === "rocket" ? 65 + level * 5 : 0,
      });
    }
  }
  state.shots.push(...result);
  return result;
}

export function advanceShot(shot, foes) {
  shot.prevX = shot.x;
  shot.prevY = shot.y;
  shot.age = (shot.age || 0) + 1;
  if (shot.kind === "homing" && !shot.enemy) {
    const target = foes
      .filter((f) => f.hp > 0 && f.y > -40 && f.y < shot.y + 20)
      .reduce(
        (best, f) =>
          !best ||
          Math.hypot(f.x - shot.x, f.y - shot.y) <
            Math.hypot(best.x - shot.x, best.y - shot.y)
            ? f
            : best,
        null,
      );
    if (target) {
      const angle = Math.atan2(shot.vy, shot.vx),
        desired = Math.atan2(target.y - shot.y, target.x - shot.x);
      const delta = Math.atan2(
        Math.sin(desired - angle),
        Math.cos(desired - angle),
      );
      const turn = angle + Math.max(-0.075, Math.min(0.075, delta));
      shot.vx = Math.cos(turn) * 12;
      shot.vy = Math.sin(turn) * 12;
    }
  }
  shot.x += shot.vx;
  shot.y += shot.vy;
  if (shot.age > 180) shot.dead = true;
}

// Swept collision prevents fast laser shots passing through small enemies.
function touches(shot, foe) {
  const ax = shot.prevX ?? shot.x,
    ay = shot.prevY ?? shot.y;
  const dx = shot.x - ax,
    dy = shot.y - ay,
    length = dx * dx + dy * dy;
  const u = length
    ? Math.max(0, Math.min(1, ((foe.x - ax) * dx + (foe.y - ay) * dy) / length))
    : 0;
  return Math.hypot(foe.x - ax - u * dx, foe.y - ay - u * dy) < foe.r + 4;
}

export function resolveShotHits(shot, foes, onKill, onEffect = () => {}) {
  if (shot.enemy || shot.dead) return;
  for (const foe of foes) {
    if (foe.hp <= 0 || shot.hit.has(foe) || !touches(shot, foe)) continue;
    shot.hit.add(foe);
    foe.hp -= shot.power;
    foe.flash = 5;
    if (foe.hp <= 0) onKill(foe);
    if (shot.blast) {
      onEffect(shot.x, shot.y, "#ff9457", 18);
      for (const nearby of foes) {
        if (nearby === foe || nearby.hp <= 0) continue;
        const distance = Math.hypot(nearby.x - shot.x, nearby.y - shot.y);
        if (distance < shot.blast + nearby.r) {
          nearby.hp -= shot.power * 0.55;
          nearby.flash = 5;
          if (nearby.hp <= 0) onKill(nearby);
        }
      }
    }
    if (--shot.pierce <= 0) {
      shot.dead = true;
      break;
    }
  }
}

export function receiveDamage(state) {
  const ship = state.ship;
  if (ship.inv > 0) return false;
  state.combo = 0;
  state.comboTicks = 0;
  state.driveCharge = 0;
  state.driveTicks = 0;
  if (ship.shield > 0) {
    ship.shield--;
    ship.inv = 90;
    announce(state, "실드가 충격을 막았습니다", "#ffd86a");
  } else {
    if (ship.double > 0) {
      ship.double--;
      announce(state, "동료 기체 이탈 · D로 다시 합체", "#ffd86a");
    } else {
      ship.life--;
      announce(state, "피격! 잠시 무적", "#ff6b85");
    }
    ship.weaponLevel = Math.max(0, ship.weaponLevel - 1);
    ship.spread = Math.max(0, ship.spread - 0.5);
    ship.rapid = Math.max(0, ship.rapid - 0.5);
    ship.inv = 150;
  }
  return true;
}

export function recordKill(state) {
  state.combo = Math.min(999, state.combo + 1);
  state.comboTicks = 240;
  if (!(state.driveTicks > 0)) {
    state.driveCharge = (state.driveCharge || 0) + 1;
    if (state.driveCharge >= 12) {
      state.driveCharge = 0;
      state.driveTicks = 360;
      announce(state, "OVERDRIVE · 6초간 화력 상승!", "#ffd86a");
    }
  }
}

export function tickCombat(state) {
  state.totalTicks = (state.totalTicks || 0) + 1;
  if (state.noticeTicks > 0) state.noticeTicks--;
  if (state.driveTicks > 0) state.driveTicks--;
  if (state.comboTicks > 0 && --state.comboTicks === 0) {
    state.combo = 0;
    state.driveCharge = 0;
  }
}

export function collectDrop(state, drop) {
  const ship = state.ship;
  if (drop.kind === "M") {
    ship.weaponLevel = Math.min(4, ship.weaponLevel + 1);
    ship.spread = Math.min(4, ship.spread + 0.5);
    ship.rapid = Math.min(4, ship.rapid + 0.5);
    announce(
      state,
      `${weaponSpec(ship.weapon).name} · 강화 ${ship.weaponLevel}/4`,
    );
  } else if (drop.kind === "D") {
    if (ship.double < 2) {
      ship.double++;
      ship.inv = Math.max(ship.inv, 120);
      announce(
        state,
        ship.double >= 2
          ? "3기 초합체! · 미사일 위력 ×3"
          : "2기 합체! · 나란히 동시 발사",
        "#ffd86a",
      );
    } else {
      ship.shield = Math.min(5, ship.shield + 1);
      state.score += 250;
      announce(state, "3기 합체 MAX · 실드 +1 · 250점", "#ffd86a");
    }
  } else if (drop.kind === "H") {
    ship.shield = Math.min(5, ship.shield + 1);
    ship.inv = Math.max(
      ship.inv,
      ship.shield >= 5 ? 600 : ship.shield >= 3 ? 300 : 0,
    );
    announce(state, `실드 ${ship.shield}/5 · 피격 방어`);
  } else if (drop.kind === "L") ship.life = Math.min(9, ship.life + 1);
  else if (drop.kind === "B") ship.bombs = Math.min(9, ship.bombs + 1);
  else if (drop.kind === "G") state.score += 100;
}

export function drawPlayerShot(ctx, shot, busy) {
  const spec = weaponSpec(shot.kind);
  ctx.save();
  ctx.translate(shot.x, shot.y);
  ctx.rotate(Math.atan2(shot.vy, shot.vx) + Math.PI / 2);
  if (shot.fused) ctx.scale(1.55, 1.3);
  ctx.shadowBlur = busy ? 0 : 12;
  ctx.shadowColor = spec.color;
  ctx.fillStyle = spec.color;
  ctx.strokeStyle = "#f3ffff";
  ctx.lineWidth = 1;
  if (shot.kind === "laser") {
    ctx.fillRect(-2, -20, 4, 30);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-0.8, -18, 1.6, 25);
  } else if (shot.kind === "bullet") {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(4, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-4, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(5, -3);
    ctx.lineTo(5, 6);
    ctx.lineTo(9, 11);
    ctx.lineTo(0, 8);
    ctx.lineTo(-9, 11);
    ctx.lineTo(-5, 6);
    ctx.lineTo(-5, -3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = shot.kind === "rocket" ? "#ffcf72" : "#d9ffba";
    ctx.fillRect(-2, 10, 4, 8 + (shot.age % 6));
  }
  ctx.restore();
}

export function drawCombatOverlay(ctx, state) {
  if (state.noticeTicks > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.noticeTicks / 25);
    ctx.textAlign = "center";
    ctx.font = "bold 21px sans-serif";
    ctx.fillStyle = "#041020dd";
    ctx.fillRect(110, 92, 580, 40);
    ctx.fillStyle = state.noticeColor || "#55f7ff";
    ctx.fillText(state.notice, 400, 120);
    ctx.restore();
  }
}

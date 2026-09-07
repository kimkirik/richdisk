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
  state.squadStreak = 0;
  if (state.squad) state.squad.flawless = false;
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

export function squadBonus(state) {
  const streak = state.squad?.flawless === false ? 0 : Math.min(4, state.squadStreak || 0);
  return Math.round(500 * (Math.min(2, state.ship.double) + 1) * (1 + streak * 0.25));
}

export function tickSquad(state) {
  const current = state.squad;
  if (current) {
    const missed = current.members.some(foe => !foe.squadCounted && (foe.y > 1010 || foe.hp <= 0));
    if (missed || state.totalTicks >= current.expires) {
      state.squad = null;
      state.squadStreak = 0;
      state.nextSquad = state.totalTicks + 563;
      announce(state, "편대가 이탈했습니다 · 다음 편대에 도전!", "#a9c5dc");
    }
    return;
  }
  // Do not crowd a boss entrance, an existing challenge, or the enemy cap.
  if (state.totalTicks < (state.nextSquad ?? 240) || state.boss ||
      state.level % 5 === 0 || state.level % 5 === 4 || state.foes.length > 48) return;
  const id = state.squadSerial = (state.squadSerial || 0) + 1;
  const pattern = (id - 1) % 3;
  const names = ["V 편대", "파도 편대", "돌격 편대"];
  const members = Array.from({ length: 5 }, (_, slot) => {
    const hp = 1 + Math.floor(state.level / 20);
    return {
      x: 400 + (slot - 2) * 72,
      y: -35 - (pattern === 1 ? slot * 22 : Math.abs(slot - 2) * 38),
      vx: 0, vy: 2.35, hp, max: hp, r: 17, phase: 0,
      squadId: id, squadSlot: slot, squadPattern: pattern, age: 0, bornTick: state.tick + slot * 13,
    };
  });
  state.squad = { id, members, kills: 0, total: 5, flawless: true, expires: state.totalTicks + 720 };
  state.foes.push(...members);
  state.nextSquad = state.totalTicks + 1125;
  announce(state, `${names[pattern]} 출현 · 5기 전멸 보너스!`, "#a9ff8c");
}

export function recordSquadKill(state, foe) {
  const squad = state.squad;
  if (!squad || foe.squadId !== squad.id || foe.squadCounted) return false;
  foe.squadCounted = true;
  if (++squad.kills !== squad.total) return false;
  const bonus = squadBonus(state);
  state.score += bonus;
  state.squadStreak = squad.flawless ? Math.min(5, (state.squadStreak || 0) + 1) : 0;
  // A guaranteed upgrade makes a perfect formation a useful goal, even early on.
  const kind = squad.id % 2 ? "D" : "M";
  state.drops.push({ x: Math.max(35, Math.min(765, foe.x)), y: Math.min(850, foe.y), kind });
  announce(state, `${squad.flawless ? "PERFECT!" : "편대 전멸!"} +${bonus.toLocaleString()}점 · ${kind} 보너스`, "#a9ff8c");
  state.squad = null;
  return true;
}

export function moveFoe(foe, state) {
  foe.phase += foe.final ? 0.055 : foe.elite ? 0.05 : 0.035;
  if (foe.squadId) {
    foe.age++;
    const slot = foe.squadSlot - 2;
    if (foe.squadPattern === 2 && foe.age >= 170) {
      if (foe.age === 170) {
        const dx = state.ship.x - foe.x, dy = Math.max(100, state.ship.y - foe.y);
        const length = Math.hypot(dx, dy);
        foe.vx = dx / length * 3.4; foe.vy = dy / length * 3.4;
      }
      foe.x += foe.vx; foe.y += foe.vy;
    } else {
      const wave = foe.squadPattern === 1 ? Math.sin(foe.age * 0.025 + slot * 0.3) * 105 : Math.sin(foe.age * 0.014) * 55;
      foe.x = 400 + slot * 72 + wave;
      foe.y += foe.vy;
    }
  } else {
    foe.y += foe.vy;
    foe.x += foe.vx + Math.sin(foe.phase) * (foe.final ? 5 : foe.boss ? 3 : foe.elite ? 2.8 : 1.5);
  }
  keepFoeInPlay(foe);
  if (foe.boss && foe.y > (foe.final ? 125 : 100)) foe.vy = 0;
}

export function tickBossAttack(foe, state) {
  if (!foe.boss || foe.hp <= 0 || foe.vy !== 0) return false;
  if (!foe.phaseTwo && foe.hp <= foe.max * 0.5) {
    foe.phaseTwo = true;
    announce(state, "보스 2페이즈 · 붉은 예고선 밖으로!", "#ff9457");
  }
  if (foe.beam) {
    const beam = foe.beam;
    if (beam.warning > 0) { beam.warning--; return false; }
    if (beam.remaining-- <= 0) { foe.beam = null; return false; }
    return Math.abs(state.ship.x - beam.x) < beam.width / 2 + shipGeometry(state.ship.double).hitRadius &&
      state.ship.y > foe.y + foe.r * 0.5;
  }
  foe.attackClock = (foe.attackClock || 0) + 1;
  const interval = foe.phaseTwo ? 150 : 210;
  if (foe.attackClock >= interval) {
    foe.attackClock = 0;
    const width = foe.final ? 112 : 88;
    foe.beam = { x: Math.max(width, Math.min(800 - width, state.ship.x)), width, warning: 72, remaining: 30 };
  }
  return false;
}

export function cancelBossAttack(foe) {
  foe.beam = null;
  foe.attackClock = 0;
}

export function fireEnemyVolley(foe, state) {
  if (foe.hp <= 0 || foe.y < 25 || foe.y > state.ship.y - 120 || foe.beam) return [];
  const age = state.tick - (foe.bornTick || 0);
  if (age <= 0) return [];
  const make = (angle, speed, kind = "missile") => ({
    x: foe.x, y: foe.y + foe.r * 0.72,
    vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed,
    enemy: true, kind,
  });
  if (foe.boss) {
    const interval = Math.max(foe.final ? 18 : 30, 70 - Math.floor(state.level / 7) - (foe.phaseTwo ? 10 : 0));
    if (age % interval) return [];
    const arms = foe.final ? 5 : foe.phaseTwo ? 4 : 3;
    return Array.from({ length: arms * 2 + 1 }, (_, i) =>
      make((i - arms) * 0.18, 4.8 + Math.min(2.6, state.level * 0.008) + (foe.phaseTwo ? 0.45 : 0)));
  }
  const interval = foe.elite ? Math.max(42, 84 - Math.floor(state.level / 8)) : Math.max(58, 112 - Math.floor(state.level / 4));
  if (age % interval) return [];
  const angle = state.level >= 3 || foe.elite
    ? Math.max(-0.65, Math.min(0.65, Math.atan2(state.ship.x - foe.x, state.ship.y - foe.y))) : 0;
  const speed = foe.elite ? 5.4 + Math.min(2, state.level * 0.007) : 4.8 + Math.min(3.2, state.level * 0.009);
  return (foe.elite ? [-0.22, 0, 0.22] : [0]).map(offset => make(angle + offset, speed, foe.elite ? "missile" : "plasma"));
}

export function drawBossBeams(ctx, foes) {
  for (const foe of foes) {
    if (foe.hp <= 0 || !foe.beam) continue;
    const beam = foe.beam, top = foe.y + foe.r * 0.5;
    ctx.save();
    if (beam.warning > 0) {
      ctx.fillStyle = "#ff455e18";
      ctx.fillRect(beam.x - beam.width / 2, top, beam.width, 960 - top);
      ctx.strokeStyle = "#ff9457"; ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.strokeRect(beam.x - beam.width / 2, top, beam.width, 960 - top);
      ctx.setLineDash([]);
      ctx.fillStyle = "#ffd86a"; ctx.font = "bold 25px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("!", beam.x, Math.min(800, top + 70));
    } else {
      ctx.fillStyle = "#ff455e66";
      ctx.fillRect(beam.x - beam.width / 2, top, beam.width, 960 - top);
      ctx.fillStyle = "#ffafbacc";
      ctx.fillRect(beam.x - beam.width * 0.3, top, beam.width * 0.6, 960 - top);
      ctx.fillStyle = "#fff3ef";
      ctx.fillRect(beam.x - 4, top, 8, 960 - top);
    }
    ctx.restore();
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
  for (const foe of state.foes) {
    if (foe.hp <= 0 || !state.squad || foe.squadId !== state.squad.id) continue;
    ctx.save(); ctx.strokeStyle = "#a9ff8c"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(foe.x, foe.y, foe.r + 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#d9ffba"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("★", foe.x, foe.y - foe.r - 12); ctx.restore();
  }
  if (state.noticeTicks > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.noticeTicks / 25);
    ctx.textAlign = "center";
    ctx.font = "bold 18px sans-serif";
    ctx.shadowColor = "#041020";
    ctx.shadowBlur = 2;
    ctx.fillStyle = state.noticeColor || "#55f7ff";
    ctx.fillText(state.notice, 400, 120);
    ctx.restore();
  }
}

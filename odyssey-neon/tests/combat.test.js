import test from 'node:test';
import assert from 'node:assert/strict';
import { WEAPONS, fireVolley, advanceShot, resolveShotHits, receiveDamage, collectDrop, recordKill, tickCombat, formationOffsets, shipGeometry, clampShip, keepFoeInPlay } from '../src/combat.js';

const state = (weapon = 'laser', double = 0, level = 0) => ({
  ship: {x: 400, y: 750, life: 3, bombs: 3, shield: 0, inv: 0, double, weapon, weaponLevel: level, rapid: 0, spread: 0},
  tick: 100, lastFire: 0, score: 0, combo: 0, shots: [], foes: [], driveTicks: 0, driveCharge: 0,
});

test('two ships fire side by side; three join into one larger ship with triple missile damage', () => {
  for (let double = 0; double <= 2; double++) {
    const s = state('laser', double);
    const shots = fireVolley(s);
    assert.equal(shots.length, double === 1 ? 2 : 1);
    assert.deepEqual(shots.map(x => x.x - s.ship.x), formationOffsets(double));
    assert.ok(shots.every(shot => shot.vy < 0 && shot.vx === 0));
    assert.equal(shots[0].power, 1.65 * (double >= 2 ? 3 : 1));
  }
  assert.ok(shipGeometry(2).scale > shipGeometry(1).scale);
  for (const weapon of WEAPONS) {
    for (let level = 0; level <= 4; level++) {
      const solo = state(weapon.id, 0, level), fused = state(weapon.id, 2, level);
      solo.driveTicks = fused.driveTicks = 60;
      const a = fireVolley(solo), b = fireVolley(fused);
      assert.equal(b.length, a.length);
      assert.equal(b[0].power, a[0].power * 3);
    }
  }
});

test('four weapons have distinct attack patterns, damage and cadence', () => {
  const fired = WEAPONS.map(w => fireVolley(state(w.id)));
  assert.equal(fired[0].length, 1);
  assert.equal(fired[1].length, 3);
  assert.ok(fired[1][0].vx < 0 && fired[1][2].vx > 0);
  assert.equal(fired[0][0].pierce, 3);
  assert.ok(fired[2][0].blast > 0);
  assert.equal(new Set(fired.map(shots => shots[0].power)).size, 4);
  assert.equal(new Set(WEAPONS.map(w => w.interval)).size, 4);
  assert.equal(fireVolley(state('bullet', 1, 4)).length, 14);
  assert.equal(fireVolley(state('bullet', 2, 4)).length, 7);
});

test('laser sweeps through three targets, never hitting one twice', () => {
  const s = state(), shot = fireVolley(s)[0];
  shot.x = 400; shot.prevX = 400; shot.y = 660; shot.prevY = 740;
  const foes = [720, 695, 670, 645].map(y => ({x: 400, y, r: 8, hp: 10}));
  resolveShotHits(shot, foes, () => {});
  assert.deepEqual(foes.map(f => f.hp), [8.35, 8.35, 8.35, 10]);
  assert.equal(shot.dead, true);
  resolveShotHits(shot, foes, () => {});
  assert.equal(foes[0].hp, 8.35);
});

test('rocket damage affects its target and nearby enemies once, without hitting distant enemies', () => {
  const shot = fireVolley(state('rocket'))[0];
  const foes = [0, 45, 200].map(dx => ({x: shot.x + dx, y: shot.y, r: 10, hp: 10}));
  resolveShotHits(shot, foes, () => {});
  assert.equal(foes[0].hp, 6.6);
  assert.ok(Math.abs(foes[1].hp - 8.13) < 0.0001);
  assert.equal(foes[2].hp, 10);
  resolveShotHits(shot, foes, () => {});
  assert.equal(foes[0].hp, 6.6);
});

test('homing missiles turn toward a living target and expire without leaving endless objects', () => {
  const shot = fireVolley(state('homing'))[0];
  advanceShot(shot, [{x: 500, y: 500, r: 15, hp: 2}]);
  assert.ok(shot.vx > 0 && shot.vy < 0);
  for (let i = 0; i < 181; i++) advanceShot(shot, []);
  assert.equal(shot.dead, true);
  assert.ok(Number.isFinite(shot.x) && Number.isFinite(shot.y));
});

test('D pickups join at most three ships; extras give shield and score', () => {
  const s = state();
  collectDrop(s, {kind: 'D'}); assert.equal(s.ship.double, 1);
  collectDrop(s, {kind: 'D'}); assert.equal(s.ship.double, 2);
  for (let i = 0; i < 10; i++) collectDrop(s, {kind: 'D'});
  assert.equal(s.ship.double, 2); assert.equal(s.ship.shield, 5); assert.equal(s.score, 2500);
});

test('shield, then a joined ship, then life absorb separate hits; invincibility prevents repeated damage', () => {
  const s = state('rocket', 2, 4);
  s.ship.shield = 1;
  receiveDamage(s);
  assert.equal(s.ship.life, 3); assert.equal(s.ship.shield, 0); assert.equal(s.ship.double, 2);
  assert.equal(receiveDamage(s), false);
  s.ship.inv = 0; receiveDamage(s);
  assert.equal(s.ship.life, 3); assert.equal(s.ship.double, 1); assert.equal(s.ship.weaponLevel, 3);
  s.ship.inv = 0; receiveDamage(s); assert.equal(s.ship.double, 0);
  s.ship.inv = 0; receiveDamage(s); assert.equal(s.ship.life, 2);
});

test('twelve uninterrupted kills activate six seconds of overdrive, then it expires', () => {
  const s = state();
  for (let i = 0; i < 12; i++) recordKill(s);
  assert.equal(s.combo, 12); assert.equal(s.driveTicks, 360);
  const boosted = fireVolley(s)[0].power;
  assert.ok(boosted > fireVolley(state())[0].power);
  for (let i = 0; i < 360; i++) tickCombat(s);
  assert.equal(s.driveTicks, 0); assert.equal(s.combo, 0);
  recordKill(s); receiveDamage(s);
  assert.equal(s.driveCharge, 0); assert.equal(s.combo, 0);
});

test('shot limits never multiply damage and all fully upgraded weapons can defeat the final boss', () => {
  for (const spec of WEAPONS) {
    const s = state(spec.id, 2, 4);
    s.ship.rapid = 4;
    s.shots = Array.from({length: 219}, () => ({enemy: false}));
    const capped = fireVolley(s);
    assert.equal(capped.length, 1); assert.equal(s.shots.length, 220);
    assert.equal(capped[0].power, spec.damage * 2.6 * 3);
    s.shots = []; s.lastFire = -999;
    const boss = {x: 400, y: 125, r: 105, hp: 5148};
    for (let frame = 0; frame < 60 * 90 && boss.hp > 0; frame++) {
      s.tick++; fireVolley(s);
      for (const shot of s.shots) { advanceShot(shot, [boss]); resolveShotHits(shot, [boss], f => { f.hp = 0; }); }
      s.shots = s.shots.filter(shot => !shot.dead && shot.y > -100 && shot.x > -50 && shot.x < 850);
    }
    assert.equal(boss.hp, 0, `${spec.id} must defeat the stationary final boss in under 90 seconds`);
  }
});

test('every formation reaches the lower playfield while the hull and exhaust remain inside it', () => {
  for (let double = 0; double <= 2; double++) {
    const ship = state('laser', double).ship;
    ship.x = -500; ship.y = 2000;
    clampShip(ship);
    const geometry = shipGeometry(double);
    assert.ok(ship.y > 875);
    assert.ok(ship.y + 56 * geometry.scale < 960);
    assert.ok(ship.x > 0);
    const halfHull = 44.5 * geometry.scale + (double === 1 ? 22 : 0);
    assert.ok(ship.x >= halfHull, 'left wing stays visible');
    ship.x = 3000; clampShip(ship); assert.ok(ship.x < 800);
    assert.ok(ship.x + halfHull <= 800, 'right wing stays visible');
  }
});

test('every weapon and formation can hit a normal enemy at either screen edge', () => {
  for (const weapon of WEAPONS) for (let double = 0; double <= 2; double++) {
    for (const side of [-1, 1]) for (let level = 0; level <= 4; level++) {
      const s = state(weapon.id, double, level);
      s.ship.x = side < 0 ? -100 : 900; clampShip(s.ship);
      const foe = {x: side < 0 ? -20 : 820, y: 450, r: 17, hp: 100, vx: side * 2};
      keepFoeInPlay(foe);
      assert.ok(foe.x - foe.r >= 0 && foe.x + foe.r <= 800);
      assert.ok(foe.vx * side < 0, 'enemy turns back into the playfield');
      const shots = fireVolley(s);
      for (let frame = 0; frame < 90; frame++) {
        for (const shot of shots) { advanceShot(shot, [foe]); resolveShotHits(shot, [foe], () => {}); }
      }
      assert.ok(foe.hp < 100, `${weapon.id}, formation ${double}, level ${level}, side ${side} must reach the edge`);
    }
  }
});

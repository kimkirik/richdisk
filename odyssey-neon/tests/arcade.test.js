import test from 'node:test';
import assert from 'node:assert/strict';
import { tickSquad, recordSquadKill, squadBonus, receiveDamage, moveFoe, tickBossAttack, cancelBossAttack, fireEnemyVolley } from '../src/combat.js';

const world = () => ({ ship: {x: 400, y: 850, double: 2, shield: 1, inv: 0, life: 3}, foes: [], drops: [], score: 0, level: 1, tick: 240, totalTicks: 240, squadStreak: 0 });
const clearSquad = s => { for (const foe of [...s.squad.members]) { foe.hp = 0; recordSquadKill(s, foe); } };

test('three distinct five-ship formations stay in bounds and respect boss entrances and capacity', () => {
  const s = world();
  const patterns = [];
  for (let wave = 0; wave < 3; wave++) {
    tickSquad(s); assert.equal(s.squad.members.length, 5);
    patterns.push(s.squad.members[0].squadPattern);
    for (let frame = 0; frame < 300; frame++) for (const foe of s.squad.members) {
      moveFoe(foe, s); assert.ok(foe.x >= foe.r && foe.x <= 800 - foe.r);
    }
    clearSquad(s); s.foes = []; s.totalTicks = s.nextSquad;
  }
  assert.deepEqual(patterns, [0, 1, 2]);
  for (const patch of [{boss:true}, {level:4}, {level:5}, {foes:Array(49).fill({})}]) {
    const state = {...world(), ...patch}; tickSquad(state); assert.equal(state.squad, undefined);
  }
});

test('full clears award one upgrade, fusion-scaled points, and capped flawless streak bonuses', () => {
  for (const double of [0, 1, 2]) {
    const s = world(); s.ship.double = double; tickSquad(s);
    const members = [...s.squad.members];
    clearSquad(s); assert.equal(s.score, 500 * (double + 1));
    assert.equal(s.drops.length, 1); assert.equal(s.drops[0].kind, 'D'); assert.equal(s.squadStreak, 1);
    members.forEach(foe => recordSquadKill(s, foe)); assert.equal(s.drops.length, 1);
    s.totalTicks = s.nextSquad; tickSquad(s); assert.equal(squadBonus(s), 625 * (double + 1));
    clearSquad(s); assert.equal(s.drops[1].kind, 'M');
    s.squadStreak = 99; s.totalTicks = s.nextSquad; tickSquad(s);
    assert.equal(squadBonus(s), 1000 * (double + 1));
  }
});

test('damage, escapes, and body collisions cannot earn a flawless bonus or strand a challenge', () => {
  const s = world(); s.squadStreak = 3; tickSquad(s); receiveDamage(s);
  assert.equal(s.squad.flawless, false); assert.equal(s.squadStreak, 0);
  clearSquad(s); assert.equal(s.score, 1500); assert.equal(s.squadStreak, 0);
  for (const fail of [foe => {foe.y = 1020;}, foe => {foe.hp = 0;}]) {
    const state = world(); tickSquad(state); fail(state.squad.members[0]); tickSquad(state);
    assert.equal(state.squad, null); assert.equal(state.score, 0); assert.equal(state.drops.length, 0);
  }
});

test('boss beam gives 72 harmless warning ticks, locks aim, then allows dodging and bomb cancellation', () => {
  const s = world(), boss = {x:400,y:100,r:64,vy:0,hp:100,max:100,boss:true};
  for (let i = 0; i < 210; i++) assert.equal(tickBossAttack(boss, s), false);
  assert.equal(boss.beam.warning, 72); const aimedAt = boss.beam.x;
  for (let i = 0; i < 72; i++) assert.equal(tickBossAttack(boss, s), false);
  assert.equal(tickBossAttack(boss, s), true);
  s.ship.x = 200; assert.equal(boss.beam.x, aimedAt); assert.equal(tickBossAttack(boss, s), false);
  cancelBossAttack(boss); assert.equal(boss.beam, null); assert.equal(boss.attackClock, 0);
  boss.hp = 49; tickBossAttack(boss, s); assert.equal(boss.phaseTwo, true);
  for (let i = 1; i < 150; i++) tickBossAttack(boss, s);
  assert.equal(boss.beam.warning, 72); assert.equal(boss.beam.x, 200);
});

test('later enemies aim their shots, phase two adds a fan, and enemies never fire point-blank or during beams', () => {
  const s = world(); s.ship.x = 650; s.tick = 112;
  const foe = {x:200,y:200,r:17,hp:2};
  assert.equal(fireEnemyVolley(foe,s)[0].vx, 0);
  s.level = 3; assert.ok(fireEnemyVolley(foe,s)[0].vx > 0);
  foe.y = 800; assert.equal(fireEnemyVolley(foe,s).length, 0);
  foe.y = -20; assert.equal(fireEnemyVolley(foe,s).length, 0);
  const boss = {x:400,y:100,r:64,hp:200,boss:true}; s.tick = 420; s.level = 5;
  const a = fireEnemyVolley(boss,s); boss.phaseTwo = true;
  const b = fireEnemyVolley(boss,s); assert.equal(a.length, 7); assert.equal(b.length, 9);
  assert.ok(b[4].vy > a[3].vy);
  boss.beam = {warning:1}; assert.equal(fireEnemyVolley(boss,s).length, 0);
});

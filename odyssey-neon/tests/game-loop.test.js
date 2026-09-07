import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as combat from '../src/combat.js';

// Execute the actual UI/game loop in a deterministic clock, with only browser
// rendering, audio and React scheduling mocked. No production debug hooks.
function game(touch = false) {
  let cursor = 0, effects = [], dirty = false, raf, clock = 0;
  const hooks = [], listeners = new Map();
  const equal = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
  const f = {
    useRef(value) { const index = cursor++; return hooks[index] ??= {current: value}; },
    useState(value) {
      const index = cursor++; const hook = hooks[index] ??= {value};
      return [hook.value, next => { hook.value = typeof next === 'function' ? next(hook.value) : next; dirty = true; }];
    },
    useCallback(fn, deps) {
      const index = cursor++; const hook = hooks[index];
      if (hook && equal(hook.deps, deps)) return hook.fn;
      hooks[index] = {fn, deps}; return fn;
    },
    useEffect(fn, deps) {
      const index = cursor++; const hook = hooks[index];
      if (!hook || !equal(hook.deps, deps)) effects.push(() => { hook?.cleanup?.(); hooks[index] = {deps, cleanup: fn()}; });
    },
    StrictMode: 'strict',
  };
  const gradient = {addColorStop() {}};
  const ctx = new Proxy({}, {get: (target, key) => target[key] || (String(key).startsWith('create') ? () => gradient : () => {}), set: (target, key, value) => (target[key] = value, true)});
  const canvas = {getContext: () => ctx, getBoundingClientRect: () => ({left: 0, top: 0, width: 800, height: 960}), setPointerCapture() {}};
  const elements = [];
  const jsx = (type, props) => {
    if (type === 'canvas') props.ref.current = canvas;
    if (typeof type === 'function') return type(props);
    const element = {type, props}; elements.push(element); return element;
  };
  class Audio {
    play() { return Promise.resolve(); } pause() {} load() {} addEventListener() {} removeEventListener() {}
  }
  const addEventListener = (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); };
  const removeEventListener = (type, fn) => listeners.get(type)?.delete(fn);
  const sandbox = {
    ...combat, f, p: {jsx, jsxs: jsx}, d: {createRoot: () => ({render() {}})},
    console, Audio, Blob, URL, HTMLElement: class {},
    fetch: () => new Promise(() => {}),
    document: {getElementById() {}, hidden: false, addEventListener, removeEventListener},
    navigator: {maxTouchPoints: touch ? 5 : 0}, matchMedia: () => ({matches: touch}),
    localStorage: {getItem: () => null, setItem() {}},
    addEventListener, removeEventListener,
    requestAnimationFrame: fn => { raf = fn; return 1; }, cancelAnimationFrame: () => { raf = undefined; },
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const source = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8').replace(/^import[\s\S]*?from .*?;\n/gm, '');
  vm.runInContext(source, context);
  function flush() {
    for (let i = 0; i < 10 && (effects.length || dirty); i++) {
      if (dirty) { dirty = false; cursor = 0; elements.length = 0; vm.runInContext('E()', context); }
      const pending = effects; effects = []; pending.forEach(fn => fn());
    }
  }
  flush();
  const state = () => hooks.find(hook => hook?.current?.ship)?.current;
  const key = (code, type = 'keydown') => { for (const fn of listeners.get(type) || []) fn({code, preventDefault() {}, repeat: false, target: {}}); flush(); };
  return {
    state, key,
    start() { key('Enter'); },
    mode: () => hooks.find(hook => ['menu','playing','paused','leaderboard','victory'].includes(hook?.value))?.value,
    frames(count, hz = 60) { for (let i = 0; i < count; i++) { clock += 1000 / hz; const fn = raf; raf = undefined; fn?.(clock); flush(); } },
    button(label) { return elements.find(e => e.type === 'button' && e.props['aria-label'] === label); },
    pointer(event) { elements.find(e => e.type === 'canvas').props.onPointerDown({...event, currentTarget: canvas, pointerId: 1}); },
  };
}

test('actual loop runs at the same speed on 30, 60 and 120 Hz screens; pause freezes combat', () => {
  const ticks = [];
  for (const hz of [30, 60, 120]) {
    const g = game(); g.start(); g.frames(hz * 5, hz);
    ticks.push(g.state().totalTicks);
    g.key('KeyP'); const frozen = g.state().totalTicks;
    g.frames(hz, hz); assert.equal(g.state().totalTicks, frozen);
    assert.equal(g.mode(), 'paused');
  }
  assert.ok(Math.max(...ticks) - Math.min(...ticks) <= 1, JSON.stringify(ticks));
  assert.ok(ticks.every(t => t >= 298 && t <= 301));
});

test('touch auto-fire and pointer movement work; C cycles every weapon and B clears enemy shots', () => {
  const g = game(true); g.start(); g.frames(60);
  assert.ok(g.state().shots.some(shot => !shot.enemy));
  g.pointer({clientX: 150, clientY: 700}); g.frames(1);
  assert.equal(g.state().ship.x, 150);
  g.pointer({clientX: 400, clientY: 950}); g.frames(1);
  assert.equal(g.state().ship.y, 918);
  g.state().ship.double = 2;
  g.pointer({clientX: 400, clientY: 950}); g.frames(1);
  assert.equal(g.state().ship.y, 898);
  g.state().ship.y = 800;
  g.key('ArrowDown'); g.frames(20); g.key('ArrowDown', 'keyup');
  assert.equal(g.state().ship.y, 898);
  for (const id of ['bullet','rocket','homing','laser']) { g.key('KeyC'); assert.equal(g.state().ship.weapon, id); }
  g.state().shots.push({enemy: true, x: 200, y: 200, vx: 0, vy: 1});
  g.key('KeyB'); assert.equal(g.state().ship.bombs, 2); assert.ok(g.state().shots.every(shot => !shot.enemy));
});

test('keyboard and touch can shoot the left and right edge after triple fusion', () => {
  for (const touch of [false, true]) for (const side of [-1, 1]) {
    const g = game(touch); g.start();
    const s = g.state(); s.ship.double = 2; s.ship.inv = 9999;
    if (touch) g.pointer({clientX: side < 0 ? 0 : 800, clientY: 850});
    else {
      g.key(side < 0 ? 'ArrowLeft' : 'ArrowRight'); g.frames(70);
      g.key(side < 0 ? 'ArrowLeft' : 'ArrowRight', 'keyup');
    }
    s.shots = []; s.foes = [];
    const foe = {x: side < 0 ? 10 : 790, y: s.ship.y - 180, vx: 0, vy: 0, hp: 4, max: 4, r: 17, phase: 0};
    s.foes.push(foe); g.key('Space'); g.frames(40);
    assert.ok(foe.hp <= 0, `${touch ? 'touch' : 'keyboard'} must defeat edge ${side}`);
  }
});

test('ZXCV controls fire, bomb, cycle weapons, and slow arrow movement without disabling fire', () => {
  const g = game(); g.start(); g.frames(1);
  const s = g.state(); g.key('KeyZ'); g.frames(12);
  assert.ok(s.shots.some(shot => !shot.enemy));
  g.key('KeyZ','keyup'); s.shots = []; g.frames(12); assert.equal(s.shots.length, 0);
  g.key('ArrowRight'); const start = s.ship.x; g.frames(10);
  const normal = s.ship.x - start;
  g.key('KeyV'); const focusedStart = s.ship.x; g.key('KeyZ'); g.frames(10);
  assert.ok(s.ship.x - focusedStart < normal * 0.5); assert.ok(s.ship.focus);
  assert.ok(s.shots.some(shot => !shot.enemy));
  g.key('ArrowRight','keyup'); g.key('KeyV','keyup'); g.key('KeyZ','keyup');
  g.key('KeyC'); assert.equal(s.ship.weapon, 'bullet');
  g.key('KeyX'); assert.equal(s.ship.bombs, 2);
  g.key('KeyP'); g.key('KeyX'); g.frames(30); assert.equal(s.ship.bombs, 2);
});

test('actual loop spawns the perfect squad and X clears it for a guaranteed reward', () => {
  const g = game(); g.start(); g.frames(244);
  const s = g.state(); assert.equal(s.squad.total, 5);
  const members = [...s.squad.members]; g.key('KeyX');
  assert.ok(members.every(foe => foe.hp <= 0)); assert.equal(s.squad, null);
  assert.equal(s.squadStreak, 1); assert.ok(s.score >= 500);
  assert.ok(s.drops.some(drop => drop.kind === 'D'));
});

test('boss warning and damage freeze during pause; X cancels the real beam', () => {
  const g = game(); g.start(); const s = g.state();
  s.level = 5; s.boss = true; s.ship.shield = 1;
  const boss = {x:400,y:100,vx:0,vy:0,hp:200,max:200,r:64,phase:0,boss:true,beam:{x:400,width:88,warning:3,remaining:30}};
  s.foes = [boss]; g.key('KeyP'); g.frames(60); assert.equal(boss.beam.warning, 3);
  g.key('KeyP'); g.frames(3); assert.equal(s.ship.shield, 1);
  g.frames(2); assert.equal(s.ship.shield, 0); assert.equal(s.ship.life, 3);
  g.key('KeyX'); assert.equal(boss.beam, null);
});

test('actual collisions collect D and M, resolve shield/wing/life hits, and restart clears run state', () => {
  const g = game(); g.start();
  const s = g.state();
  for (const kind of ['D','D','M']) { s.drops.push({x:s.ship.x,y:s.ship.y,kind}); g.frames(1); }
  assert.equal(s.ship.double, 2); assert.equal(s.ship.weaponLevel, 1);
  s.ship.shield = 1;
  for (let hit = 0; hit < 6; hit++) {
    s.ship.inv = 0;
    s.shots.push({enemy:true,kind:'plasma',x:s.ship.x,y:s.ship.y,vx:0,vy:0});
    g.frames(1);
  }
  assert.equal(s.ship.life, 0); assert.equal(g.mode(), 'leaderboard');
  g.key('Enter'); assert.equal(g.mode(), 'playing');
  assert.equal(g.state().ship.life, 3); assert.equal(g.state().ship.double, 0); assert.equal(g.state().driveCharge, 0);
  assert.equal(g.state().squad, null); assert.equal(g.state().squadStreak, 0); assert.equal(g.state().squadSerial, 0);
});

test('rescue carrier appears early and killing it releases a D pickup', () => {
  const g = game(); g.start(); g.frames(362);
  const s = g.state(), carrier = s.foes.find(foe => foe.carrier);
  assert.ok(carrier);
  g.key('KeyB');
  assert.ok(s.drops.some(drop => drop.kind === 'D' && drop.x === carrier.x));
});

test('actual boss spawns have 20% more starting and maximum HP at early, late and final stages', () => {
  for (const [level, previousHp] of [[5, 191.4], [150, 1435.5], [300, 4290]]) {
    const g = game(); g.start(); g.state().level = level; g.frames(44);
    const boss = g.state().foes.find(foe => foe.boss);
    assert.ok(boss, `stage ${level} must spawn a boss`);
    assert.ok(Math.abs(boss.hp - previousHp * 1.2) < 1e-9);
    assert.equal(boss.max, boss.hp);
  }
});

test('boss completion advances the stage and the final boss enters victory', () => {
  const g = game(); g.start(); const s = g.state();
  s.level = 5; s.boss = true;
  s.foes = [{x:400,y:100,vx:0,vy:0,hp:1,max:10,r:64,phase:0,boss:true}];
  g.key('KeyB'); assert.equal(s.level, 6); assert.equal(s.boss, false);
  assert.equal(s.drops.length, 6);
  s.level = 300; s.boss = true;
  s.foes = [{x:400,y:100,vx:0,vy:0,hp:1,max:5148,r:105,phase:0,boss:true,final:true}];
  g.key('KeyB'); assert.equal(g.mode(), 'victory'); assert.ok(s.score >= 100000);
});

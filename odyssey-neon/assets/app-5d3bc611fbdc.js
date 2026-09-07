import { d, f, p } from "../assets/react-runtime.js";
import {
  WEAPONS,
  weaponSpec,
  formationOffsets,
  shipGeometry,
  clampShip,
  moveFoe,
  tickSquad,
  recordSquadKill,
  squadBonus,
  tickBossAttack,
  cancelBossAttack,
  drawBossBeams,
  fireEnemyVolley,
  fireVolley,
  advanceShot,
  resolveShotHits,
  receiveDamage,
  recordKill,
  tickCombat,
  collectDrop,
  drawPlayerShot,
  drawCombatOverlay,
} from "./combat-3263d3e31df7.js";
const m = 800,
  h = 960,
  g = 220,
  _ = 180,
  v = 420,
  y = 24,
  b = 55,
  x = 0.12,
  S = { cyan: `#55f7ff`, pink: `#ff3bbd`, gold: `#ffd86a`, red: `#ff455e` },
  ee = Array.from({ length: 100 }, (e, t) => ({
    x: (t * 197 + 83) % 800,
    y: (t * 353 + 127) % 960,
    s: 1 + ((t * 17) % 40) / 10,
  })),
  C = (e) => {
    let t = Array.from(e).reduce(
      (e, t) => e + (/[\x00-\x7F]/.test(t) ? 0.58 : 1),
      0,
    );
    return t > 10 ? 10 : t > 8 ? 11 : t > 6 ? 13 : 16;
  },
  w = `odyssey-local-leaderboard-v1`,
  te = () => {
    try {
      let e = JSON.parse(localStorage.getItem(w) ?? `[]`);
      return Array.isArray(e) ? e : [];
    } catch {
      return [];
    }
  },
  ne = (e) => {
    let t = [...te(), { ...e, id: Date.now() }]
      .sort((e, t) => t.score - e.score || t.level - e.level || t.id - e.id)
      .slice(0, 100);
    return (localStorage.setItem(w, JSON.stringify(t)), t);
  },
  T = (e, t) => {
    let n = new Audio();
    return (
      (n.preload = `auto`),
      Promise.all(
        Array.from({ length: t }, (t, n) =>
          fetch(`./audio-parts/${e}.part${n.toString().padStart(2, `0`)}`).then(
            (e) => {
              if (!e.ok) throw Error(`audio ${e.status}`);
              return e.arrayBuffer();
            },
          ),
        ),
      )
        .then((e) => {
          ((n.src = URL.createObjectURL(new Blob(e, { type: `audio/mpeg` }))),
            n.load());
        })
        .catch(() => {}),
      n
    );
  };
function E() {
  let e = (0, f.useRef)(null),
    t = (0, f.useRef)(0),
    n = (0, f.useRef)(new Set()),
    r = (0, f.useRef)(!1),
    i = (0, f.useRef)(!1),
    a = (0, f.useRef)(!1),
    o = (0, f.useRef)(null),
    s = (0, f.useRef)(!0),
    c = (0, f.useRef)(null),
    l = (0, f.useRef)(null),
    u = (0, f.useRef)({
      ship: {
        x: 400,
        y: 850,
        life: 3,
        bombs: 3,
        spread: 0,
        rapid: 0,
        weaponLevel: 0,
        weapon: `laser`,
        shield: 0,
        double: 0,
        inv: 0,
      },
      shots: [],
      foes: [],
      drops: [],
      sparks: [],
      stars: ee.map((e) => ({ ...e })),
      tick: 0,
      score: 0,
      combo: 0,
      level: 1,
      lastFire: 0,
      boss: !1,
      totalTicks: 0,
      nextRescue: 360,
      squad: null,
      squadSerial: 0,
      squadStreak: 0,
      nextSquad: 240,
      completed: false,
      comboTicks: 0,
      driveTicks: 0,
      driveCharge: 0,
      noticeTicks: 0,
    }),
    [d, w] = (0, f.useState)(`menu`),
    [E, oe] = (0, f.useState)({
      score: 0,
      level: 1,
      life: 3,
      bombs: 3,
      combo: 0,
      spread: 0,
      rapid: 0,
      weaponLevel: 0,
      weapon: `laser`,
      shield: 0,
      double: 0,
    }),
    [se, ce] = (0, f.useState)(!0),
    [D, O] = (0, f.useState)(0),
    [le, ue] = (0, f.useState)(``),
    [de, fe] = (0, f.useState)(``),
    [k, A] = (0, f.useState)([]),
    [pe, me] = (0, f.useState)(!1),
    he = (0, f.useRef)(d);
  ((0, f.useEffect)(() => {
    he.current = d;
  }, [d]),
    (0, f.useEffect)(() => {
      s.current = se;
    }, [se]),
    (0, f.useEffect)(() => {
      a.current =
        navigator.maxTouchPoints > 0 || matchMedia(`(pointer: coarse)`).matches;
    }, []),
    (0, f.useEffect)(() => {
      let e = c.current ?? T(`odysseyop.mp3`, 9);
      ((c.current = e), (e.volume = 0.5), (e.loop = !0));
      let t =
          d === `gameOver` ||
          d === `victory` ||
          (d === `leaderboard` && E.life <= 0),
        n = () => {
          !t && s.current && e.play().catch(() => {});
        };
      return (
        !t && se
          ? (n(),
            e.addEventListener(`canplay`, n),
            window.addEventListener(`pointerdown`, n),
            window.addEventListener(`keydown`, n))
          : e.pause(),
        () => {
          (e.removeEventListener(`canplay`, n),
            window.removeEventListener(`pointerdown`, n),
            window.removeEventListener(`keydown`, n));
        }
      );
    }, [d, se, E.life]),
    (0, f.useEffect)(() => {
      let e = l.current ?? T(`odysseyop2.mp3`, 7);
      ((l.current = e), (e.volume = 0.55), (e.loop = !0));
      let t =
          d === `victory` ||
          d === `gameOver` ||
          (d === `leaderboard` && E.life <= 0),
        n = () => {
          t && s.current && e.play().catch(() => {});
        };
      return (
        t && se
          ? (e.ended && (e.currentTime = 0),
            n(),
            e.addEventListener(`canplay`, n),
            window.addEventListener(`pointerdown`, n),
            window.addEventListener(`keydown`, n))
          : (e.pause(), (e.currentTime = 0)),
        () => {
          (e.removeEventListener(`canplay`, n),
            window.removeEventListener(`pointerdown`, n),
            window.removeEventListener(`keydown`, n));
        }
      );
    }, [d, se, E.life]));
  let ge = (0, f.useCallback)((e) => {
      if (!s.current) return;
      let t = window.AudioContext || window.webkitAudioContext;
      if (!t) return;
      let n = o.current ?? new t();
      ((o.current = n), n.state === `suspended` && n.resume());
      let r = n.currentTime,
        i = n.createGain();
      i.connect(n.destination);
      let a = (e, t, a, o = 0, s = 0.05) => {
        let c = n.createOscillator(),
          l = n.createGain();
        ((c.type = a),
          c.frequency.setValueAtTime(e, r + o),
          c.frequency.exponentialRampToValueAtTime(
            Math.max(40, t),
            r + o + 0.11,
          ),
          l.gain.setValueAtTime(s, r + o),
          l.gain.exponentialRampToValueAtTime(0.001, r + o + 0.13),
          c.connect(l),
          l.connect(i),
          c.start(r + o),
          c.stop(r + o + 0.14));
      };
      ((i.gain.value = 0.72),
        e === `shoot` &&
          (a(920, 430, `square`, 0, 0.025), a(1350, 700, `sine`, 0.025, 0.016)),
        e === `bomb` &&
          (a(150, 45, `sawtooth`, 0, 0.16), a(80, 35, `square`, 0.05, 0.1)),
        e === `explode` &&
          (a(240, 55, `sawtooth`, 0, 0.07), a(110, 42, `square`, 0.035, 0.05)),
        e === `hit` &&
          (a(115, 55, `square`, 0, 0.1), a(70, 45, `sawtooth`, 0.025, 0.08)),
        e === `pickup` &&
          (a(540, 980, `sine`, 0, 0.05), a(800, 1450, `square`, 0.07, 0.035)),
        e === `merge` &&
          (a(260, 650, `sawtooth`, 0, 0.055),
          a(520, 1050, `square`, 0.08, 0.04)));
    }, []),
    _e = (0, f.useCallback)(() => {
      ((i.current = !1),
        (u.current = {
          ...u.current,
          ship: {
            x: 400,
            y: 850,
            life: 3,
            bombs: 3,
            spread: 0,
            rapid: 0,
            weaponLevel: 0,
            weapon: `laser`,
            shield: 0,
            double: 0,
            inv: 0,
          },
          shots: [],
          foes: [],
          drops: [],
          sparks: [],
          tick: 0,
          score: 0,
          combo: 0,
          level: 1,
          lastFire: 0,
          boss: !1,
          totalTicks: 0,
          nextRescue: 360,
          squad: null,
          squadSerial: 0,
          squadStreak: 0,
          nextSquad: 240,
          completed: false,
          comboTicks: 0,
          driveTicks: 0,
          driveCharge: 0,
          noticeTicks: 0,
        }),
        oe({
          score: 0,
          level: 1,
          life: 3,
          bombs: 3,
          combo: 0,
          spread: 0,
          rapid: 0,
          weaponLevel: 0,
          weapon: `laser`,
          shield: 0,
          double: 0,
        }),
        w(`playing`));
    }, []),
    ve = () => {
      let e = [`별빛`, `네온`, `우주`, `은하`, `혜성`, `달빛`],
        t = [`여우`, `토끼`, `고래`, `수달`, `고양이`, `푸들`];
      return `${e[Math.floor(Math.random() * e.length)]}${t[Math.floor(Math.random() * t.length)]}${Math.floor(100 + Math.random() * 900)}`.slice(
        0,
        12,
      );
    },
    ye = (0, f.useCallback)(() => {
      let e = le.trim().slice(0, 12) || ve();
      (fe(e), ue(e), _e());
    }, [le, _e]),
    be = (0, f.useCallback)(async () => {
      (me(!0), A(te()), me(!1));
    }, []);
  (0, f.useEffect)(() => {
    !(
      d === `gameOver` ||
      d === `victory` ||
      (d === `leaderboard` && E.life <= 0)
    ) ||
      !de ||
      i.current ||
      ((i.current = !0),
      A(ne({ nickname: de, score: E.score, level: E.level })),
      me(!1));
  }, [d, de, E.score, E.level, E.life]);
  let xe = (0, f.useCallback)((e, t, n = S.pink, r = 18) => {
      let i = u.current,
        a = Math.min(r, Math.max(0, v - i.sparks.length));
      for (let r = 0; r < a; r++) {
        let r = Math.random() * Math.PI * 2,
          a = 1 + Math.random() * 6;
        i.sparks.push({
          x: e,
          y: t,
          vx: Math.cos(r) * a,
          vy: Math.sin(r) * a,
          life: 35 + Math.random() * 25,
          color: n,
        });
      }
    }, []),
    Se = (0, f.useCallback)(() => {
      if (he.current !== "playing") return;
      const ship = u.current.ship;
      ship.weapon =
        WEAPONS[
          (WEAPONS.findIndex((w) => w.id === ship.weapon) + 1) % WEAPONS.length
        ].id;
      xe(ship.x, ship.y, weaponSpec(ship.weapon).color, 10);
      oe((old) => ({ ...old, weapon: ship.weapon }));
    }, [xe]),
    Ce = (0, f.useCallback)(() => {
      if (fireVolley(u.current).length) ge("shoot");
    }, [ge]),
    we = (0, f.useCallback)(
      (e) => {
        if (e.hp === -999) return;
        let t = u.current,
          n = t.ship;
        if (
          ((e.hp = -999),
          ge(e.final ? `bomb` : `explode`),
          (t.score += e.final
            ? 1e5
            : e.boss
              ? 1e3 + t.level * 20
              : 25 * (1 + t.combo * 0.05)),
          recordKill(t),
          xe(
            e.x,
            e.y,
            e.boss ? S.gold : S.pink,
            e.final ? 240 : e.boss ? 80 : 18,
          ),
          e.final)
        ) {
          ((t.boss = !1),
            (t.shots = []),
            oe({
              score: Math.floor(t.score),
              level: 300,
              life: n.life,
              bombs: n.bombs,
              combo: t.combo,
              spread: n.spread,
              rapid: n.rapid,
              weaponLevel: n.weaponLevel,
              weapon: n.weapon,
              shield: n.shield,
              double: n.double,
            }),
            (t.completed = true),
            (he.current = `victory`),
            w(`victory`));
          return;
        }
        if (e.carrier) {
          t.drops.push({ x: e.x, y: e.y, kind: "D" });
          t.notice = "동료 구조 성공! D를 획득하세요";
          t.noticeTicks = 150;
          t.noticeColor = S.gold;
        }
        if (e.boss)
          [`M`, `D`, `H`, `L`, `B`, `G`].forEach((n, r) =>
            t.drops.push({
              x: e.x + (r - 2.5) * 42,
              y: e.y + Math.abs(r - 2.5) * 8,
              kind: n,
            }),
          );
        else if (
          (e.elite && t.drops.push({ x: e.x, y: e.y, kind: `B` }),
          Math.random() < x)
        ) {
          let n = [
            `M`,
            `M`,
            `M`,
            `H`,
            `D`,
            `D`,
            ...(t.level >= 201 ? [`G`] : []),
          ];
          t.drops.push({
            x: e.x + (e.elite ? 24 : 0),
            y: e.y,
            kind: n[Math.floor(Math.random() * n.length)],
          });
        }
        if (recordSquadKill(t, e)) ge("pickup");
        e.boss &&
          ((n.life = Math.min(9, n.life + 1)),
          (t.boss = !1),
          (t.level = Math.min(300, t.level + 1)),
          (t.tick = 1),
          (t.lastFire = -999),
          (t.shots = t.shots.filter((e) => !e.enemy)),
          oe((e) => ({ ...e, level: t.level, life: n.life })));
      },
      [xe, ge],
    ),
    Te = (0, f.useCallback)(() => {
      let e = u.current;
      he.current !== `playing` ||
        e.ship.bombs < 1 ||
        (ge(`bomb`),
        e.ship.bombs--,
        (e.shots = e.shots.filter((e) => !e.enemy)),
        e.foes.forEach((e) => {
          (cancelBossAttack(e), (e.hp -= 70), xe(e.x, e.y, S.gold, 8), e.hp <= 0 && we(e));
        }),
        xe(e.ship.x, e.ship.y, `#fff`, 70));
    }, [xe, we, ge]),
    Ee = () => {
      let e = u.current;
      if (e.level % 5 == 0 && !e.boss) {
        e.boss = !0;
        let t = e.level === 300,
          n = (t ? 2600 : 90 + e.level * 5.2) * 1.65;
        e.foes.push({
          x: 400,
          y: t ? -130 : -80,
          vx: 0,
          vy: t ? 0.85 : 1.4,
          hp: n,
          max: n,
          r: t ? 105 : 64,
          boss: !0,
          final: t,
          phase: Math.random() * 6,
        });
        return;
      }
      let t = Math.random() > 0.84,
        n =
          1 + Math.floor(e.level / 18) + (t ? 3 + Math.floor(e.level / 30) : 0),
        r = 50 + Math.random() * 700;
      e.foes.push({
        x: r,
        y: -30,
        vx: (Math.random() - 0.5) * (2.4 + e.level * 0.006),
        vy: 2.35 + Math.min(4.8, e.level * 0.014),
        hp: n,
        max: n,
        r: t ? 28 : 17,
        boss: !1,
        elite: t,
        phase: Math.random() * 6,
        bornTick: e.tick,
      });
    },
    De = (0, f.useCallback)(
      (drop) => {
        collectDrop(u.current, drop);
        ge(drop.kind === "D" ? "merge" : "pickup");
        xe(
          u.current.ship.x,
          u.current.ship.y,
          drop.kind === "D" ? S.gold : S.cyan,
          25,
        );
      },
      [xe, ge],
    ),
    Oe = (0, f.useCallback)(() => {
      const state = u.current;
      if (!receiveDamage(state)) return;
      ge("hit");
      xe(state.ship.x, state.ship.y, S.red, 28);
      if (state.ship.life <= 0) {
        oe((old) => ({
          ...old,
          score: Math.floor(state.score),
          level: state.level,
          life: 0,
        }));
        he.current = "leaderboard";
        O(0);
        me(true);
        w("leaderboard");
      }
    }, [xe, ge]);
  ((0, f.useEffect)(() => {
    const onDown = (event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.matches("input, textarea, select, [contenteditable]")
      ) {
        if (event.code === "Enter" && he.current === "menu") {
          event.preventDefault();
          ye();
        }
        return;
      }
      if (
        [
          "Space",
          "KeyZ", "KeyX", "KeyC", "KeyV",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "F1",
        ].includes(event.code)
      )
        event.preventDefault();
      n.current.add(event.code);
      if (event.repeat) return;
      const mode = he.current;
      if (event.code === "KeyP" && ["playing", "paused"].includes(mode))
        w(mode === "playing" ? "paused" : "playing");
      if (event.code === "KeyH" || event.code === "F1") w("help");
      if (event.code === "KeyL") {
        O(0);
        w("leaderboard");
        be();
      }
      if (event.code === "KeyM") ce((old) => !old);
      if (event.code === "KeyB" || event.code === "KeyX") Te();
      if (event.code === "KeyC") Se();
      if (event.code === "Enter" && mode === "menu") ye();
      else if (event.code === "Enter" && mode === "paused") w("playing");
      else if (
        event.code === "Enter" &&
        (mode === "victory" ||
          mode === "gameOver" ||
          (mode === "leaderboard" && u.current.ship.life <= 0))
      )
        _e();
    };
    const onUp = (event) => n.current.delete(event.code);
    const pause = () => {
      n.current.clear();
      r.current = false;
      if (he.current === "playing") {
        he.current = "paused";
        w("paused");
      }
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    addEventListener("keydown", onDown);
    addEventListener("keyup", onUp);
    addEventListener("blur", pause);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      removeEventListener("keydown", onDown);
      removeEventListener("keyup", onUp);
      removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [Te, be, _e, ye, Se]),
    (0, f.useEffect)(() => {
      let r = e.current;
      if (!r) return;
      let lastTime = null,
        accumulator = 0;
      let i = r.getContext(`2d`),
        o = (timestamp = 0) => {
          const elapsed =
            lastTime === null ? 0 : Math.min(100, timestamp - lastTime);
          lastTime = timestamp;
          accumulator = he.current === "playing" ? accumulator + elapsed : 0;
          let steps = Math.min(
            6,
            Math.floor((accumulator + 0.001) / (1000 / 60)),
          );
          accumulator -= steps * (1000 / 60);
          let e = u.current,
            r = e.ship;
          i.clearRect(0, 0, m, h);
          let s = i.createLinearGradient(0, 0, 0, h);
          (s.addColorStop(0, `#030512`),
            s.addColorStop(1, `#090225`),
            (i.fillStyle = s),
            i.fillRect(0, 0, m, h),
            e.stars.forEach((e) => {
              ((e.y +=
                (e.s * (he.current === `playing` ? 1 : 0.2) * elapsed) /
                (1000 / 60)),
                e.y > h && ((e.y = 0), (e.x = Math.random() * m)),
                (i.fillStyle = `rgba(130,225,255,${0.2 + e.s / 6})`),
                i.fillRect(e.x, e.y, e.s / 2, e.s * 2));
            }),
            0);
          while (steps-- > 0 && he.current === "playing") {
            e.tick++;
            tickCombat(e);
            tickSquad(e);
            if (e.totalTicks >= e.nextRescue && !e.boss && e.foes.length < b) {
              e.nextRescue = e.totalTicks + 1080;
              e.foes.push({
                x: 200 + Math.random() * 400,
                y: -35,
                vx: 0,
                vy: 1.9,
                hp: 3 + Math.floor(e.level / 15),
                max: 3 + Math.floor(e.level / 15),
                r: 23,
                boss: false,
                elite: false,
                carrier: true,
                phase: 0,
              });
              e.notice = "D 구조선 출현 · 격추하고 동료와 합체";
              e.noticeTicks = 150;
              e.noticeColor = S.gold;
            }
            r.focus = n.current.has("KeyV") || n.current.has("ShiftLeft");
            let t = r.focus ? 3 : 7;
            ((n.current.has(`ArrowLeft`) || n.current.has(`KeyA`)) &&
              (r.x -= t),
              (n.current.has(`ArrowRight`) || n.current.has(`KeyD`)) &&
                (r.x += t),
              (n.current.has(`ArrowUp`) || n.current.has(`KeyW`)) && (r.y -= t),
              (n.current.has(`ArrowDown`) || n.current.has(`KeyS`)) &&
                (r.y += t),
              clampShip(r, m, h),
              (n.current.has("KeyZ") || n.current.has(`Space`) || a.current) && Ce(),
              e.foes.length < b &&
                e.tick % Math.max(12, Math.floor((44 - e.level / 9) / 1.3)) ===
                  0 &&
                !e.boss && !e.squad &&
                Ee(),
              e.shots.forEach((e) => {
                advanceShot(e, u.current.foes);
              }),
              e.foes.forEach((foe) => {
                moveFoe(foe, e);
                if (tickBossAttack(foe, e)) Oe();
                e.shots.push(...fireEnemyVolley(foe, e));
              }),
              e.drops.forEach((drop) => {
                drop.y += 2.3;
                const dx = r.x - drop.x,
                  dy = r.y - drop.y,
                  distance = Math.hypot(dx, dy);
                if (distance < 110 && distance > 1) {
                  drop.x += (dx / distance) * 4;
                  drop.y += (dy / distance) * 4;
                }
              }));
            for (const shot of e.shots) resolveShotHits(shot, e.foes, we, xe);
            e.foes = e.foes.filter((e) => e.hp > 0 && e.y < 1100);
            let o = [],
              s = [];
            for (let t of e.shots)
              t.dead ||
                t.y <= -100 ||
                t.y >= 1e3 ||
                t.x <= -50 ||
                t.x >= 850 ||
                (t.enemy ? s : o).push(t);
            (o.length > g && o.splice(0, o.length - g),
              s.length > _ && s.splice(0, s.length - _),
              (e.shots = [...o, ...s]));
            for (const shot of s) {
              if (
                !shot.dead &&
                r.inv <= 0 &&
                Math.hypot(shot.x - r.x, shot.y - r.y) <
                  shipGeometry(r.double).hitRadius + 3
              ) {
                shot.dead = true;
                Oe();
              }
            }
            for (const foe of e.foes) {
              if (
                r.inv <= 0 &&
                Math.hypot(foe.x - r.x, foe.y - r.y) <
                  foe.r + shipGeometry(r.double).hitRadius
              ) {
                Oe();
                if (!foe.boss) foe.hp = 0;
              }
            }
            ((e.drops = e.drops.filter((e) => {
              let t = e.x - r.x,
                n = e.y - r.y;
              return t * t + n * n < 1225 ? (De(e), !1) : e.y < h;
            })),
              r.inv > 0 && r.inv--,
              e.tick > 0 &&
                e.tick % 720 == 0 &&
                !e.boss &&
                e.level < 300 &&
                e.level++,
              e.tick % 8 == 0 &&
                oe({
                  score: Math.floor(e.score),
                  level: e.level,
                  life: r.life,
                  bombs: r.bombs,
                  combo: e.combo,
                  spread: r.spread,
                  rapid: r.rapid,
                  weaponLevel: r.weaponLevel,
                  weapon: r.weapon,
                  shield: r.shield,
                  double: r.double,
                  driveTicks: e.driveTicks,
                  driveCharge: e.driveCharge,
                  squadKills: e.squad?.kills || 0,
                  squadTotal: e.squad?.total || 0,
                  squadBonus: squadBonus(e),
                  squadStreak: e.squadStreak,
                  bossWarning: e.foes.some(foe => foe.beam?.warning > 0),
                }));
          }
          drawBossBeams(i, e.foes);
          (e.sparks.forEach((e) => {
            ((e.x += e.vx),
              (e.y += e.vy),
              (e.vx *= 0.96),
              (e.vy *= 0.96),
              e.life--,
              (i.globalAlpha = Math.max(0, e.life / 60)),
              (i.fillStyle = e.color),
              i.fillRect(e.x, e.y, 3, 3));
          }),
            (i.globalAlpha = 1),
            (e.sparks = e.sparks.filter((e) => e.life > 0)));
          {
            let t = e.shots.length > 110;
            (e.shots.forEach((e) => {
              if (e.dead) return;
              if (!e.enemy) {
                drawPlayerShot(i, e, t);
                return;
              }
              (i.save(), i.translate(e.x, e.y));
              let n = Math.atan2(e.vy, e.vx) - Math.PI / 2;
              if ((i.rotate(n), e.kind === `missile`))
                ((i.shadowBlur = t ? 0 : 18),
                  (i.shadowColor = `#ff2b2b`),
                  (i.fillStyle = `#fff1ad`),
                  i.fillRect(-3, -13, 6, 15),
                  (i.fillStyle = `#ff3030`),
                  i.beginPath(),
                  i.moveTo(0, 13),
                  i.lineTo(-9, 2),
                  i.lineTo(-4, -2),
                  i.lineTo(-4, -10),
                  i.lineTo(4, -10),
                  i.lineTo(4, -2),
                  i.lineTo(9, 2),
                  i.closePath(),
                  i.fill(),
                  (i.fillStyle = `#ffbf00`),
                  i.fillRect(-2, -22, 4, 9));
              else if (e.kind === `plasma`) {
                if (((i.shadowBlur = t ? 0 : 22), (i.shadowColor = S.pink), t))
                  i.fillStyle = `#ff63d1`;
                else {
                  let e = i.createRadialGradient(0, 0, 1, 0, 0, 10);
                  (e.addColorStop(0, `#fff`),
                    e.addColorStop(0.3, `#ff81dc`),
                    e.addColorStop(1, `#a50078`),
                    (i.fillStyle = e));
                }
                (i.beginPath(),
                  i.arc(0, 0, 9, 0, 7),
                  i.fill(),
                  (i.strokeStyle = `#ffb5ef`),
                  i.beginPath(),
                  i.arc(0, 0, 13, 0, 7),
                  i.stroke());
              } else
                e.kind === `bullet`
                  ? ((i.shadowBlur = t ? 0 : 22),
                    (i.shadowColor = `#ff9d00`),
                    (i.fillStyle = `#783b0b`),
                    i.fillRect(-6, -10, 12, 22),
                    (i.fillStyle = `#fff0a2`),
                    i.beginPath(),
                    i.moveTo(0, -21),
                    i.lineTo(-7, -9),
                    i.lineTo(7, -9),
                    i.closePath(),
                    i.fill(),
                    (i.fillStyle = `#ffb21f`),
                    i.beginPath(),
                    i.moveTo(-6, 3),
                    i.lineTo(-13, 13),
                    i.lineTo(-5, 10),
                    i.lineTo(5, 10),
                    i.lineTo(13, 13),
                    i.lineTo(6, 3),
                    i.closePath(),
                    i.fill(),
                    (i.globalAlpha = 0.55),
                    (i.fillStyle = `#ff5a00`),
                    i.beginPath(),
                    i.moveTo(0, t ? 28 : 42),
                    i.lineTo(-7, 13),
                    i.lineTo(7, 13),
                    i.closePath(),
                    i.fill())
                  : ((i.shadowBlur = t ? 0 : 28),
                    (i.shadowColor = S.cyan),
                    (i.fillStyle = `#eaffff`),
                    i.fillRect(-3, -28, 6, 48),
                    (i.fillStyle = `#55f7ff`),
                    i.beginPath(),
                    i.moveTo(0, -38),
                    i.lineTo(-7, -21),
                    i.lineTo(0, -25),
                    i.lineTo(7, -21),
                    i.closePath(),
                    i.fill(),
                    (i.globalAlpha = t ? 0.16 : 0.32),
                    (i.fillStyle = `#159dff`),
                    i.fillRect(t ? -6 : -10, 18, t ? 12 : 20, t ? 20 : 34));
              i.restore();
            }),
              (i.shadowBlur = 0));
          }
          (e.drops.forEach((e) => {
            (i.save(),
              i.translate(e.x, e.y),
              (i.shadowBlur = e.kind === `L` ? 25 : 14),
              (i.shadowColor = e.kind === `L` ? `#ff426f` : S.cyan),
              i.beginPath(),
              i.arc(0, 0, 19, 0, 7),
              (i.fillStyle =
                e.kind === `G`
                  ? S.gold
                  : e.kind === `L`
                    ? `#721735`
                    : `#11274a`),
              i.fill(),
              (i.strokeStyle = e.kind === `L` ? `#ff7195` : S.cyan),
              (i.lineWidth = 2),
              i.stroke(),
              (i.fillStyle = `#fff`),
              (i.font = `bold 17px monospace`),
              (i.textAlign = `center`),
              i.fillText(e.kind === `L` ? `♥` : e.kind, 0, 6),
              e.kind === "D" &&
                ((i.strokeStyle = S.gold),
                i.beginPath(),
                i.arc(0, 0, 25, 0, 7),
                i.stroke()),
              i.restore());
          }),
            e.foes.forEach((e) => {
              if (e.hp <= 0) return;
              (i.save(),
                i.translate(e.x, e.y),
                i.rotate(Math.sin(e.phase) * 0.12),
                (i.shadowBlur = e.final ? 55 : e.boss ? 32 : 18),
                (i.shadowColor = e.final
                  ? `#ffd86a`
                  : e.boss
                    ? S.gold
                    : S.pink),
                e.final &&
                  ((i.strokeStyle = `rgba(255,216,106,${0.35 + Math.sin(e.phase) * 0.15})`),
                  (i.lineWidth = 5),
                  i.beginPath(),
                  i.arc(0, 0, e.r + 18 + Math.sin(e.phase) * 7, 0, 7),
                  i.stroke()));
              let t = i.createLinearGradient(0, -e.r, 0, e.r);
              (t.addColorStop(
                0,
                e.final ? `#fff4a8` : e.boss ? `#ffbe3d` : `#ff5ac8`,
              ),
                t.addColorStop(
                  0.45,
                  e.final ? `#c3287f` : e.boss ? `#8a245f` : `#56175d`,
                ),
                t.addColorStop(1, `#12051c`),
                (i.fillStyle = t),
                (i.strokeStyle = e.final
                  ? `#ffffff`
                  : e.boss
                    ? `#ffe581`
                    : `#ff8ee0`),
                (i.lineWidth = e.final ? 6 : e.boss ? 4 : 2),
                i.beginPath(),
                i.moveTo(0, e.r * 1.1),
                i.lineTo(-e.r * 0.42, e.r * 0.25),
                i.lineTo(-e.r * 1.15, e.r * 0.58),
                i.lineTo(-e.r * 0.72, -e.r * 0.25),
                i.lineTo(-e.r * 0.35, -e.r * 0.85),
                i.lineTo(0, -e.r * 0.55),
                i.lineTo(e.r * 0.35, -e.r * 0.85),
                i.lineTo(e.r * 0.72, -e.r * 0.25),
                i.lineTo(e.r * 1.15, e.r * 0.58),
                i.lineTo(e.r * 0.42, e.r * 0.25),
                i.closePath(),
                i.fill(),
                i.stroke(),
                (i.fillStyle = `#160a2b`),
                i.beginPath(),
                i.ellipse(0, -e.r * 0.15, e.r * 0.22, e.r * 0.38, 0, 0, 7),
                i.fill(),
                (i.strokeStyle = e.final ? `#fff6ad` : `#ffdcff`),
                i.stroke(),
                (i.fillStyle = e.final ? `#ffd86a` : `#ff4bd1`),
                i.fillRect(-e.r * 0.56, e.r * 0.48, e.r * 0.22, e.r * 0.18),
                i.fillRect(e.r * 0.34, e.r * 0.48, e.r * 0.22, e.r * 0.18),
                i.restore(),
                e.carrier &&
                  (i.save(),
                  (i.strokeStyle = S.gold),
                  (i.lineWidth = 2),
                  i.beginPath(),
                  i.arc(e.x, e.y + 39, 16, 0, 7),
                  i.stroke(),
                  (i.fillStyle = S.gold),
                  (i.font = "bold 18px monospace"),
                  (i.textAlign = "center"),
                  i.fillText("D", e.x, e.y + 45),
                  i.restore()),
                e.flash > 0 &&
                  (e.flash--,
                  i.save(),
                  (i.globalAlpha = 0.55),
                  (i.strokeStyle = "#ffffff"),
                  (i.lineWidth = 4),
                  i.beginPath(),
                  i.arc(e.x, e.y, e.r, 0, 7),
                  i.stroke(),
                  i.restore()),
                e.boss &&
                  ((i.fillStyle = `#21051f`),
                  i.fillRect(130, 30, 540, 19),
                  (i.fillStyle = e.final ? S.gold : S.pink),
                  i.fillRect(134, 34, 532 * (e.hp / e.max), 11),
                  (i.fillStyle = `#fff`),
                  (i.font = `bold 13px monospace`),
                  (i.textAlign = `center`),
                  i.fillText(
                    e.phaseTwo ? `BOSS · PHASE 2` : e.final ? `FINAL BOSS · ODYSSEY CORE` : `SECTOR BOSS`,
                    400,
                    70,
                  )));
            }),
            he.current !== `menu` &&
              (i.save(),
              i.translate(r.x, r.y),
              r.inv > 0 && (i.globalAlpha = e.tick % 10 < 5 ? 0.35 : 1),
              formationOffsets(r.double).forEach((offset) =>
                ae(
                  i,
                  offset,
                  offset ? 4 : 0,
                  shipGeometry(r.double).scale,
                  r.double >= 2 || offset < 0 ? S.gold : S.cyan,
                  e.tick,
                ),
              ),
              r.double === 1 &&
                ((i.strokeStyle = "#ffd86a80"),
                (i.lineWidth = 2),
                i.beginPath(),
                i.moveTo(-36, 11),
                i.lineTo(36, 11),
                i.stroke()),
              r.shield > 0 &&
                ((i.strokeStyle = "#55f7ff99"),
                (i.lineWidth = 2),
                i.beginPath(),
                i.arc(0, 0, 36 + (r.double > 0 ? 30 : 0), 0, 7),
                i.stroke()),
              r.focus &&
                ((i.strokeStyle = "#ffffffaa"), (i.lineWidth = 1.5), i.beginPath(),
                i.arc(0, 0, shipGeometry(r.double).hitRadius, 0, Math.PI * 2), i.stroke()),
              (i.fillStyle = "#ffffff"),
              i.beginPath(),
              i.arc(0, 0, 4, 0, 7),
              i.fill(),
              i.restore()),
            he.current !== "menu" && drawCombatOverlay(i, e),
            (t.current = requestAnimationFrame(o)));
        };
      return (o(), () => cancelAnimationFrame(t.current));
    }, [we, Ce, De, ge, Oe]));
  let ke = (e) => {
      if (!r.current || he.current !== `playing`) return;
      let t = e.currentTarget.getBoundingClientRect();
      u.current.ship.x = ((e.clientX - t.left) * m) / t.width;
      u.current.ship.y = ((e.clientY - t.top) * h) / t.height;
      clampShip(u.current.ship, m, h);
    },
    Ae = Math.max(1, Math.ceil(k.length / 5)),
    je = () => {
      if (E.life <= 0) {
        _e();
        return;
      }
      w(u.current.completed ? `victory` : de ? `playing` : `menu`);
    };
  return (0, p.jsxs)(`main`, {
    className: `shell`,
    children: [
      (0, p.jsxs)(`section`, {
        className: `game-wrap`,
        children: [
          (0, p.jsxs)(`header`, {
            children: [
              (0, p.jsxs)(`div`, {
                children: [
                  (0, p.jsx)(`span`, {
                    className: `eyebrow`,
                    children: `↑↓←→ 이동 · Z 발사 · X 폭탄 · C 전환 · V 정밀`,
                  }),
                  (0, p.jsxs)(`h1`, {
                    children: [
                      `오딧세이 `,
                      (0, p.jsx)(`small`, { children: `Odyssey` }),
                    ],
                  }),
                ],
              }),
              (0, p.jsxs)(`div`, {
                className: `top-actions`,
                children: [
                  (0, p.jsx)("button", {
                    "aria-label": d === "paused" ? "게임 계속하기" : "일시정지",
                    disabled: !["playing", "paused"].includes(d),
                    onClick: () => w(d === "paused" ? "playing" : "paused"),
                    children: d === "paused" ? "▶" : "Ⅱ",
                  }),
                  (0, p.jsx)(`button`, {
                    onClick: () => ce((e) => !e),
                    "aria-label": `음소거`,
                    children: se ? `♫` : `×`,
                  }),
                  (0, p.jsx)(`button`, {
                    onClick: () => w(`help`),
                    "aria-label": "게임 방법",
                    children: `?`,
                  }),
                  (0, p.jsx)(`button`, {
                    onClick: () => {
                      (O(0), w(`leaderboard`), be());
                    },
                    "aria-label": "랭킹",
                    children: `♕`,
                  }),
                ],
              }),
            ],
          }),
          (0, p.jsxs)(`div`, {
            className: `hud`,
            children: [
              (0, p.jsxs)(`b`, {
                children: [
                  `SCORE `,
                  (0, p.jsx)(`i`, {
                    children: E.score.toString().padStart(7, `0`),
                  }),
                ],
              }),
              (0, p.jsxs)(`b`, {
                children: [
                  `LEVEL `,
                  (0, p.jsx)(`i`, {
                    children: E.level.toString().padStart(3, `0`),
                  }),
                ],
              }),
              (0, p.jsxs)(`b`, {
                children: [
                  `LIFE `,
                  (0, p.jsx)(`i`, {
                    children: `◆`.repeat(Math.max(0, E.life)),
                  }),
                ],
              }),
              (0, p.jsxs)(`b`, {
                children: [
                  `COMBO `,
                  (0, p.jsxs)(`i`, { children: [`×`, E.combo] }),
                ],
              }),
            ],
          }),
          (0, p.jsxs)(`div`, {
            className: `screen`,
            children: [
              (0, p.jsx)(`canvas`, {
                ref: e,
                width: m,
                height: h,
                onPointerDown: (e) => {
                  ((r.current = !0),
                    e.currentTarget.setPointerCapture(e.pointerId),
                    ke(e));
                },
                onPointerMove: ke,
                onPointerUp: () => (r.current = !1),
                onPointerCancel: () => (r.current = !1),
                onLostPointerCapture: () => (r.current = !1),
              }),
              d === `menu` &&
                (0, p.jsxs)(`div`, {
                  className: `overlay intro`,
                  onPointerDown: () => {
                    let e = c.current;
                    e && s.current && e.play().catch(() => {});
                  },
                  children: [
                    (0, p.jsx)(`span`, { className: `orbit`, children: `✦` }),
                    (0, p.jsx)(`h2`, { children: `오딧세이` }),
                    (0, p.jsx)(`p`, { children: `ODYSSEY` }),
                    (0, p.jsx)("div", {
                      className: "start-hint",
                      children: "편대 전멸 보너스 · 3기 초합체 화력 ×3",
                    }),
                    (0, p.jsx)("div", {
                      className: "pc-keys",
                      children: "↑↓←→ 이동 · Z 발사 · X 폭탄 · C 무기 · V 정밀",
                    }),
                    (0, p.jsxs)(`label`, {
                      className: `nickname-field`,
                      children: [
                        (0, p.jsx)(`span`, {
                          children: `PILOT NAME · 최대 12자`,
                        }),
                        (0, p.jsx)(`input`, {
                          value: le,
                          maxLength: 12,
                          autoComplete: `off`,
                          placeholder: `비우면 랜덤 이름`,
                          onChange: (e) => ue(e.target.value),
                        }),
                      ],
                    }),
                    (0, p.jsxs)(`button`, {
                      onClick: ye,
                      children: [
                        `MISSION START `,
                        (0, p.jsx)(`b`, { children: `›` }),
                      ],
                    }),
                    (0, p.jsx)(`small`, {
                      children: `이름을 비우면 랜덤 파일럿 이름으로 시작합니다`,
                    }),
                  ],
                }),
              d === `paused` &&
                (0, p.jsx)(re, {
                  title: `PAUSED`,
                  onClose: () => w(`playing`),
                  children: (0, p.jsx)(`p`, {
                    children: `별들의 움직임도 잠시 멈췄습니다.`,
                  }),
                }),
              d === `help` &&
                (0, p.jsxs)(re, {
                  title: `HOW TO PLAY`,
                  onClose: je,
                  children: [
                    (0, p.jsxs)(`div`, {
                      className: `helpgrid`,
                      children: [
                        (0, p.jsx)(`b`, { children: `이동` }),
                        (0, p.jsx)(`span`, {
                          children: `방향키 · WASD · 화면 드래그`,
                        }),
                        (0, p.jsx)(`b`, { children: `사격` }),
                        (0, p.jsx)(`span`, {
                          children: `Z 또는 Space · 모바일 자동 사격`,
                        }),
                        (0, p.jsx)(`b`, { children: `필살기` }),
                        (0, p.jsx)(`span`, { children: `X 또는 B · 하단 폭탄 버튼 · 보스 광선도 취소` }),
                        (0, p.jsx)(`b`, { children: `정밀 회피` }),
                        (0, p.jsx)(`span`, { children: `V 또는 Shift를 누른 채 방향키 · 천천히 움직여 탄막 회피` }),
                        (0, p.jsx)(`b`, { children: `메뉴` }),
                        (0, p.jsx)(`span`, {
                          children: `P 일시정지 · L 랭킹 · M 음소거`,
                        }),
                        (0, p.jsx)(`b`, { children: `무기 전환` }),
                        (0, p.jsx)(`span`, {
                          children: `C · 하단 무기 버튼으로 4종 순환`,
                        }),
                        (0, p.jsx)(`b`, { children: `보스전` }),
                        (0, p.jsx)(`span`, {
                          children: `5스테이지마다 등장 · 체력 절반부터 2페이즈 · 붉은 예고선 밖으로 피하기`,
                        }),
                        (0, p.jsx)(`b`, { children: `피격 페널티` }),
                        (0, p.jsx)(`span`, {
                          children: `실드 → 동료 기체 → 생명 순서로 보호 · 중앙 흰 점이 피격 중심`,
                        }),
                      ],
                    }),
                    (0, p.jsxs)("div", {
                      className: "weapon-guide",
                      children: [
                        ...WEAPONS.map((spec) =>
                          (0, p.jsxs)(
                            "p",
                            {
                              children: [
                                (0, p.jsx)("b", {
                                  style: { color: spec.color },
                                  children: spec.name,
                                }),
                                (0, p.jsx)("span", {
                                  children: spec.description,
                                }),
                              ],
                            },
                            spec.id,
                          ),
                        ),
                        (0, p.jsx)("p", {
                          children: "초록 별 편대 5기를 전멸하면 500점 × 합체 기체 수와 D·M 보너스. 피격 없이 연속 전멸하면 최대 2배 보너스! 보스 광선은 1.2초 먼저 예고하고, 폭탄으로 지울 수 있습니다.",
                        }),
                        (0, p.jsx)("p", {
                          children:
                            "4초 안에 다음 적을 격추해 콤보 유지. 12연속 격추마다 6초간 위력 +25%, 발사 간격 −30%. D 구조선은 주기적으로 등장합니다.",
                        }),
                      ],
                    }),
                    (0, p.jsxs)(`div`, {
                      className: `itemhelp`,
                      children: [
                        (0, p.jsx)(`h3`, { children: `ITEM GUIDE` }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `M` }),
                            (0, p.jsx)(`span`, { children: `통합 무기 강화` }),
                            (0, p.jsx)(`em`, {
                              children: `최대 4단계 · 공격력·발사 수·연사 강화`,
                            }),
                          ],
                        }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `D` }),
                            (0, p.jsx)(`span`, { children: `동료 합체` }),
                            (0, p.jsx)(`em`, {
                              children: `D 1개: 2기 나란히 · D 2개: 하나의 대형 기체, 1기 대비 미사일 피해 ×3`,
                            }),
                          ],
                        }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `H` }),
                            (0, p.jsx)(`span`, { children: `방어막` }),
                            (0, p.jsx)(`em`, {
                              children: `한 겹마다 피격 1회 방어 · 3개 5초 / 5개 10초 무적`,
                            }),
                          ],
                        }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `♥` }),
                            (0, p.jsx)(`span`, { children: `라이프` }),
                            (0, p.jsx)(`em`, {
                              children: `생명 +1 · 일반 몹에게서는 드롭되지 않음`,
                            }),
                          ],
                        }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `B` }),
                            (0, p.jsx)(`span`, { children: `폭탄` }),
                            (0, p.jsx)(`em`, {
                              children: `폭탄 +1 · 대형 몹 처치 시 반드시 드롭`,
                            }),
                          ],
                        }),
                        (0, p.jsxs)(`p`, {
                          children: [
                            (0, p.jsx)(`b`, { children: `G` }),
                            (0, p.jsx)(`span`, { children: `골드` }),
                            (0, p.jsx)(`em`, {
                              children: `201스테이지부터 등장 · 100점`,
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
              d === `leaderboard` &&
                (0, p.jsxs)(re, {
                  title:
                    E.life <= 0 ? `MISSION END · RANKING` : `GALACTIC RANKING`,
                  onClose: je,
                  resumeLabel: E.life <= 0 ? `다시 시작` : `계속하기`,
                  children: [
                    E.life <= 0 &&
                      (0, p.jsxs)(`div`, {
                        className: `game-over-title`,
                        children: [
                          (0, p.jsx)(`strong`, { children: `GAME OVER` }),
                          (0, p.jsxs)(`span`, { children: [`PILOT · `, de] }),
                        ],
                      }),
                    pe
                      ? (0, p.jsx)(`p`, {
                          className: `rank-empty`,
                          children: `순위 데이터를 불러오는 중...`,
                        })
                      : k.length === 0
                        ? (0, p.jsx)(`p`, {
                            className: `rank-empty`,
                            children: `아직 등록된 파일럿이 없습니다.`,
                          })
                        : (0, p.jsx)(`ol`, {
                            className: `rank`,
                            children: k.slice(D * 5, D * 5 + 5).map((e, t) =>
                              (0, p.jsxs)(
                                `li`,
                                {
                                  children: [
                                    (0, p.jsxs)(`em`, {
                                      children: [`#`, D * 5 + t + 1],
                                    }),
                                    (0, p.jsx)(`b`, {
                                      style: {
                                        fontSize: `${C(e.nickname)}px`,
                                      },
                                      children: e.nickname,
                                    }),
                                    (0, p.jsxs)(`span`, {
                                      children: [
                                        `LV.`,
                                        e.level,
                                        ` · `,
                                        e.score.toLocaleString(),
                                      ],
                                    }),
                                  ],
                                },
                                e.id,
                              ),
                            ),
                          }),
                    (0, p.jsxs)(`div`, {
                      className: `pager`,
                      children: [
                        (0, p.jsx)(`button`, {
                          onClick: (e) => {
                            (e.stopPropagation(), O((e) => Math.max(0, e - 1)));
                          },
                          disabled: D === 0,
                          children: `‹`,
                        }),
                        (0, p.jsxs)(`i`, { children: [D + 1, ` / `, Ae] }),
                        (0, p.jsx)(`button`, {
                          onClick: (e) => {
                            (e.stopPropagation(),
                              O((e) => Math.min(Ae - 1, e + 1)));
                          },
                          disabled: D >= Ae - 1,
                          children: `›`,
                        }),
                      ],
                    }),
                  ],
                }),
              d === `gameOver` &&
                (0, p.jsxs)(`div`, {
                  className: `overlay intro`,
                  children: [
                    (0, p.jsx)(`span`, {
                      className: `orbit red`,
                      children: `×`,
                    }),
                    (0, p.jsx)(`h2`, { children: `MISSION END` }),
                    (0, p.jsxs)(`strong`, {
                      className: `player-tag`,
                      children: [`PILOT · `, de],
                    }),
                    (0, p.jsxs)(`p`, {
                      children: [`SCORE `, E.score.toLocaleString()],
                    }),
                    (0, p.jsxs)(`button`, {
                      onClick: _e,
                      children: [`RETRY `, (0, p.jsx)(`b`, { children: `↻` })],
                    }),
                  ],
                }),
              d === `victory` &&
                (0, p.jsxs)(`div`, {
                  className: `overlay intro victory`,
                  children: [
                    (0, p.jsx)(`span`, {
                      className: `victory-star`,
                      children: `★`,
                    }),
                    (0, p.jsx)(`small`, { children: `300 SECTORS COMPLETE` }),
                    (0, p.jsx)(`h2`, { children: `오딧세이 완주!` }),
                    (0, p.jsxs)(`strong`, {
                      className: `player-tag`,
                      children: [`PILOT · `, de],
                    }),
                    (0, p.jsxs)(`p`, {
                      children: [`FINAL SCORE `, E.score.toLocaleString()],
                    }),
                    (0, p.jsx)(`blockquote`, {
                      children: `긴 항해의 끝에서 우리는 새로운 별이 되었습니다.`,
                    }),
                    (0, p.jsxs)(`button`, {
                      onClick: _e,
                      children: [
                        `NEW ODYSSEY `,
                        (0, p.jsx)(`b`, { children: `↻` }),
                      ],
                    }),
                  ],
                }),
            ],
          }),
          (0, p.jsxs)(`div`, {
            className: `safe`,
            children: [
              (0, p.jsxs)("div", {
                className: "combat-status",
                children: [
                  (0, p.jsx)("b", {
                    children:
                      E.double >= 2
                        ? "3기 초합체 · 화력 ×3"
                        : E.double === 1
                          ? "2기 나란히 합체"
                          : "1기 출격",
                  }),
                  (0, p.jsx)("span", {
                    children: E.squadTotal
                      ? `편대 ${E.squadKills}/${E.squadTotal} · 전멸 +${E.squadBonus.toLocaleString()}점`
                      : E.bossWarning ? "붉은 예고선 밖으로 회피!"
                      : E.squadStreak ? `연속 전멸 ${E.squadStreak}회 · ${E.squadStreak >= 4 ? "보너스 MAX" : "다음 보너스 상승"}`
                      : weaponSpec(E.weapon).description,
                  }),
                ],
              }),
              (0, p.jsxs)(`div`, {
                className: `meters`,
                children: [
                  (0, p.jsx)(ie, {
                    label: `M · 공격/확산/연사`,
                    value: E.weaponLevel,
                    max: 4,
                    color: `#55f7ff`,
                  }),
                  (0, p.jsx)(ie, {
                    label: `SHIELD`,
                    value: E.shield,
                    color: `#ff455e`,
                  }),
                  (0, p.jsxs)("div", {
                    className: "drive-meter",
                    children: [
                      (0, p.jsx)("span", {
                        children:
                          E.driveTicks > 0
                            ? `OVERDRIVE ${Math.ceil(E.driveTicks / 60)}초`
                            : `연속 격추 ${E.driveCharge || 0}/12`,
                      }),
                      (0, p.jsx)("progress", {
                        "aria-label": "오버드라이브",
                        max: E.driveTicks > 0 ? 360 : 12,
                        value:
                          E.driveTicks > 0 ? E.driveTicks : E.driveCharge || 0,
                      }),
                    ],
                  }),
                ],
              }),
              (0, p.jsxs)(`div`, {
                className: `mobile-controls`,
                children: [
                  (0, p.jsxs)(`button`, {
                    className: `weapon-button ${E.weapon}`,
                    onClick: Se,
                    disabled: d !== "playing",
                    "aria-label": "무기 변경",
                    title: "C 키 · " + weaponSpec(E.weapon).description,
                    children: [
                      `↻ `,
                      (0, p.jsxs)(`span`, {
                        children: [weaponSpec(E.weapon).name, ` · 전환`],
                      }),
                    ],
                  }),
                  (0, p.jsxs)(`button`, {
                    className: `bomb`,
                    onClick: Te,
                    disabled: d !== "playing" || E.bombs < 1,
                    children: [
                      `✹ `,
                      (0, p.jsxs)(`span`, { children: [`BOMB · `, E.bombs] }),
                    ],
                  }),
                ],
              }),
              (0, p.jsxs)(`div`, {
                className: `legend`,
                children: [
                  (0, p.jsxs)(`span`, {
                    children: [
                      (0, p.jsx)(`i`, { children: `M` }),
                      ` 공격·확산·연사`,
                    ],
                  }),
                  (0, p.jsxs)(`span`, {
                    children: [(0, p.jsx)(`i`, { children: `H` }), ` 방어`],
                  }),
                  (0, p.jsxs)(`span`, {
                    children: [(0, p.jsx)(`i`, { children: `♥` }), ` 라이프`],
                  }),
                  (0, p.jsxs)(`span`, {
                    children: [(0, p.jsx)(`i`, { children: `D` }), ` 합체`],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      (0, p.jsxs)(`aside`, {
        children: [
          (0, p.jsx)(`h3`, { children: `MISSION DATA` }),
          (0, p.jsxs)(`div`, {
            className: `mission`,
            children: [
              (0, p.jsx)(`span`, { children: `CURRENT SECTOR` }),
              (0, p.jsx)(`strong`, {
                children: String(E.level).padStart(3, `0`),
              }),
              (0, p.jsx)(`small`, {
                children:
                  E.level === 300
                    ? `FINAL BOSS · ODYSSEY CORE`
                    : E.level % 5 == 0
                      ? `BOSS SIGNAL DETECTED`
                      : `CYGNUS OUTER RIM`,
              }),
            ],
          }),
          (0, p.jsx)(`h3`, { children: `ACTIVE SYSTEMS` }),
          (0, p.jsxs)(`ul`, {
            children: [
              (0, p.jsxs)(`li`, {
                children: [
                  (0, p.jsx)(`i`, {
                    className: E.weapon === `laser` ? `cyan` : `gold`,
                  }),
                  weaponSpec(E.weapon).name,
                  ` M 통합강화 `,
                  (0, p.jsxs)(`b`, {
                    children: [`POWER `, E.weaponLevel, `/4`],
                  }),
                ],
              }),
              (0, p.jsxs)(`li`, {
                children: [
                  (0, p.jsx)(`i`, { className: `gold` }),
                  `에너지 실드 `,
                  (0, p.jsxs)(`b`, { children: [E.shield, `/5`] }),
                ],
              }),
              (0, p.jsxs)(`li`, {
                children: [
                  (0, p.jsx)(`i`, { className: `white` }),
                  `윙맨 링크 `,
                  (0, p.jsxs)(`b`, { children: [E.double + 1, `기 / 3기`] }),
                ],
              }),
            ],
          }),
          (0, p.jsxs)(`blockquote`, {
            children: [
              `“우리가 건너는 것은 우주가 아니라, 미지의 가능성이다.”`,
              (0, p.jsx)(`small`, { children: `— ODYSSEY COMMAND` }),
            ],
          }),
        ],
      }),
    ],
  });
}
function re({
  title: e,
  onClose: t,
  children: n,
  resumeLabel: r = `계속하기`,
}) {
  return (0, p.jsx)(`div`, {
    className: `overlay panel`,
    onClick: t,
    children: (0, p.jsxs)(`div`, {
      onClick: (e) => e.stopPropagation(),
      children: [
        (0, p.jsx)(`button`, { className: `close`, onClick: t, children: `×` }),
        (0, p.jsx)(`h2`, { children: e }),
        n,
        (0, p.jsx)(`button`, { className: `resume`, onClick: t, children: r }),
      ],
    }),
  });
}
function ie({ label: e, value: t, color: n, max: r = 5 }) {
  return (0, p.jsxs)(`div`, {
    className: `meter`,
    children: [
      (0, p.jsx)(`span`, { children: e }),
      (0, p.jsx)(`div`, {
        children: Array.from({ length: r }, (_, e) => e).map((e) =>
          (0, p.jsx)(
            `i`,
            {
              style: {
                background: e < t ? n : `#16233f`,
                boxShadow: e < t ? `0 0 10px ${n}` : `none`,
              },
            },
            e,
          ),
        ),
      }),
    ],
  });
}
function ae(e, t, n, r, i, a) {
  (e.save(),
    e.translate(t, n),
    e.scale(r, r),
    (e.shadowBlur = 28),
    (e.shadowColor = i));
  let o = e.createLinearGradient(0, -42, 0, 34);
  (o.addColorStop(0, `#f4ffff`),
    o.addColorStop(0.25, i),
    o.addColorStop(0.62, `#1747a7`),
    o.addColorStop(1, `#071331`),
    (e.fillStyle = o),
    (e.strokeStyle = i),
    (e.lineWidth = 3),
    e.beginPath(),
    e.moveTo(0, -44),
    e.lineTo(-11, -13),
    e.lineTo(-43, 17),
    e.lineTo(-25, 32),
    e.lineTo(-8, 20),
    e.lineTo(0, 35),
    e.lineTo(8, 20),
    e.lineTo(25, 32),
    e.lineTo(43, 17),
    e.lineTo(11, -13),
    e.closePath(),
    e.fill(),
    e.stroke(),
    (e.fillStyle = `#07142b`),
    e.beginPath(),
    e.ellipse(0, -10, 8, 17, 0, 0, 7),
    e.fill(),
    (e.strokeStyle = `#d4ffff`),
    e.stroke(),
    (e.fillStyle = `#ffb93e`),
    e.fillRect(-19, 25, 8, 13),
    e.fillRect(11, 25, 8, 13),
    (e.shadowColor = `#ff6b00`),
    (e.shadowBlur = 20),
    (e.fillStyle = `#fff4aa`),
    e.fillRect(-17, 35, 4, 12 + (a % 7)),
    e.fillRect(13, 35, 4, 14 + ((a + 3) % 7)),
    e.restore());
}
((0, d.createRoot)(document.getElementById(`root`)).render(
  (0, p.jsx)(f.StrictMode, { children: (0, p.jsx)(E, {}) }),
),
  `serviceWorker` in navigator &&
    window.addEventListener(`load`, () => {
      navigator.serviceWorker.register(`./sw.js`);
    }));

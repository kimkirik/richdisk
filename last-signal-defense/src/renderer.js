import { cameraMatrix, upright } from "./viewport.js?v=20260911-fullmap";
import {
  BIOMES,
  TOWERS,
  ENEMIES,
  pathDistance,
} from "./data.js?v=20260911-fullmap";
import { towerStats } from "./engine.js?v=20260911-fullmap";
const advancedTowerImage = new Image();
advancedTowerImage.src = new URL(
  "../assets/advanced-towers.webp",
  import.meta.url,
);
const advancedEnemyImage = new Image();
advancedEnemyImage.src = new URL(
  "../assets/advanced-enemies.webp",
  import.meta.url,
);
const enemyRects = {
  swarm: [0, 0, 0.5, 0.3],
  shield: [0.5, 0, 0.5, 0.311],
  specter: [0, 0.299, 0.49, 0.324],
  healer: [0.5, 0.31, 0.5, 0.273],
  siege: [0, 0.62, 0.5, 0.38],
  sovereign: [0.5, 0.564, 0.5, 0.436],
};
// Normalized source bounds preserve each generated silhouette without cutting barrels.
const towerRects = {
  railgun: [0, 0, 0.6, 0.5],
  plasma: [0.6, 0, 0.4, 0.49],
  mortar: [0, 0.49, 0.53, 0.51],
  nova: [0.56, 0.47, 0.44, 0.53],
};
function atlasSprite(ctx, image, rect, x, y, width, height) {
  const [rx, ry, rw, rh] = rect,
    sw = rw * image.naturalWidth,
    sh = rh * image.naturalHeight,
    scale = Math.min(width / sw, height / sh);
  const dw = sw * scale,
    dh = sh * scale;
  ctx.drawImage(
    image,
    rx * image.naturalWidth,
    ry * image.naturalHeight,
    sw,
    sh,
    x - dw / 2,
    y - dh,
    dw,
    dh,
  );
}
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function random(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function line(ctx, path) {
  ctx.beginPath();
  path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
}
function poly(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function glow(ctx, x, y, r, color, alpha = 0.2) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, color + "00");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
function building(ctx, x, y, w, h, z, theme, rand) {
  ctx.fillStyle = "#0005";
  ctx.beginPath();
  ctx.ellipse(x + 12, y + 10, w * 0.8, h * 0.55, 0, 0, TAU);
  ctx.fill();
  poly(
    ctx,
    [
      [x - w / 2, y - h / 2],
      [x + w / 2, y - h / 2],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ],
    "#091821",
  );
  poly(
    ctx,
    [
      [x - w / 2, y - h / 2 - z],
      [x + w / 2, y - h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x - w / 2, y + h / 2 - z],
    ],
    theme.tile,
  );
  poly(
    ctx,
    [
      [x - w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2],
      [x - w / 2, y + h / 2],
    ],
    "#142731",
  );
  poly(
    ctx,
    [
      [x + w / 2, y - h / 2 - z],
      [x + w / 2, y + h / 2 - z],
      [x + w / 2, y + h / 2],
      [x + w / 2, y - h / 2],
    ],
    "#0b1b27",
  );
  ctx.strokeStyle = theme.accent + "25";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - w / 2, y - h / 2 - z, w, h);
  for (let i = 0; i < Math.floor(w / 10); i++)
    for (let j = 0; j < Math.floor(z / 12); j++)
      if (rand() > 0.38) {
        ctx.fillStyle = theme.light + (rand() > 0.5 ? "99" : "33");
        ctx.fillRect(x - w / 2 + 4 + i * 10, y + h / 2 - z + 5 + j * 12, 4, 3);
      }
  ctx.fillStyle = theme.accent + "60";
  ctx.fillRect(x - w * 0.32, y - h * 0.3 - z, w * 0.4, 3);
}
export function paintMap(canvas, stage, portrait = false) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width,
    H = canvas.height;
  ctx.save();
  ctx.scale(W / 1280, H / 720);
  const t = BIOMES[stage.biome],
    rand = random(stage.seed);
  const bg = ctx.createLinearGradient(0, 0, 1280, 720);
  bg.addColorStop(0, t.sky);
  bg.addColorStop(0.6, t.ground);
  bg.addColorStop(1, t.sky);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 720);
  // Terrain islands and channels, with independent seeded geometry per sector.
  for (let i = 0; i < 7; i++) {
    const x = rand() * 1280,
      y = rand() * 720;
    glow(ctx, x, y, 160 + rand() * 170, t.accent, 0.045);
  }
  ctx.strokeStyle = t.accent + "0c";
  ctx.lineWidth = 1;
  for (let x = -720; x < 1600; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 400, 720);
    ctx.stroke();
  }
  for (let y = 40; y < 720; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1280, y);
    ctx.stroke();
  }
  const channel = [
    { x: -60, y: 530 - (stage.id % 4) * 75 },
    { x: 250, y: 610 - (stage.id % 3) * 130 },
    { x: 610, y: 310 + (stage.id % 4) * 50 },
    { x: 1000, y: 140 + (stage.id % 5) * 60 },
    { x: 1330, y: 120 },
  ];
  line(ctx, channel);
  ctx.strokeStyle = "#0004";
  ctx.lineWidth = 116;
  ctx.stroke();
  ctx.strokeStyle = t.water;
  ctx.lineWidth = 92;
  ctx.stroke();
  ctx.strokeStyle = t.light + "35";
  ctx.lineWidth = 2;
  ctx.stroke();
  if (stage.biome === 2) {
    line(ctx, channel);
    ctx.strokeStyle = "#ff633055";
    ctx.lineWidth = 22;
    ctx.stroke();
    ctx.strokeStyle = "#ffbb5644";
    ctx.lineWidth = 7;
    ctx.stroke();
  }
  if (stage.biome === 4) {
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = i % 7 === 0 ? "#d7c7ff" : "#7271ad";
      ctx.fillRect(rand() * 1280, rand() * 720, i % 7 === 0 ? 2 : 1, 1);
    }
  }
  // Streets have shoulders, inset asphalt, metallic borders and directional markers.
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const path of stage.paths) {
    line(ctx, path);
    ctx.strokeStyle = "#0009";
    ctx.lineWidth = 64;
    ctx.stroke();
    ctx.strokeStyle = t.tile;
    ctx.lineWidth = 52;
    ctx.stroke();
    ctx.strokeStyle = t.accent + "4a";
    ctx.lineWidth = 45;
    ctx.stroke();
    ctx.strokeStyle = "#0b1621";
    ctx.lineWidth = 41;
    ctx.stroke();
    ctx.setLineDash([3, 14]);
    ctx.strokeStyle = t.accent + "45";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Architecture stays off lanes and pads to keep combat readable.
  const structures = [];
  for (let i = 0; i < 160; i++) {
    const p = { x: 45 + rand() * 1190, y: 85 + rand() * 500 };
    const distance = Math.min(
      ...stage.paths.map((path) => pathDistance(p, path)),
    );
    if (
      distance < 65 ||
      stage.pads.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 60) ||
      Math.hypot(p.x - 640, p.y - 620) < 80
    )
      continue;
    structures.push({
      ...p,
      w: 20 + rand() * 45,
      h: 16 + rand() * 25,
      z: 15 + rand() * 65,
    });
  }
  structures.sort((a, b) => (portrait ? a.x - b.x : a.y - b.y));
  for (const b of structures) {
    ctx.save();
    upright(ctx, b.x, b.y, portrait);
    building(ctx, b.x, b.y, b.w, b.h, b.z, t, rand);
    ctx.restore();
  }
  // A distinct sector landmark is etched into the landscape rather than covering roads.
  const lx = 1050,
    ly = 580;
  ctx.save();
  ctx.translate(lx, ly);
  if (portrait) ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = t.accent + "66";
  ctx.fillStyle = t.tile;
  ctx.lineWidth = 3;
  if (["antenna", "spire", "citadel", "fortress"].includes(stage.landmark)) {
    building(ctx, 0, 0, 62, 38, 60, t, rand);
    ctx.strokeStyle = t.accent;
    ctx.beginPath();
    ctx.moveTo(0, -62);
    ctx.lineTo(0, -157);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -110 - i * 16, 28 - i * 5, 8, 0, 0, TAU);
      ctx.stroke();
    }
    glow(ctx, 0, -152, 42, t.light, 0.5);
  } else if (["radar", "gravity", "sanctum", "rift"].includes(stage.landmark)) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, -35, 52 - i * 12, 65 - i * 12, -0.35, 0, TAU);
      ctx.stroke();
    }
    glow(ctx, 0, -35, 70, t.accent, 0.3);
  } else if (
    ["reactor", "foundry", "crater", "refinery"].includes(stage.landmark)
  ) {
    for (let i = 2; i >= 0; i--) {
      ctx.fillStyle = i === 0 ? t.light : t.tile;
      ctx.beginPath();
      ctx.ellipse(0, -i * 15, 58 - i * 12, 26 - i * 5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    glow(ctx, 0, -30, 110, t.light, 0.3);
  } else {
    for (let i = 0; i < 3; i++)
      building(ctx, -60 + i * 45, -i * 10, 34, 28, 30 + i * 12, t, rand);
    ctx.strokeStyle = t.light;
    ctx.beginPath();
    ctx.moveTo(-70, -55);
    ctx.lineTo(70, -55);
    ctx.stroke();
  }
  ctx.restore();
  // Entrances, perimeter strips and coordinates.
  for (const [i, path] of stage.paths.entries()) {
    const p = path[0];
    ctx.save();
    upright(ctx, p.x, p.y, portrait);
    ctx.fillStyle = "#ffae6630";
    ctx.fillRect(p.x - 28, p.y - 11, 56, 22);
    ctx.strokeStyle = "#ffba7c";
    ctx.lineWidth = 2;
    ctx.strokeRect(p.x - 28, p.y - 11, 56, 22);
    ctx.fillStyle = "#ffd6a0";
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`GATE 0${i + 1}`, p.x, p.y + 4);
    ctx.restore();
  }
  ctx.strokeStyle = t.accent + "45";
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, 1252, 692);
  for (const [x, y, sx, sy] of [
    [14, 14, 1, 1],
    [1266, 14, -1, 1],
    [14, 706, 1, -1],
    [1266, 706, -1, -1],
  ]) {
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + sx * 26, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + sy * 26);
    ctx.stroke();
  }
  ctx.fillStyle = t.accent + "88";
  ctx.font = "10px monospace";
  ctx.textAlign = "left";
  if (!portrait)
    ctx.fillText(
      `${stage.en}  /  ${String(stage.id).padStart(2, "0")} — LAST SIGNAL NETWORK`,
      35,
      691,
    );
  const vignette = ctx.createRadialGradient(640, 360, 160, 640, 360, 790);
  vignette.addColorStop(0, "#0000");
  vignette.addColorStop(1, "#010511a0");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, 1280, 720);
  ctx.restore();
}
function machinery(ctx, kind, x, y, size, time = 0) {
  const d = TOWERS[kind],
    c = d.color;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 64, size / 64);
  ctx.strokeStyle = "#050b15";
  ctx.lineWidth = 3;
  ctx.fillStyle = "#09121e";
  ctx.beginPath();
  ctx.ellipse(0, 17, 29, 12, 0, 0, TAU);
  ctx.fill();
  poly(
    ctx,
    [
      [-24, 8],
      [-12, -5],
      [15, -5],
      [26, 8],
      [20, 21],
      [-18, 21],
    ],
    "#233d51",
  );
  ctx.strokeStyle = c;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (kind === "railgun") {
    poly(
      ctx,
      [
        [-14, 8],
        [-8, -17],
        [13, -17],
        [18, 10],
      ],
      "#60758b",
    );
    ctx.fillStyle = "#142334";
    ctx.fillRect(-4, -42, 13, 48);
    ctx.fillStyle = c;
    ctx.fillRect(-1, -40, 3, 40);
    ctx.fillRect(8, -42, 3, 38);
    ctx.fillStyle = "#d2f8ff";
    ctx.fillRect(-4, -44, 16, 4);
  }
  if (kind === "plasma") {
    ctx.strokeStyle = "#9a78b7";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-16, 7);
    ctx.lineTo(-21, -21);
    ctx.moveTo(16, 7);
    ctx.lineTo(21, -21);
    ctx.stroke();
    glow(ctx, 0, -12, 23, c, 0.8);
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(0, -13, 10, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "#ffe5ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -12, 20, 7, time, 0, TAU);
    ctx.stroke();
  }
  if (kind === "mortar") {
    poly(
      ctx,
      [
        [-22, 5],
        [-18, -17],
        [19, -17],
        [23, 5],
      ],
      "#9d957a",
    );
    ctx.save();
    ctx.rotate(-0.3);
    ctx.fillStyle = "#202a36";
    ctx.fillRect(-11, -37, 22, 33);
    ctx.fillStyle = "#c8b897";
    ctx.fillRect(-14, -38, 28, 7);
    ctx.fillStyle = "#0a111c";
    ctx.beginPath();
    ctx.ellipse(0, -39, 11, 4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = c;
    ctx.fillRect(-18, 10, 9, 4);
    ctx.fillRect(11, 10, 9, 4);
  }
  if (kind === "nova") {
    for (let i = 0; i < 4; i++) {
      const angle = (i * TAU) / 4 + time * 0.35;
      const px = Math.cos(angle) * 20,
        py = Math.sin(angle) * 9;
      poly(
        ctx,
        [
          [px - 4, py],
          [px, py - 26],
          [px + 5, py],
          [px, py + 5],
        ],
        "#436d72",
      );
    }
    glow(ctx, 0, -16, 28, c, 0.8);
    poly(
      ctx,
      [
        [0, -39],
        [11, -17],
        [0, 1],
        [-11, -17],
      ],
      c,
    );
    ctx.strokeStyle = "#e8fff7";
    ctx.beginPath();
    ctx.ellipse(0, -15, 25, 9, -0.2, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}
export function towerIcon(canvas, kind) {
  canvas.width = 120;
  canvas.height = 90;
  const draw = () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 120, 90);
    if (advancedTowerImage.complete && advancedTowerImage.naturalWidth)
      atlasSprite(ctx, advancedTowerImage, towerRects[kind], 60, 88, 112, 85);
    else machinery(ctx, kind, 60, 61, 74);
  };
  draw();
  if (!advancedTowerImage.complete)
    advancedTowerImage.addEventListener("load", draw, { once: true });
}
function customEnemy(ctx, e, time) {
  const d = ENEMIES[e.kind],
    size = d.boss ? 1.8 : e.kind === "siege" ? 1.25 : 0.75;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.scale(size, size);
  const c = d.color;
  ctx.fillStyle = "#101d2c";
  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  if (e.kind === "swarm") {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-8, i * 8 - 9);
      ctx.lineTo(-23, i * 12 - 16);
      ctx.moveTo(8, i * 8 - 9);
      ctx.lineTo(23, i * 12 - 16);
      ctx.stroke();
    }
    poly(
      ctx,
      [
        [0, -21],
        [13, -6],
        [10, 17],
        [0, 23],
        [-10, 17],
        [-13, -6],
      ],
      "#386653",
    );
    glow(ctx, 0, -5, 15, c, 0.6);
  } else if (e.kind === "shield") {
    poly(
      ctx,
      [
        [-14, 18],
        [-20, -10],
        [0, -25],
        [20, -10],
        [14, 18],
      ],
      "#304a76",
    );
    ctx.stroke();
    ctx.strokeStyle = c + "99";
    ctx.beginPath();
    ctx.ellipse(0, -2, 32, 38, 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = c;
    ctx.fillRect(-8, -11, 16, 6);
  } else if (e.kind === "specter") {
    glow(ctx, 0, 0, 40, c, 0.4);
    poly(
      ctx,
      [
        [0, -32],
        [22, -5],
        [12, 25],
        [0, 14],
        [-12, 25],
        [-22, -5],
      ],
      "#725291",
    );
    ctx.stroke();
    ctx.fillStyle = "#ffe1ff";
    ctx.fillRect(-7, -8, 14, 4);
  } else if (e.kind === "healer") {
    const y = Math.sin(time * 4) * 5;
    ctx.translate(0, y);
    for (let i = -1; i <= 1; i += 2) {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.ellipse(i * 24, 0, 15, 5, 0, 0, TAU);
      ctx.stroke();
    }
    poly(
      ctx,
      [
        [0, -18],
        [16, 0],
        [0, 18],
        [-16, 0],
      ],
      "#447568",
    );
    ctx.fillStyle = c;
    ctx.fillRect(-3, -8, 6, 16);
    ctx.fillRect(-8, -3, 16, 6);
  } else if (e.kind === "siege") {
    ctx.fillStyle = "#0d1523";
    ctx.fillRect(-27, -23, 12, 48);
    ctx.fillRect(15, -23, 12, 48);
    poly(
      ctx,
      [
        [-18, 22],
        [-18, -22],
        [18, -22],
        [18, 22],
      ],
      "#837561",
    );
    ctx.stroke();
    ctx.fillStyle = "#172839";
    ctx.fillRect(-7, -35, 14, 36);
    ctx.fillStyle = c;
    ctx.fillRect(-10, 5, 20, 5);
  } else {
    glow(ctx, 0, -8, 62, c, 0.4);
    for (let i = 0; i < 6; i++) {
      const a = time * 0.3 + (i * TAU) / 6;
      poly(
        ctx,
        [
          [Math.cos(a) * 24, Math.sin(a) * 24],
          [Math.cos(a) * 47, Math.sin(a) * 47],
          [Math.cos(a + 0.25) * 30, Math.sin(a + 0.25) * 30],
        ],
        "#9781b6",
      );
    }
    poly(
      ctx,
      [
        [0, -36],
        [28, -11],
        [18, 30],
        [-18, 30],
        [-28, -11],
      ],
      "#4e3b70",
    );
    ctx.stroke();
    ctx.fillStyle = "#ffeaff";
    ctx.beginPath();
    ctx.arc(0, -3, 8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.base = document.createElement("canvas");
    this.base.width = 1280;
    this.base.height = 720;
    this.particles = [];
    this.effects = [];
    this.seen = 0;
    this.stageId = 0;
    this.shake = 0;
    this.victoryTime = null;
    this.lastFallen = null;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)");
    this.defenders = new Image();
    this.defenders.src = new URL("../assets/defenders.webp", import.meta.url);
    this.monsters = new Image();
    this.monsters.src = new URL("../assets/enemies.webp", import.meta.url);
    this.resize = new ResizeObserver(() => {
      const r = canvas.getBoundingClientRect(),
        dpr = Math.min(devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    });
    this.resize.observe(canvas);
  }
  reset(stage) {
    this.stageId = stage.id;
    paintMap(this.base, stage, this.portrait);
    this.particles = [];
    this.effects = [];
    this.seen = 0;
    this.shake = 0;
    this.victoryTime = null;
    this.lastFallen = null;
  }
  burst(x, y, color, count, power = 1) {
    if (this.reduced.matches) return;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU,
        s = (25 + Math.random() * 115) * power;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        color,
        life: 0.3 + Math.random() * 0.65,
        max: 1,
        size: 1 + Math.random() * 2,
      });
    }
    this.particles = this.particles.slice(-420);
  }
  consume(g) {
    const fresh = g.events.filter((e) => e.id > this.seen);
    for (const e of fresh) {
      this.seen = e.id;
      if (e.type === "kill") this.lastFallen = e;
      if (e.type === "victory") {
        this.victoryTime = 0;
        const { x, y } = g.stage.core;
        this.burst(x, y, "#80f3ff", 72, 2.5);
        if (this.lastFallen)
          this.burst(this.lastFallen.x, this.lastFallen.y, "#fff1cb", 60, 2);
      }
      if (
        [
          "shot",
          "explosion",
          "emp",
          "build",
          "repair",
          "corehit",
          "kill",
        ].includes(e.type)
      ) {
        this.effects.push({
          ...e,
          life: e.type === "emp" ? 1.2 : e.type === "shot" ? 0.32 : 0.8,
          max: e.type === "emp" ? 1.2 : e.type === "shot" ? 0.32 : 0.8,
        });
        if (e.type === "shot") {
          if (!["missile", "mortar"].includes(e.kind))
            this.burst(
              e.x2,
              e.y2,
              e.color,
              e.kind === "railgun" ? 16 : 6,
              0.65,
            );
        } else
          this.burst(
            e.x,
            e.y,
            e.color,
            e.type === "kill" ? 16 : 32,
            e.power || 1,
          );
        if (["explosion", "corehit"].includes(e.type))
          this.shake = Math.max(this.shake, e.type === "corehit" ? 7 : 3);
      }
    }
    this.effects = this.effects.slice(-110);
    return fresh;
  }
  draw(g, selected, hover, dt) {
    const portrait = this.canvas.clientHeight > this.canvas.clientWidth;
    if (this.portrait !== portrait) {
      this.portrait = portrait;
      this.stageId = 0;
    }
    if (this.stageId !== g.stage.id) this.reset(g.stage);
    this.consume(g);
    const ctx = this.ctx,
      W = this.canvas.width,
      H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.setTransform(...cameraMatrix(W, H, portrait));
    ctx.save();
    const moving = !g.paused && ["combat", "build"].includes(g.phase);
    const celebrating = g.phase === "victory" && this.victoryTime !== null;
    if (celebrating && !g.paused)
      this.victoryTime += Math.min(0.1, Math.max(0, dt));
    const step = moving
      ? Math.min(0.06, dt) * g.speed
      : celebrating && !g.paused
        ? Math.min(0.1, dt) * 0.28
        : 0;
    const time = this.reduced.matches ? 0 : g.time;
    if (!this.reduced.matches && moving && this.shake > 0.1) {
      ctx.translate(
        (Math.random() - 0.5) * this.shake,
        (Math.random() - 0.5) * this.shake,
      );
      this.shake *= 0.82;
    }
    ctx.drawImage(this.base, 0, 0);
    const color = BIOMES[g.stage.biome].accent;
    // Moving lane arrows show the true attack routes.
    if (g.phase === "combat" && !this.reduced.matches) {
      ctx.save();
      ctx.strokeStyle = color + "77";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 46]);
      ctx.lineDashOffset = -time * 22;
      g.stage.paths.forEach((p) => {
        line(ctx, p);
        ctx.stroke();
      });
      ctx.restore();
    }
    const tower = g.towers.find((t) => t.id === selected);
    if (tower) {
      const stats = towerStats(tower);
      ctx.fillStyle = stats.color + "0d";
      ctx.strokeStyle = stats.color + "88";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([7, 8]);
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, stats.range, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (const pad of g.stage.pads) {
      if (g.towers.some((t) => t.padId === pad.id)) continue;
      ctx.save();
      ctx.translate(pad.x, pad.y);
      if (portrait) ctx.rotate(-Math.PI / 2);
      ctx.strokeStyle = pad.id === hover ? "#d5fcff" : color + "88";
      ctx.fillStyle = color + "0e";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 15, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.rotate(time * 0.2);
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.ellipse(0, 0, 31, 22, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = color;
      ctx.font = "18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText("+", pad.x, pad.y + 5);
    }
    // Core reactor / holographic uplink.
    const core = g.stage.core;
    ctx.save();
    upright(ctx, core.x, core.y, portrait);
    glow(ctx, core.x, core.y - 14, 85, g.core < 30 ? "#ff7265" : color, 0.3);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(
        core.x,
        core.y - 8 - i * 10,
        35 + i * 13,
        12 + i * 5,
        0,
        time * 0.7 + i,
        time * 0.7 + i + Math.PI * 1.65,
      );
      ctx.stroke();
    }
    poly(
      ctx,
      [
        [640, 594],
        [656, 620],
        [640, 643],
        [624, 620],
      ],
      color,
    );
    const beam = ctx.createLinearGradient(640, 490, 640, 625);
    beam.addColorStop(0, color + "00");
    beam.addColorStop(1, color + "77");
    poly(
      ctx,
      [
        [625, 490],
        [655, 490],
        [644, 625],
        [636, 625],
      ],
      beam,
    );
    ctx.restore();
    const units = [
      ...g.towers.map((t) => ({ ...t, tower: true })),
      ...g.enemies,
    ].sort((a, b) => (portrait ? a.x - b.x : a.y - b.y));
    for (const u of units) {
      ctx.save();
      upright(ctx, u.x, u.y, portrait);
      const unitScale = u.tower ? (portrait ? 1.3 : 1) : 1;
      ctx.translate(u.x, u.y);
      // Keep units undistorted when a landscape phone uses the full available map.
      const aspectCorrection = portrait ? 1 : H / 720 / (W / 1280);
      ctx.scale(unitScale * aspectCorrection, unitScale);
      ctx.translate(-u.x, -u.y);
      if (u.tower) {
        const d = TOWERS[u.kind];
        glow(ctx, u.x, u.y, 36, d.color, 0.13);
        if (
          towerRects[u.kind] &&
          advancedTowerImage.complete &&
          advancedTowerImage.naturalWidth
        ) {
          atlasSprite(
            ctx,
            advancedTowerImage,
            towerRects[u.kind],
            u.x,
            u.y + 13,
            92,
            93,
          );
        } else if (
          d.atlas !== undefined &&
          this.defenders.complete &&
          this.defenders.naturalWidth
        ) {
          const sw = this.defenders.naturalWidth / 2,
            sh = this.defenders.naturalHeight / 2;
          ctx.drawImage(
            this.defenders,
            (d.atlas % 2) * sw,
            Math.floor(d.atlas / 2) * sh,
            sw,
            sh,
            u.x - 40,
            u.y - 64,
            80,
            80,
          );
        } else machinery(ctx, u.kind, u.x, u.y - 3, 68, time);
        ctx.fillStyle = "#081624";
        ctx.fillRect(u.x + 15, u.y + 6, 22, 14);
        ctx.fillStyle = d.color;
        ctx.font = "bold 10px monospace";
        ctx.fillText(`M${u.level}`, u.x + 26, u.y + 17);
      } else {
        const d = ENEMIES[u.kind],
          size = d.boss
            ? 164
            : ["brute", "siege"].includes(u.kind)
              ? 98
              : u.kind === "shield"
                ? 84
                : 76;
        ctx.save();
        if (u.stun > 0) {
          ctx.strokeStyle = "#b4afff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(u.x, u.y + 4, 25, 11, 0, 0, TAU);
          ctx.stroke();
        }
        if (u.flash > 0) ctx.globalAlpha = 0.7;
        if (
          enemyRects[u.kind] &&
          advancedEnemyImage.complete &&
          advancedEnemyImage.naturalWidth
        ) {
          atlasSprite(
            ctx,
            advancedEnemyImage,
            enemyRects[u.kind],
            u.x,
            u.y + size * 0.2 + Math.sin(time * 8 + u.id) * 2,
            size,
            size * 0.84,
          );
        } else if (
          d.atlas !== undefined &&
          this.monsters.complete &&
          this.monsters.naturalWidth
        ) {
          const sw = this.monsters.naturalWidth / 3,
            sh = this.monsters.naturalHeight / 2;
          ctx.drawImage(
            this.monsters,
            (d.atlas % 3) * sw,
            Math.floor(d.atlas / 3) * sh,
            sw,
            sh,
            u.x - size / 2,
            u.y - size * 0.68 + Math.sin(time * 8 + u.id) * 2,
            size,
            size,
          );
        } else customEnemy(ctx, u, time);
        ctx.restore();
        ctx.fillStyle = "#050b12";
        ctx.fillRect(u.x - size * 0.38, u.y - size * 0.67 - 6, size * 0.76, 4);
        ctx.fillStyle = u.slow > 0 ? "#83ecff" : "#ff9b79";
        ctx.fillRect(
          u.x - size * 0.38,
          u.y - size * 0.67 - 6,
          size * 0.76 * clamp(u.hp / u.maxHp, 0, 1),
          4,
        );
        if (u.shield > 0) {
          ctx.fillStyle = "#8ab9ff";
          ctx.fillRect(
            u.x - size * 0.38,
            u.y - size * 0.67 - 10,
            (size * 0.76 * u.shield) / u.maxShield,
            2,
          );
        }
        if (d.boss) {
          ctx.fillStyle = "#ffd0bb";
          ctx.font = "bold 11px monospace";
          ctx.textAlign = "center";
          ctx.fillText(u.name || d.name, u.x, u.y - size * 0.67 - 17);
        }
      }
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of g.projectiles) {
      const q = 1 - p.remaining / p.total;
      const x = p.x1 + (p.x2 - p.x1) * q,
        y =
          p.y1 +
          (p.y2 - p.y1) * q -
          Math.sin(q * Math.PI) * (p.kind === "mortar" ? 90 : 35);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x - (p.x2 - p.x1) * 0.06, y - (p.y2 - p.y1) * 0.06);
      ctx.lineTo(x, y);
      ctx.stroke();
      glow(ctx, x, y, 18, p.color, 0.7);
    }
    for (const effect of this.effects) {
      effect.life -= step;
      const q = clamp(1 - effect.life / effect.max, 0, 1);
      ctx.globalAlpha = 1 - q;
      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 2;
      if (effect.type === "shot") {
        if (["missile", "mortar"].includes(effect.kind)) continue;
        ctx.lineWidth =
          effect.kind === "railgun" ? 5 : effect.kind === "plasma" ? 7 : 2;
        ctx.beginPath();
        ctx.moveTo(effect.x1, effect.y1);
        if (effect.kind === "tesla") {
          for (let j = 1; j < 8; j++) {
            const f = j / 8;
            ctx.lineTo(
              effect.x1 +
                (effect.x2 - effect.x1) * f +
                (Math.random() - 0.5) * 23,
              effect.y1 +
                (effect.y2 - effect.y1) * f +
                (Math.random() - 0.5) * 23,
            );
          }
        }
        ctx.lineTo(effect.x2, effect.y2);
        ctx.stroke();
        if (effect.kind === "nova") {
          ctx.beginPath();
          ctx.arc(effect.x1, effect.y1, q * 245, 0, TAU);
          ctx.stroke();
        }
        glow(
          ctx,
          effect.x2,
          effect.y2,
          effect.kind === "plasma" ? 36 : 22,
          effect.color,
          0.7,
        );
      } else {
        const radius =
          effect.type === "emp"
            ? q * 900
            : effect.type === "explosion"
              ? q * 110 * (effect.power || 1)
              : q * 65;
        ctx.beginPath();
        ctx.ellipse(
          effect.x,
          effect.y,
          Math.max(1, radius),
          Math.max(1, radius * (effect.type === "build" ? 0.45 : 1)),
          0,
          0,
          TAU,
        );
        ctx.stroke();
        if (effect.type === "explosion") {
          glow(
            ctx,
            effect.x,
            effect.y,
            Math.max(5, 80 * (1 - q)),
            effect.color,
            0.8,
          );
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, radius * 0.65, 0, TAU);
          ctx.stroke();
        }
        if (effect.type === "kill") {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = "#ffe7ad";
          ctx.font = "bold 12px monospace";
          ctx.textAlign = "center";
          ctx.save();
          upright(ctx, effect.x, effect.y, portrait);
          ctx.fillText(`+${effect.reward}`, effect.x, effect.y - q * 45);
          ctx.restore();
          ctx.globalCompositeOperation = "lighter";
        }
      }
    }
    this.effects = this.effects.filter((e) => e.life > 0);
    if (this.reduced.matches) this.particles = [];
    for (const p of this.particles) {
      p.life -= step;
      p.x += p.vx * step;
      p.y += p.vy * step;
      p.vy += 70 * step;
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
      ctx.stroke();
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    ctx.restore();
    if (celebrating && this.victoryTime < 3) this.drawVictory(g, portrait);
    if (!this.reduced.matches) {
      ctx.fillStyle = color;
      for (let i = 0; i < 22; i++) {
        ctx.globalAlpha = 0.1 + Math.sin(time + i) * 0.08;
        ctx.fillRect(
          (i * 173 + time * 8) % 1280,
          (i * 83 - time * 12 + 7200) % 720,
          2,
          2,
        );
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  drawVictory(g, portrait) {
    const ctx = this.ctx;
    const t = this.victoryTime;
    const core = g.stage.core;
    ctx.save();
    if (this.reduced.matches) {
      glow(ctx, core.x, core.y, 120, "#75ecff", 0.3);
      ctx.restore();
      return;
    }
    const fade = Math.min(1, t * 3) * Math.min(1, (3 - t) * 1.5);
    // The last destroyed unit dissolves in slow motion while the simulation is stopped.
    const fallen = this.lastFallen;
    if (fallen?.kind && t < 1.5) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, 0.6 * (1 - t / 1.5));
      upright(ctx, fallen.x, fallen.y, portrait);
      const size = fallen.boss ? 164 : 76;
      const rect = enemyRects[fallen.kind];
      if (
        rect &&
        advancedEnemyImage.complete &&
        advancedEnemyImage.naturalWidth
      )
        atlasSprite(
          ctx,
          advancedEnemyImage,
          rect,
          fallen.x,
          fallen.y + size * 0.2,
          size,
          size * 0.84,
        );
      else if (
        ENEMIES[fallen.kind].atlas !== undefined &&
        this.monsters.complete &&
        this.monsters.naturalWidth
      ) {
        const index = ENEMIES[fallen.kind].atlas;
        const sw = this.monsters.naturalWidth / 3,
          sh = this.monsters.naturalHeight / 2;
        ctx.drawImage(
          this.monsters,
          (index % 3) * sw,
          Math.floor(index / 3) * sh,
          sw,
          sh,
          fallen.x - size / 2,
          fallen.y - size * 0.68,
          size,
          size,
        );
      }
      ctx.restore();
      glow(
        ctx,
        fallen.x,
        fallen.y,
        45 + t * 100,
        "#ffe4b5",
        (1 - t / 1.5) * 0.5,
      );
    }
    ctx.globalCompositeOperation = "lighter";
    glow(ctx, core.x, core.y, 100 + t * 170, "#5bedff", fade * 0.42);
    for (let i = 0; i < 3; i++) {
      const age = t - i * 0.34;
      if (age < 0) continue;
      const radius = 28 + age * 510;
      ctx.globalAlpha = Math.max(0, 0.65 - age * 0.2) * fade;
      ctx.strokeStyle = i ? "#77d8ff" : "#c1ffff";
      ctx.lineWidth = i ? 2 : 5;
      ctx.beginPath();
      ctx.arc(core.x, core.y, radius, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = fade;
    ctx.save();
    upright(ctx, core.x, core.y, portrait);
    const beam = ctx.createLinearGradient(core.x, core.y - 650, core.x, core.y);
    beam.addColorStop(0, "#55dfff00");
    beam.addColorStop(1, "#b7fbff99");
    ctx.fillStyle = beam;
    ctx.fillRect(core.x - 10 - t * 4, core.y - 650, 20 + t * 8, 650);
    ctx.restore();
    ctx.restore();
  }
}

export const WORLD = { width: 1280, height: 720 };
export const TOWERS = {
  gatling: {
    name: "개틀링",
    tag: "고속 연사",
    cost: 90,
    damage: 12,
    rate: 0.23,
    range: 190,
    color: "#ffc86d",
    unlock: 1,
    atlas: 0,
    desc: "가까운 적을 빠르게 제압합니다.",
  },
  cryo: {
    name: "크라이오",
    tag: "빙결 감속",
    cost: 125,
    damage: 14,
    rate: 0.8,
    range: 235,
    color: "#71eeff",
    unlock: 1,
    atlas: 1,
    slow: 2.5,
    desc: "이동 속도를 55% 낮춰 화력 시간을 확보합니다.",
  },
  tesla: {
    name: "테슬라",
    tag: "연쇄 전격",
    cost: 170,
    damage: 29,
    rate: 1.05,
    range: 225,
    color: "#c395ff",
    unlock: 2,
    atlas: 2,
    chain: 3,
    desc: "최대 3기의 적에게 연쇄 전격을 가합니다.",
  },
  missile: {
    name: "미사일",
    tag: "유도 폭발",
    cost: 210,
    damage: 76,
    rate: 1.8,
    range: 310,
    color: "#ff966f",
    unlock: 3,
    atlas: 3,
    splash: 78,
    desc: "착탄 지점 주변의 적을 함께 폭파합니다.",
  },
  railgun: {
    name: "레일건",
    tag: "장갑 관통",
    cost: 260,
    damage: 155,
    rate: 2.1,
    range: 410,
    color: "#83b9ff",
    unlock: 5,
    pierce: true,
    desc: "장갑을 무시하는 초장거리 고출력 탄환.",
  },
  plasma: {
    name: "플라즈마",
    tag: "지속 화상",
    cost: 285,
    damage: 48,
    rate: 0.85,
    range: 250,
    color: "#fba7ff",
    unlock: 8,
    burn: 3,
    splash: 50,
    desc: "플라즈마 폭발과 3초간의 화상 피해.",
  },
  mortar: {
    name: "시즈 캐논",
    tag: "광역 포격",
    cost: 310,
    damage: 175,
    rate: 2.65,
    range: 360,
    color: "#ffd985",
    unlock: 11,
    splash: 125,
    desc: "느린 발사 속도와 넓은 폭발 반경의 중포.",
  },
  nova: {
    name: "노바 코어",
    tag: "전방위 파동",
    cost: 390,
    damage: 63,
    rate: 1.4,
    range: 245,
    color: "#8affcc",
    unlock: 15,
    nova: true,
    desc: "주변 모든 적에게 파동을 방출하고 잠시 정지시킵니다.",
  },
};
export const ENEMIES = {
  crawler: {
    name: "크롤러",
    hp: 55,
    speed: 64,
    reward: 12,
    damage: 4,
    atlas: 0,
    color: "#ff8e68",
    unlock: 1,
  },
  raider: {
    name: "레이더",
    hp: 85,
    speed: 76,
    reward: 15,
    damage: 6,
    atlas: 1,
    color: "#ffb177",
    unlock: 2,
  },
  armored: {
    name: "아머드",
    hp: 200,
    speed: 44,
    reward: 25,
    damage: 10,
    atlas: 2,
    color: "#d1aa87",
    armor: 0.35,
    unlock: 3,
  },
  drone: {
    name: "스카이 드론",
    hp: 100,
    speed: 96,
    reward: 19,
    damage: 6,
    atlas: 3,
    color: "#89d9ff",
    unlock: 4,
  },
  brute: {
    name: "라바 브루트",
    hp: 390,
    speed: 37,
    reward: 37,
    damage: 14,
    atlas: 4,
    color: "#ff735a",
    armor: 0.18,
    unlock: 6,
  },
  titan: {
    name: "재난 타이탄",
    hp: 1900,
    speed: 26,
    reward: 200,
    damage: 60,
    atlas: 5,
    color: "#ff674d",
    armor: 0.18,
    unlock: 4,
    boss: true,
  },
  swarm: {
    name: "스웜 비틀",
    hp: 65,
    speed: 116,
    reward: 13,
    damage: 3,
    color: "#9cfca2",
    unlock: 5,
  },
  shield: {
    name: "이지스 워커",
    hp: 215,
    speed: 53,
    reward: 29,
    damage: 10,
    color: "#77beff",
    shield: 140,
    unlock: 7,
  },
  specter: {
    name: "페이즈 팬텀",
    hp: 190,
    speed: 85,
    reward: 27,
    damage: 8,
    color: "#d5a1ff",
    unlock: 9,
  },
  healer: {
    name: "리페어 드론",
    hp: 220,
    speed: 57,
    reward: 33,
    damage: 8,
    color: "#8affbd",
    heal: 18,
    unlock: 10,
  },
  siege: {
    name: "공성 크롤러",
    hp: 750,
    speed: 31,
    reward: 60,
    damage: 22,
    color: "#f6c07e",
    armor: 0.5,
    unlock: 13,
  },
  sovereign: {
    name: "공허 군주",
    hp: 2800,
    speed: 24,
    reward: 500,
    damage: 100,
    color: "#f1afff",
    armor: 0.25,
    shield: 450,
    unlock: 20,
    boss: true,
  },
};
export const BIOMES = [
  {
    name: "침수 도시",
    en: "FLOODED DISTRICT",
    ground: "#132b36",
    tile: "#1f3d47",
    water: "#092c40",
    accent: "#6ce6ef",
    light: "#edb76f",
    sky: "#06131f",
  },
  {
    name: "극지 시설",
    en: "POLAR FRONTIER",
    ground: "#314652",
    tile: "#657681",
    water: "#13384e",
    accent: "#a4e8ff",
    light: "#6de4ff",
    sky: "#111e31",
  },
  {
    name: "용암 산업지대",
    en: "EMBER FOUNDRY",
    ground: "#35262e",
    tile: "#544047",
    water: "#721f1f",
    accent: "#ffae64",
    light: "#ff733e",
    sky: "#1a0c18",
  },
  {
    name: "생체 격리구역",
    en: "BIOHAZARD SECTOR",
    ground: "#193630",
    tile: "#2d5047",
    water: "#0c3432",
    accent: "#adffc4",
    light: "#7afaad",
    sky: "#071a18",
  },
  {
    name: "공허 궤도",
    en: "VOID HORIZON",
    ground: "#292442",
    tile: "#484168",
    water: "#161538",
    accent: "#d2acff",
    light: "#b8a0ff",
    sky: "#100c22",
  },
];
const specs = [
  [
    "서초 방어선",
    "SEOCHO OUTPOST",
    "초기 방어망을 구축하세요.",
    0,
    [
      [8, 8, 18, 25, 15, 48, 33, 70],
      [50, 6, 44, 25, 54, 45, 48, 68],
      [93, 8, 82, 26, 88, 48, 69, 70],
    ],
    "antenna",
  ],
  [
    "한강 수문",
    "RIVER GATE",
    "수로 사이의 굽은 전선을 방어하세요.",
    0,
    [
      [6, 23, 25, 23, 25, 51, 43, 51],
      [94, 12, 75, 24, 75, 54, 58, 66],
    ],
    "dam",
  ],
  [
    "성수 철도",
    "RAIL YARD",
    "철도 교차점에 화력을 집중하세요.",
    0,
    [
      [9, 7, 9, 38, 38, 38, 38, 70],
      [91, 7, 91, 38, 63, 38, 63, 70],
      [50, 7, 50, 23, 34, 54, 50, 72],
    ],
    "rail",
  ],
  [
    "남산 송신탑",
    "NAMSAN RELAY",
    "첫 타이탄의 접근이 감지되었습니다.",
    0,
    [
      [4, 10, 22, 29, 16, 58, 36, 74],
      [96, 10, 78, 29, 84, 58, 64, 74],
      [49, 4, 60, 27, 42, 51, 50, 70],
    ],
    "spire",
  ],
  [
    "빙하 관측소",
    "GLACIER STATION",
    "빠른 스웜에 대비해 감속기를 배치하세요.",
    1,
    [
      [7, 15, 31, 15, 31, 45, 18, 61, 41, 75],
      [93, 15, 69, 15, 69, 45, 82, 61, 59, 75],
    ],
    "radar",
  ],
  [
    "오로라 교량",
    "AURORA BRIDGE",
    "두 교량의 적을 중앙에서 저지하세요.",
    1,
    [
      [5, 40, 24, 40, 36, 22, 50, 47],
      [95, 40, 76, 40, 64, 22, 50, 47],
      [50, 5, 44, 19, 56, 60, 50, 73],
    ],
    "bridge",
  ],
  [
    "동결 정제소",
    "FROST REFINERY",
    "보호막 병력이 합류합니다.",
    1,
    [
      [10, 6, 10, 28, 40, 28, 40, 55, 26, 71],
      [90, 6, 90, 28, 60, 28, 60, 55, 74, 71],
    ],
    "refinery",
  ],
  [
    "백야 요새",
    "WHITE NIGHT",
    "동결 요새의 지휘 개체를 격파하세요.",
    1,
    [
      [4, 18, 25, 18, 25, 38, 43, 58],
      [96, 18, 75, 18, 75, 38, 57, 58],
      [50, 5, 50, 28, 36, 48, 50, 72],
    ],
    "fortress",
  ],
  [
    "분화구 외곽",
    "CALDERA RIM",
    "공간을 넘나드는 팬텀에 대비하세요.",
    2,
    [
      [5, 9, 27, 26, 17, 49, 34, 72],
      [95, 9, 73, 26, 83, 49, 66, 72],
      [50, 5, 40, 24, 58, 48, 50, 70],
    ],
    "crater",
  ],
  [
    "적열 운송로",
    "MOLTEN TRANSIT",
    "복구 드론을 먼저 제거하세요.",
    2,
    [
      [3, 26, 23, 26, 39, 43, 28, 62, 45, 76],
      [97, 26, 77, 26, 61, 43, 72, 62, 55, 76],
    ],
    "conveyor",
  ],
  [
    "흑요석 주조소",
    "OBSIDIAN FORGE",
    "중포를 활용해 밀집 공세를 저지하세요.",
    2,
    [
      [8, 9, 31, 9, 31, 31, 14, 50, 38, 73],
      [92, 9, 69, 9, 69, 31, 86, 50, 62, 73],
      [50, 5, 50, 35, 42, 59, 50, 77],
    ],
    "foundry",
  ],
  [
    "태양로 심부",
    "SOLAR FURNACE",
    "과열된 타이탄이 노심에 접근합니다.",
    2,
    [
      [5, 13, 23, 32, 39, 16, 39, 52, 48, 69],
      [95, 13, 77, 32, 61, 16, 61, 52, 52, 69],
      [5, 66, 25, 66, 43, 78],
    ],
    "reactor",
  ],
  [
    "침식 온실",
    "CORRODED GARDEN",
    "중장갑 공성 병력이 진입합니다.",
    3,
    [
      [7, 6, 22, 22, 17, 45, 36, 68],
      [93, 6, 78, 22, 83, 45, 64, 68],
      [50, 5, 50, 22, 39, 47, 52, 72],
    ],
    "garden",
  ],
  [
    "포자 수로",
    "SPORE CANAL",
    "수로를 따라 몰려오는 무리를 제압하세요.",
    3,
    [
      [4, 17, 24, 17, 24, 50, 42, 65],
      [96, 17, 76, 17, 76, 50, 58, 65],
      [50, 5, 40, 28, 60, 48, 50, 75],
    ],
    "canal",
  ],
  [
    "에덴 연구동",
    "EDEN LAB",
    "노바 코어가 해금되었습니다.",
    3,
    [
      [5, 35, 22, 18, 37, 35, 37, 68],
      [95, 35, 78, 18, 63, 35, 63, 68],
      [50, 5, 50, 35, 45, 56, 50, 75],
    ],
    "lab",
  ],
  [
    "오염된 성소",
    "TAINTED SANCTUM",
    "회복 병력과 지휘 개체의 연합 공세.",
    3,
    [
      [4, 8, 26, 29, 16, 49, 33, 72],
      [96, 8, 74, 29, 84, 49, 67, 72],
      [50, 5, 61, 25, 39, 52, 50, 74],
    ],
    "sanctum",
  ],
  [
    "궤도 승강장",
    "ORBITAL DOCK",
    "궤도로 이어지는 마지막 관문입니다.",
    4,
    [
      [4, 30, 28, 30, 28, 53, 45, 70],
      [96, 30, 72, 30, 72, 53, 55, 70],
      [50, 5, 42, 25, 58, 50, 50, 75],
    ],
    "dock",
  ],
  [
    "중력 정거장",
    "GRAVITY STATION",
    "갈라진 플랫폼의 사각지대를 보완하세요.",
    4,
    [
      [9, 8, 28, 20, 18, 43, 38, 61, 43, 76],
      [91, 8, 72, 20, 82, 43, 62, 61, 57, 76],
    ],
    "gravity",
  ],
  [
    "균열 방어막",
    "RIFT BARRIER",
    "세 갈래 최정예 공세가 시작됩니다.",
    4,
    [
      [4, 8, 32, 8, 32, 35, 17, 53, 40, 72],
      [96, 8, 68, 8, 68, 35, 83, 53, 60, 72],
      [50, 4, 43, 26, 57, 53, 50, 77],
    ],
    "rift",
  ],
  [
    "최후의 신호",
    "THE LAST SIGNAL",
    "공허 군주를 격파하고 연결을 복구하세요.",
    4,
    [
      [4, 12, 23, 31, 19, 53, 37, 75],
      [96, 12, 77, 31, 81, 53, 63, 75],
      [50, 4, 39, 24, 61, 46, 50, 70],
    ],
    "citadel",
  ],
];
export function pathDistance(point, path) {
  let min = Infinity;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy),
      ),
    );
    min = Math.min(
      min,
      Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy),
    );
  }
  return min;
}
export function pointAt(path, distance) {
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i],
      length = Math.hypot(b.x - a.x, b.y - a.y);
    if (distance <= length) {
      const t = Math.max(0, distance / length);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    distance -= length;
  }
  return { ...path.at(-1) };
}
export const pathLength = (path) =>
  path
    .slice(1)
    .reduce(
      (sum, p, i) => sum + Math.hypot(p.x - path[i].x, p.y - path[i].y),
      0,
    );
export const STAGES = specs.map(
  ([name, en, brief, biome, routes, landmark], index) => {
    const paths = routes.map((route) => {
      const p = [];
      for (let i = 0; i < route.length; i += 2)
        p.push({ x: route[i] * 12.8, y: route[i + 1] * 7.2 });
      p.push({ x: 640, y: 650 });
      return p;
    });
    const candidates = [];
    for (let y = 140; y <= 560; y += 84)
      for (let x = 125; x < 1190; x += 103) {
        const p = { x: x + ((index % 3) - 1) * 12, y: y + (index % 2) * 8 };
        const d = Math.min(...paths.map((path) => pathDistance(p, path)));
        if (d >= 48 && d <= 155) candidates.push({ ...p, d });
      }
    // Prefer evenly spaced pads near intersections, then distribute through the field.
    candidates.sort(
      (a, b) =>
        ((a.x * 13 + a.y * 7 + index * 97) % 277) -
        ((b.x * 13 + b.y * 7 + index * 97) % 277),
    );
    const pads = [];
    for (const p of candidates) {
      if (pads.every((q) => Math.hypot(p.x - q.x, p.y - q.y) > 105))
        pads.push({ x: p.x, y: p.y, id: pads.length });
      if (pads.length === 14) break;
    }
    pads.sort((a, b) => a.y - b.y || a.x - b.x);
    pads.forEach((p, i) => (p.id = i));
    return {
      id: index + 1,
      name,
      en,
      brief,
      biome,
      landmark,
      paths,
      pads,
      core: { x: 640, y: 650 },
      hpScale: 1 + index * 0.115 + index * index * 0.0055,
      speedScale: 1 + index * 0.012,
      budget:
        480 +
        index * 48 +
        Math.max(0, index - 11) * 80 +
        (index === 19 ? 450 : 0),
      boss: (index + 1) % 4 === 0,
      seed: (index + 1) * 19283,
    };
  },
);
export function wavePlan(stage, wave) {
  const count = 9 + Math.floor(stage.id * 0.8) + wave * 3;
  const unlocked = Object.keys(ENEMIES).filter(
    (k) => !ENEMIES[k].boss && ENEMIES[k].unlock <= stage.id,
  );
  const plan = [];
  for (let i = 0; i < count; i++) {
    let kind =
      unlocked[
        (i + Math.floor(i / 4) * 2 + wave * 3 + stage.id) % unlocked.length
      ];
    if (i % 5 === 0) kind = "crawler";
    plan.push({
      kind,
      lane: (i + wave) % stage.paths.length,
      at: i * Math.max(0.34, 0.88 - stage.id * 0.018 - wave * 0.035),
    });
  }
  if (stage.boss && wave === 3)
    plan.push({
      kind: stage.id === 20 ? "sovereign" : "titan",
      lane: 1 % stage.paths.length,
      at: count * 0.55,
    });
  return plan.sort((a, b) => a.at - b.at);
}

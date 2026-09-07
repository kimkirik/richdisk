import { OrchestralAudio } from "./music.js?v=20260907-mobile-score";
import {
  PORTRAIT_QUERY,
  padPercent,
} from "./viewport.js?v=20260907-mobile-score";
import {
  STAGES,
  BIOMES,
  TOWERS,
  ENEMIES,
} from "./data.js?v=20260907-mobile-score";
import {
  createGame,
  advance,
  build,
  upgrade,
  sell,
  startWave,
  skill,
  setSpeed,
  towerStats,
  upgradeCost,
} from "./engine.js?v=20260907-mobile-score";
import {
  Renderer,
  paintMap,
  towerIcon,
} from "./renderer.js?v=20260907-mobile-score";
const $ = (s) => document.querySelector(s);
const STORAGE = "last-signal-campaign-v2";
let progress = { unlocked: 1, stars: {} },
  storageAvailable = true;
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE));
  if (saved && Number.isInteger(saved.unlocked))
    progress = {
      unlocked: Math.max(1, Math.min(20, saved.unlocked)),
      stars: saved.stars && typeof saved.stars === "object" ? saved.stars : {},
    };
} catch {
  storageAvailable = false;
}
let g = createGame(progress.unlocked),
  selected = null,
  kind = "gatling",
  deckPage = 0,
  hover = null,
  practice = false,
  seen = 0,
  uiTime = 0,
  bannerUntil = 0,
  modalPause = false,
  chosenStage = 1,
  sound = true;
const root = $("#root");
root.innerHTML = `
<main class="campaign-shell">
<header class="command-bar"><button class="wordmark" id="open-campaign" aria-label="스테이지 선택"><span class="brand-icon">LS</span><span>LAST SIGNAL<small>DEFENSE / CAMPAIGN</small></span></button><div class="resource-bar"><div class="resource core"><span>코어</span><b id="core">100</b><i><em id="core-meter"></em></i></div><div class="resource energy"><span>에너지</span><b id="energy">480</b></div><div class="resource stage-resource"><span>SECTOR</span><b id="stage-count">01<em>/20</em></b></div></div><div class="top-controls"><button id="sound" class="square" aria-label="음악과 효과음 끄기" title="오케스트라 음악과 효과음" aria-pressed="true">♪</button><button id="pause" class="square" aria-label="일시정지">Ⅱ</button></div></header>
<div class="operation-bar"><span><i class="online-dot"></i><b id="sector-name"></b><em id="practice-label"></em></span><div class="tempo"><span>SPEED</span><button data-speed="1" aria-label="1배속" aria-pressed="true">1×</button><button data-speed="2" aria-label="2배속" aria-pressed="false">2×</button><button data-speed="3" aria-label="3배속" aria-pressed="false">3×</button></div></div>
<section class="combat-layout"><aside class="intel-panel"><p class="eyebrow" id="biome-name"></p><h1 id="map-name"></h1><p id="brief"></p><div class="progress-heading"><span>공세</span><strong id="wave">0 / 3</strong></div><div class="wave-segments"><i></i><i></i><i></i></div><dl class="stats"><div><dt>격파</dt><dd id="kills">0</dd></div><div><dt>전장 적군</dt><dd id="enemies">0</dd></div><div><dt>점수</dt><dd id="score">0</dd></div></dl><div class="threat-info"><span>예상 위협</span><strong id="threats"></strong></div><button class="outline-action" id="maps-button">20개 작전 구역 <span>↗</span></button><div class="network-status"><i class="online-dot"></i>LAST SIGNAL NETWORK<br><small>연결을 유지하십시오.</small></div></aside>
<div class="arena"><div class="mobile-heading"><p class="eyebrow" id="mobile-biome"></p><h2 id="mobile-name"></h2><span id="mobile-brief"></span></div><div class="board"><canvas id="battle-canvas" aria-label="방어 전장"></canvas><div id="pads" aria-label="방어기 건설 지점"></div><div id="battle-banner" class="battle-banner" role="status" aria-live="polite"><span></span><strong></strong><small></small></div><div id="paused-overlay" class="paused-overlay" hidden><span>OPERATION PAUSED</span><strong>작전 일시정지</strong><button id="resume">계속하기 ▷</button></div></div><div class="mobile-stats"><div><span>공세</span><b id="mobile-wave"></b></div><div><span>격파</span><b id="mobile-kills"></b></div><div><span>적군</span><b id="mobile-enemies"></b></div><div><span>점수</span><b id="mobile-score"></b></div></div><div class="tactical-skills" aria-label="필살기"><button data-skill="airstrike"><i>✦</i><span>궤도 폭격<small>전 구역 타격</small></span><b></b></button><button data-skill="emp"><i>⌁</i><span>광역 EMP<small>4.5초 정지</small></span><b></b></button><button data-skill="repair"><i>✚</i><span>코어 복구<small>내구도 +30</small></span><b></b></button></div><p id="status" class="status-line" role="status"></p></div></section>
<footer class="armory"><div class="armory-heading"><span>DEFENSE SYSTEMS <b id="deck-count">01 — 04</b></span><div><button data-deck="0" aria-pressed="true">기본 Ⅰ</button><button data-deck="1" aria-pressed="false">특수 Ⅱ</button></div></div><div class="armory-body"><div class="tower-deck" aria-label="방어기 선택"></div><div class="deployment-controls"><div class="selection-info"><span id="selected-label">개틀링</span><small id="selected-desc"></small></div><button id="wave-button" class="primary-action">공세 1 시작 <span>▷</span></button><div id="tower-actions" hidden><button id="upgrade">강화</button><button id="sell">회수</button><button id="deselect" aria-label="타워 선택 해제">×</button></div></div></div></footer>
</main>
<dialog id="campaign-dialog" class="campaign-dialog"><header><div><span class="eyebrow">OPERATION ATLAS / 20 SECTORS</span><h2>마지막 신호를 향해</h2><p>5개 지역 · 20개 전장 · 구역마다 3차례 공세</p></div><button class="close-dialog" aria-label="스테이지 선택 닫기">×</button></header><div id="stage-grid" class="stage-grid"></div><footer class="stage-detail"><div><strong id="chosen-title"></strong><p id="chosen-description"></p></div><div class="stage-actions"><button id="practice-stage">연습 플레이</button><button id="enter-stage" class="primary-action">캠페인 출격 ▷</button></div><small>연습은 모든 맵에서 가능합니다. 캠페인 진행은 구역을 순서대로 방어하면 저장됩니다.</small></footer></dialog>
<dialog id="result-dialog" class="result-dialog"><div class="eyebrow" id="result-kicker"></div><h2 id="result-title"></h2><p id="result-detail"></p><div id="result-stars"></div><dl id="result-stats"></dl><button id="result-next" class="primary-action"></button><button id="result-maps" class="outline-action">스테이지 선택</button></dialog>`;
const renderer = new Renderer($("#battle-canvas"));
const music = new OrchestralAudio();
const portraitView = matchMedia(PORTRAIT_QUERY);
const landscapeControls = matchMedia(
  "(max-height: 540px) and (orientation: landscape)",
);
function syncMobileControls() {
  const skills = $(".tactical-skills");
  if (portraitView.matches || landscapeControls.matches)
    $(".armory-heading").append(skills);
  else $(".arena").insertBefore(skills, $("#status"));
}
syncMobileControls();
landscapeControls.addEventListener("change", syncMobileControls);
portraitView.addEventListener("change", () => {
  syncMobileControls();
  createPads();
  updateUI();
});
function text(selector, value) {
  const el = $(selector);
  if (el.textContent !== String(value)) el.textContent = value;
}
function announce(top, title, detail) {
  const el = $("#battle-banner");
  el.children[0].textContent = top;
  el.children[1].textContent = title;
  el.children[2].textContent = detail;
  el.classList.add("visible");
  bannerUntil = performance.now() + 2400;
}
function beep(type) {
  if (sound && !g.paused) music.effect(type);
}

function save() {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(progress));
  } catch {
    storageAvailable = false;
  }
}
function drawDeck() {
  const keys = Object.keys(TOWERS).slice(deckPage * 4, deckPage * 4 + 4);
  $(".tower-deck").innerHTML = keys
    .map((k) => {
      const t = TOWERS[k],
        locked = t.unlock > g.stage.id;
      return `<button class="tower-card ${k === kind ? "active" : ""}" data-tower="${k}" style="--weapon:${t.color}" aria-label="${t.name}${locked ? `, 스테이지 ${t.unlock} 해금` : `, 에너지 ${t.cost}`}" aria-pressed="${k === kind}" ${locked ? "disabled" : ""}>${t.atlas === undefined ? `<canvas class="tower-icon" data-icon="${k}"></canvas>` : `<span class="tower-icon atlas-tower atlas-${t.atlas}"></span>`}<span class="tower-name">${t.name}<small>${t.tag}</small></span><b>${locked ? `S${t.unlock} 해금` : `⚡ ${t.cost}`}</b></button>`;
    })
    .join("");
  document
    .querySelectorAll("[data-icon]")
    .forEach((c) => towerIcon(c, c.dataset.icon));
  document.querySelectorAll("[data-tower]").forEach(
    (btn) =>
      (btn.onclick = () => {
        kind = btn.dataset.tower;
        selected = null;
        drawDeck();
        updateUI();
      }),
  );
  text("#deck-count", deckPage ? "05 — 08" : "01 — 04");
  document
    .querySelectorAll("[data-deck]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.deck) === deckPage),
      ),
    );
}
function createPads() {
  const el = $("#pads");
  el.innerHTML = g.stage.pads
    .map(
      (p) =>
        `<button class="build-hit" data-pad="${p.id}" style="left:${padPercent(p, portraitView.matches).left}%;top:${padPercent(p, portraitView.matches).top}%" aria-label="${p.id + 1}번 건설 지점"></button>`,
    )
    .join("");
  el.querySelectorAll("button").forEach((button) => {
    const padId = Number(button.dataset.pad);
    button.onmouseenter = () => (hover = padId);
    button.onmouseleave = () => (hover = null);
    button.onclick = () => {
      if (g.paused) return;
      const tower = g.towers.find((t) => t.padId === padId);
      if (tower) selected = tower.id;
      else if (build(g, kind, padId)) selected = g.towers.at(-1).id;
      updateUI();
    };
  });
}
function updateUI() {
  music.setScene(g, document.hidden);
  const stage = g.stage,
    theme = BIOMES[stage.biome];
  document.documentElement.style.setProperty("--accent", theme.accent);
  text("#core", g.core);
  $("#core-meter").style.width = g.core + "%";
  text("#energy", g.energy);
  $("#stage-count").innerHTML =
    `${String(stage.id).padStart(2, "0")}<em>/20</em>`;
  text("#sector-name", `${String(stage.id).padStart(2, "0")} / ${stage.name}`);
  text("#practice-label", practice ? "연습" : "");
  text("#biome-name", theme.en);
  text("#map-name", stage.name);
  text("#brief", stage.brief);
  text("#mobile-biome", theme.en);
  text("#mobile-name", stage.name);
  text("#mobile-brief", stage.brief);
  text("#wave", `${g.wave} / 3`);
  text("#kills", g.kills);
  text("#enemies", g.enemies.length);
  text("#score", g.score.toLocaleString());
  text("#mobile-wave", `${g.wave}/3`);
  text("#mobile-kills", g.kills);
  text("#mobile-enemies", g.enemies.length);
  text("#mobile-score", g.score.toLocaleString());
  text(
    "#threats",
    stage.boss
      ? "지휘 개체 출현"
      : stage.id < 5
        ? "초기 침공"
        : stage.id < 13
          ? "특수 병력 혼성"
          : "최정예 혼성 병력",
  );
  text("#status", g.status);
  document
    .querySelectorAll(".wave-segments i")
    .forEach((el, i) =>
      el.classList.toggle("done", i < g.wave - (g.phase === "combat" ? 1 : 0)),
    );
  $("#pause").textContent = g.paused ? "▷" : "Ⅱ";
  $("#pause").setAttribute("aria-label", g.paused ? "계속하기" : "일시정지");
  $("#paused-overlay").hidden = !g.paused;
  $("#pause").disabled = ["victory", "defeat"].includes(g.phase);
  document
    .querySelectorAll("[data-speed]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.speed) === g.speed),
      ),
    );
  document.querySelectorAll("[data-skill]").forEach((b) => {
    const k = b.dataset.skill,
      cd = g.cooldowns[k];
    b.classList.toggle("cooling", cd > 0);
    b.querySelector("b").textContent = cd > 0 ? `${Math.ceil(cd)}초` : "준비";
    b.disabled =
      g.paused ||
      !["build", "combat"].includes(g.phase) ||
      cd > 0 ||
      (k === "repair" ? g.core >= 100 : !g.enemies.length);
    b.setAttribute(
      "aria-label",
      `${k === "emp" ? "광역 EMP" : k === "repair" ? "코어 복구" : "궤도 폭격"}, ${cd > 0 ? Math.ceil(cd) + "초" : "준비"}`,
    );
  });
  const tower = g.towers.find((t) => t.id === selected),
    def = tower ? towerStats(tower) : TOWERS[kind];
  text("#selected-label", `${def.name}${tower ? " Mk." + tower.level : ""}`);
  text(
    "#selected-desc",
    `${def.tag} · 사거리 ${Math.round(def.range)}${tower ? "" : ` · ${def.damage} 피해`}`,
  );
  $("#wave-button").hidden = !!tower;
  $("#tower-actions").hidden = !tower;
  $("#wave-button").disabled = g.paused || g.phase !== "build";
  $("#wave-button").innerHTML =
    g.phase === "combat"
      ? `공세 진행 중 <span>${g.enemies.length + g.plan.length - g.spawnIndex}기</span>`
      : `공세 ${g.wave + 1} 시작 <span>▷</span>`;
  if (tower) {
    text(
      "#upgrade",
      tower.level === 3 ? "최대 강화" : `강화 ⚡ ${upgradeCost(tower)}`,
    );
    $("#upgrade").disabled =
      g.paused || tower.level === 3 || g.energy < upgradeCost(tower);
    $("#sell").disabled = g.paused;
  }
  document.querySelectorAll("[data-pad]").forEach((button) => {
    const t = g.towers.find((t) => t.padId === Number(button.dataset.pad));
    button.disabled = g.paused || !["build", "combat"].includes(g.phase);
    button.setAttribute(
      "aria-label",
      t
        ? `${TOWERS[t.kind].name} Mk.${t.level} 선택`
        : `${Number(button.dataset.pad) + 1}번 건설 지점`,
    );
    button.classList.toggle("selected", !!t && t.id === selected);
  });
}
function enter(stageId, isPractice = false) {
  g = createGame(stageId);
  practice = isPractice;
  selected = null;
  kind = "gatling";
  deckPage = 0;
  hover = null;
  seen = 0;
  renderer.reset(g.stage);
  createPads();
  drawDeck();
  updateUI();
  announce(
    "SECTOR " + String(stageId).padStart(2, "0"),
    g.stage.name,
    "방어기를 선택하고 + 지점에 배치하세요",
  );
}
function openCampaign() {
  modalPause = g.paused;
  g.paused = true;
  chosenStage = g.stage.id;
  const grid = $("#stage-grid");
  grid.innerHTML = STAGES.map(
    (s) =>
      `<button class="stage-card ${s.id > progress.unlocked ? "locked" : ""}" data-stage="${s.id}" aria-label="스테이지 ${s.id}, ${s.name}${s.id > progress.unlocked ? ", 캠페인 잠김" : ""}" aria-pressed="${s.id === chosenStage}"><canvas width="320" height="180"></canvas><span class="stage-number">${String(s.id).padStart(2, "0")}</span><strong>${s.name}</strong><small>${BIOMES[s.biome].name} ${progress.stars[s.id] ? "· " + "★".repeat(progress.stars[s.id]) : s.id > progress.unlocked ? "· 잠김" : ""}</small></button>`,
  ).join("");
  grid.querySelectorAll("button").forEach((b) => {
    paintMap(b.querySelector("canvas"), STAGES[Number(b.dataset.stage) - 1]);
    b.onclick = () => {
      chosenStage = Number(b.dataset.stage);
      updateChosen();
    };
  });
  updateChosen();
  $("#campaign-dialog").showModal();
  updateUI();
}
function updateChosen() {
  const s = STAGES[chosenStage - 1];
  text("#chosen-title", `${String(s.id).padStart(2, "0")} / ${s.name}`);
  text(
    "#chosen-description",
    `${s.brief} · 초기 에너지 ${s.budget} · ${s.paths.length}개 진입로`,
  );
  $("#enter-stage").disabled = chosenStage > progress.unlocked;
  $("#enter-stage").textContent =
    chosenStage > progress.unlocked
      ? "이전 구역 방어 후 해금"
      : "캠페인 출격 ▷";
  document
    .querySelectorAll("[data-stage]")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.stage) === chosenStage),
      ),
    );
}
function showResult() {
  const victory = g.phase === "victory";
  const stars = g.core >= 90 ? 3 : g.core >= 60 ? 2 : 1;
  if (victory && !practice) {
    progress.unlocked = Math.min(
      20,
      Math.max(progress.unlocked, g.stage.id + 1),
    );
    progress.stars[g.stage.id] = Math.max(
      progress.stars[g.stage.id] || 0,
      stars,
    );
    save();
  }
  text("#result-kicker", victory ? "SECTOR SECURED" : "SIGNAL LOST");
  text(
    "#result-title",
    victory
      ? g.stage.id === 20
        ? "마지막 신호, 복구 완료"
        : "구역 방어 성공"
      : "방어선 붕괴",
  );
  text(
    "#result-detail",
    practice
      ? "연습 플레이 · 캠페인 진행에 반영되지 않습니다."
      : !storageAvailable
        ? "브라우저 저장이 제한되어 이번 진행은 저장하지 못했습니다."
        : victory
          ? "다음 구역으로 연결할 준비가 되었습니다."
          : "배치를 바꿔 다시 도전하세요.",
  );
  text(
    "#result-stars",
    victory ? "★".repeat(stars) + "☆".repeat(3 - stars) : "",
  );
  $("#result-stats").innerHTML =
    `<div><dt>코어</dt><dd>${g.core}</dd></div><div><dt>격파</dt><dd>${g.kills}</dd></div><div><dt>점수</dt><dd>${g.score.toLocaleString()}</dd></div>`;
  text(
    "#result-next",
    victory && g.stage.id < 20 ? "다음 스테이지 ▷" : "다시 도전 ▷",
  );
  $("#result-dialog").showModal();
}
$("#open-campaign").onclick = $("#maps-button").onclick = openCampaign;
$(".close-dialog").onclick = () => $("#campaign-dialog").close();
$("#campaign-dialog").addEventListener("close", () => {
  g.paused = modalPause;
  updateUI();
  if (["victory", "defeat"].includes(g.phase) && !$("#result-dialog").open)
    showResult();
});
$("#enter-stage").onclick = () => {
  if (chosenStage > progress.unlocked) return;
  modalPause = false;
  $("#campaign-dialog").close();
  enter(chosenStage, false);
};
$("#practice-stage").onclick = () => {
  modalPause = false;
  $("#campaign-dialog").close();
  enter(chosenStage, true);
};
$("#pause").onclick = () => {
  g.paused = !g.paused;
  updateUI();
};
$("#resume").onclick = () => {
  g.paused = false;
  updateUI();
};
document.querySelectorAll("[data-speed]").forEach(
  (b) =>
    (b.onclick = () => {
      setSpeed(g, Number(b.dataset.speed));
      updateUI();
    }),
);
document.querySelectorAll("[data-deck]").forEach(
  (b) =>
    (b.onclick = () => {
      deckPage = Number(b.dataset.deck);
      drawDeck();
    }),
);
document.querySelectorAll("[data-skill]").forEach(
  (b) =>
    (b.onclick = () => {
      skill(g, b.dataset.skill);
      updateUI();
    }),
);
$("#wave-button").onclick = () => {
  startWave(g);
  updateUI();
};
$("#upgrade").onclick = () => {
  upgrade(g, selected);
  updateUI();
};
$("#sell").onclick = () => {
  sell(g, selected);
  selected = null;
  updateUI();
};
$("#deselect").onclick = () => {
  selected = null;
  updateUI();
};
function updateSoundButton() {
  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").setAttribute(
    "aria-label",
    sound ? "음악과 효과음 끄기" : "음악과 효과음 켜기",
  );
  $("#sound").textContent = sound ? "♪" : "♩";
  $("#sound").title = sound
    ? music.ready
      ? "오케스트라 음악 재생"
      : "터치하면 오케스트라 음악 재생"
    : "음악과 효과음 꺼짐";
}
function audioError() {
  sound = false;
  music.setEnabled(false);
  updateSoundButton();
  $("#sound").title = "음악을 다시 불러오려면 누르세요";
}
$("#sound").onclick = () => {
  sound = !sound;
  music.setEnabled(sound).catch(audioError);
  updateSoundButton();
};
// Browser audio starts on the first deliberate interaction, never before it.
document.addEventListener(
  "pointerdown",
  (event) => {
    if (sound && !event.target.closest("#sound"))
      music.unlock().then(updateSoundButton).catch(audioError);
  },
  { capture: true },
);
document.addEventListener("keydown", () => {
  if (sound) music.unlock().then(updateSoundButton).catch(audioError);
});

$("#result-next").onclick = () => {
  const next =
    g.phase === "victory" && g.stage.id < 20 ? g.stage.id + 1 : g.stage.id;
  $("#result-dialog").close();
  enter(next, practice);
};
$("#result-maps").onclick = () => {
  $("#result-dialog").close();
  openCampaign();
};
$("#result-dialog").addEventListener("cancel", (event) =>
  event.preventDefault(),
);
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  if (e.code === "Space" && e.target === document.body) {
    e.preventDefault();
    g.paused = !g.paused;
    updateUI();
  }
  if (["1", "2", "3"].includes(e.key)) {
    setSpeed(g, Number(e.key));
    updateUI();
  }
  if (e.key === "Escape") {
    selected = null;
    updateUI();
  }
});
document.addEventListener("visibilitychange", () => {
  music.setScene(g, document.hidden);
  if (document.hidden && ["build", "combat"].includes(g.phase)) {
    g.paused = true;
    g.accumulator = 0;
    updateUI();
  }
});
let last = performance.now();
function frame(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (!document.hidden) {
    advance(g, dt);
    for (const event of g.events.filter((e) => e.id > seen)) {
      seen = event.id;
      beep(event.type);
      if (event.type === "wave")
        announce(
          `SECTOR ${String(g.stage.id).padStart(2, "0")}`,
          `WAVE ${event.wave} / 3`,
          "적군 진입 · 방어망 가동",
        );
      if (event.type === "boss")
        announce(
          "CRITICAL THREAT",
          event.name,
          "지휘 개체 접근 · 모든 화력을 집중하세요",
        );
      if (event.type === "emp")
        announce("TACTICAL SYSTEM", "EMP DISCHARGED", "적 이동 차단 · 4.5초");
      if (event.type === "airstrike")
        announce(
          "ORBITAL SUPPORT",
          "궤도 폭격 승인",
          "전 구역에 타격을 가합니다",
        );
      if (event.type === "clear")
        announce(
          "WAVE COMPLETE",
          "공세 방어 성공",
          "보급 도착 · 다음 공세를 준비하세요",
        );
      if (["victory", "defeat"].includes(event.type)) showResult();
    }
    renderer.draw(g, selected, hover, dt);
    if (now - uiTime > 100) {
      updateUI();
      uiTime = now;
    }
    if (now > bannerUntil) $("#battle-banner").classList.remove("visible");
  }
  requestAnimationFrame(frame);
}
enter(g.stage.id);
requestAnimationFrame(frame);

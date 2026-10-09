//#region public/sea-level/core.mjs
const SCENARIOS = {
	ssp126: "저배출 · SSP1-2.6",
	ssp245: "중간 · SSP2-4.5",
	ssp370: "고배출 · SSP3-7.0"
};
const EXPERIMENTS = {
	thwaites: {
		label: "스웨이츠 빙하",
		metres: .65
	},
	westAntarctic: {
		label: "서남극 전체",
		metres: 3.3
	},
	allIce: {
		label: "모든 육상빙하",
		metres: 70
	}
};
function projectionRange(data, scenario) {
	if (!Object.hasOwn(SCENARIOS, scenario)) throw Error("Unknown scenario");
	const years = data?.scenarios?.[scenario]?.year;
	if (!Array.isArray(years) || years.length < 2 || !years.every((y, i) => Number.isInteger(y) && y % 5 === 0 && (!i || y > years[i - 1]))) throw Error("Invalid projection years");
	const min = Math.max(2030, years[0]), max = years.at(-1);
	if (max < min) throw Error("Missing future projection");
	return {
		min,
		max
	};
}
function projectionAt(data, scenario, year) {
	const { min, max } = projectionRange(data, scenario);
	if (!Number.isInteger(year) || year < min || year > max || year % 5) throw Error("Invalid sea level selection");
	const row = data.scenarios[scenario], years = row.year;
	const hi = years.findIndex((y) => y >= year), lo = years[hi] === year ? hi : hi - 1;
	if (hi < 0 || lo < 0) throw Error("Missing projection anchor");
	const fraction = hi === lo ? 0 : (year - years[lo]) / (years[hi] - years[lo]);
	const value = (key) => row[key][lo] + (row[key][hi] - row[key][lo]) * fraction;
	return {
		median: value("height_50"),
		upper: value("height_83"),
		lower: value("height_17"),
		interpolated: lo !== hi,
		anchors: [years[lo], years[hi]]
	};
}
function selectedLevels(data, scenario, year, experiment) {
	if (experiment) {
		if (!Object.hasOwn(EXPERIMENTS, experiment)) throw Error("Unknown experiment");
		return {
			median: EXPERIMENTS[experiment].metres,
			upper: EXPERIMENTS[experiment].metres,
			experiment
		};
	}
	return projectionAt(data, scenario, year);
}
//#endregion
//#region lib/sea-level-ui.js
const SEA_LEVEL_CSS = `
.seaMode{scroll-margin-top:125px}.seaLevelHead{position:sticky;top:-12px;background:#091f30;z-index:2;padding:4px 0 8px}
.seaLevelPanel[hidden]{display:none!important}.seaMode{display:flex;flex-direction:column;min-height:0!important}.seaMode .mapCanvas{position:relative;inset:auto;flex:1;min-height:280px}.seaMode .timeline{display:none}.seaLevelPanel{flex:none;padding:12px 16px;background:#091f30;border-top:1px solid #458aa5;max-height:min(38dvh,340px);overflow:auto;overscroll-behavior:contain;color:#ecf8ff;font-size:.875rem;line-height:1.6}.seaLevelPanel *{box-sizing:border-box}.seaLevelHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.seaLevelHead h2{font-size:1rem;margin:0}.seaLevelHead small{color:#a8cddd}.seaLevelPanel button{min-height:44px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;padding:8px 11px;font:inherit;cursor:pointer}.seaLevelPanel button[aria-pressed="true"]{border-color:#78d7ff;background:#175d85;color:#fff;box-shadow:inset 0 0 0 1px #78d7ff}.seaLevelPanel button:focus-visible,.seaLevelPanel input:focus-visible,.seaLevelPanel summary:focus-visible{outline:3px solid #a3e8ff;outline-offset:2px}.seaLevelGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.85fr);gap:12px 24px;margin-top:8px}.seaLevelPanel fieldset{border:0;margin:0;padding:0;min-width:0}.seaLevelPanel legend{font-weight:700;margin-bottom:5px}.seaLevelScenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.seaLevelScenarios button{padding:6px 4px;font-size:.875rem}.seaLevelScenarios small{display:block;font-size:.75rem;color:#b8d5e3}.seaLevelYearHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px}.seaLevelYearHead output{font-size:1.375rem;font-weight:800;color:#94ddff}.seaLevelPanel input[type="range"]{width:100%;height:36px;accent-color:#65cfff;cursor:pointer}.seaLevelTicks{display:flex;justify-content:space-between;color:#a8cddd;font-size:.75rem}.seaLevelMetrics{display:flex;gap:24px}.seaLevelMetrics span{display:block;color:#b4d3e0;font-size:.75rem}.seaLevelMetrics strong{font-size:1.65rem;letter-spacing:-.02em}.seaLevelKey{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:.8125rem}.seaLevelSwatch{display:inline-block;width:18px;height:13px;border-radius:3px;background:#1255d9;flex:none;border:1px solid #ceeaff}.seaLevelSwatch.light{background:#6bcbff}.seaLevelNote{color:#c2d8e2;font-size:.8125rem;margin:8px 0 0}.seaLevelNote strong{color:#f2cf8d}.seaLevelActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.seaLevelStatus{font-size:.8125rem;color:#a6dded;margin:8px 0 0}.seaLevelDetails{margin-top:9px;border-top:1px solid #2f5266;padding-top:7px}.seaLevelDetails summary{min-height:36px;cursor:pointer;font-weight:700}.seaLevelDetails p{margin:6px 0}.seaLevelPanel a{color:#8ae3ff}.seaLevelTiles{image-rendering:pixelated}.seaLevelPanel [hidden]{display:none!important}
.seaLevelYearSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:6px}.seaLevelYearSteps button{padding:6px 3px;font-weight:700;line-height:1.25}.seaLevelYearSteps button{white-space:nowrap}.seaLevelTicks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-items:center}.seaLevelTicks>span:nth-child(2){text-align:center}.seaLevelTicks button{justify-self:end;min-height:44px;padding:4px 8px;line-height:1.2}.seaLevelTicks small{display:block;font-size:.75rem}.seaLevelYearSteps button:disabled{opacity:.4;cursor:default}.seaLevelYearControls{padding-bottom:10px;border-bottom:1px solid #2f5266}.seaLevelYearHead label{font-weight:700}.seaLevelYearHead output{white-space:nowrap}.seaLevelYearHead small{display:block;color:#92e9df;font-size:.8125rem;font-weight:600;line-height:1.5}.seaLevelTicks #seaLevelChangesOnly{justify-self:center}.seaLevelPanel button:disabled{opacity:.45;cursor:default}.seaChangesOnly .satelliteTiles,.seaChangesOnly .streetTiles{filter:brightness(.55) saturate(.4)}.seaChangesOnly .seaLevelSwatch:not(.light){background:#00f5dc}
@media(min-width:901px) and (min-height:600px){.seaMode .mapCanvas{height:auto;min-height:180px}.seaMode{height:100%}.seaLevelPanel{max-height:min(48dvh,380px)}}
@media(max-width:900px),(max-height:599px) and (orientation:landscape){.seaMode .mapCanvas{flex:none;height:clamp(160px,calc(100svh - 410px),360px);min-height:160px}.seaLevelPanel{padding:12px;max-height:340px}.seaLevelGrid{grid-template-columns:1fr;gap:12px}.seaLevelScenarios button{font-size:.875rem}.seaLevelHead h2{font-size:1rem}}
`;
const SEA_LEVEL_HTML = `
<section id="seaLevelPanel" class="seaLevelPanel" aria-labelledby="seaLevelTitle" hidden>
  <div class="seaLevelHead"><div><h2 id="seaLevelTitle">🌊 잠재 침수 시뮬레이션</h2><small id="seaLevelMode">미래 해수면</small></div><button id="seaLevelClose" type="button" aria-label="미래 해수면 닫기">닫기 ×</button></div>
  <button type="button" id="seaLevelBack" hidden>연도별 시나리오로 돌아가기</button>
  <div id="seaLevelYearControls" class="seaLevelYearControls"><div class="seaLevelYearHead"><div><label for="seaLevelYear">살펴볼 연도 · 5년 간격</label><small id="seaLevelStepChange">시작 연도 · 5년 단위로 비교</small></div><output id="seaLevelYearValue" for="seaLevelYear" aria-live="polite">2030년</output></div><input id="seaLevelYear" type="range" min="2030" max="2150" step="5" value="2030" aria-valuetext="2030년"><div class="seaLevelTicks"><span id="seaLevelYearMin">2030</span><button id="seaLevelChangesOnly" type="button" aria-pressed="false" disabled>5년 변화만</button><button type="button" id="seaLevelYearEnd" aria-label="마지막 예측 연도 2150년으로 이동">최대<small id="seaLevelYearEndValue">2150년</small></button></div><div class="seaLevelYearSteps" role="group" aria-label="선택 연도에서 앞으로 이동"><button type="button" data-sea-year-step="5" aria-label="5년 이후">+5년</button><button type="button" data-sea-year-step="10" aria-label="10년 이후">+10년</button><button type="button" data-sea-year-step="50" aria-label="50년 이후">+50년</button><button type="button" data-sea-year-step="100" aria-label="100년 이후">+100년</button></div></div>
  <p id="seaLevelStatus" class="seaLevelStatus" role="status" aria-live="polite"></p><button id="seaLevelRetry" type="button" hidden>고도 자료 다시 확인</button>
  <button id="seaLevelFocusChange" type="button" hidden>새 영역 확대</button>
  <p id="seaLevelYearRange" class="seaLevelNote">NASA/IPCC 자료 · 2030~2150년. +버튼은 선택한 연도에서 이동합니다.</p>
  <div class="seaLevelActions" aria-label="해안 예시로 이동"><button type="button" data-sea-place="37.46,126.59">인천 해안</button><button type="button" data-sea-place="51.95,4.22">네덜란드 해안</button><button type="button" data-sea-place="25.78,-80.16">마이애미 해안</button></div>
  <div id="seaLevelLoadRecovery" class="seaLevelActions" hidden><button id="seaLevelLoadRetry" type="button">해수면 다시 불러오기</button><button id="seaLevelReload" type="button">최신 화면으로 새로고침</button></div>
  <button id="seaLevelZoom" type="button" hidden>현재 지도 확대</button>
  <p id="seaLevelLocationNote" class="seaLevelNote" hidden>세계 보기에서 인천 해안 예시로 확대했습니다. 다른 곳은 해안 버튼이나 지도 검색으로 이동하세요.</p>

  <div class="seaLevelGrid">
    <fieldset id="seaLevelScenarioControls"><legend>배출 시나리오</legend><div class="seaLevelScenarios"><button type="button" data-sea-scenario="ssp126" aria-pressed="false">저배출<small>SSP1-2.6</small></button><button type="button" data-sea-scenario="ssp245" aria-pressed="true">중간<small>SSP2-4.5</small></button><button type="button" data-sea-scenario="ssp370" aria-pressed="false">고배출<small>SSP3-7.0</small></button></div></fieldset>
    <div><div class="seaLevelMetrics" aria-live="polite" aria-atomic="true"><div><span id="seaLevelMedianLabel">중간값 · 50백분위</span><strong id="seaLevelMedian">—</strong></div><div id="seaLevelUpperMetric"><span>예상 범위 상단 · 83백분위</span><strong id="seaLevelUpper">—</strong></div></div><div class="seaLevelKey"><i class="seaLevelSwatch" aria-hidden="true"></i><span id="seaLevelDarkLegend">진한 파랑: 중간값 기준 잠재 침수 지역</span></div><div class="seaLevelKey" id="seaLevelUpperLegend"><i class="seaLevelSwatch light" aria-hidden="true"></i><span>옅은 파랑: 예상 범위 상단에서 추가되는 위험 지역</span></div><p id="seaLevelBasis" class="seaLevelNote">IPCC 기준값을 확인하고 있습니다.</p></div>
  </div>
  <div id="seaLevelComparison" class="seaLevelComparison"><p id="seaLevelChange" class="seaLevelNote" aria-live="polite"></p><div class="seaLevelActions"><button id="seaLevelCompare" type="button" aria-pressed="false">2030년 지도와 비교</button><button id="seaLevelHighlight" type="button" aria-pressed="true">추가 영역 강조 켜짐</button></div><p class="seaLevelNote" id="seaLevelAddedLegend"><span style="color:#00f5dc">● 청록</span>: 2030년 중간값에 비해 새로 추가된 영역</p></div>
  <p class="seaLevelNote"><strong>확정 침수 예측이 아닙니다.</strong> 전 지구 평균 수위와 지형고도를 비교한 간이 표시입니다. 방파제·조수·태풍·지반침하·해수 연결성·지역별 해수면 차이·고도 기준 및 지형 오차를 반영하지 못합니다.</p>
  <p class="seaLevelNote">5년간 수위가 몇 cm만 높아지는 구간도 있어, 같은 땅이 계속 표시될 수 있습니다. ‘5년 변화만’은 직전 5년의 예상 범위 상단 밖에 있다가 새로 파랗게 표시되는 격자만 보여 줍니다. 중간값 영역의 색만 달라진 곳은 포함하지 않습니다. 색칠은 지형고도가 수위 기준을 넘을 때 달라집니다. 해수면보다 낮은 땅은 시작 연도부터 표시되며, 매 단계마다 면적이 늘어나는 것은 아닙니다.</p>
  <details class="seaLevelDetails"><summary>별도 가상실험 · 빙하가 모두 녹는다면</summary><p class="seaLevelNote">선택한 연도의 예측이 아닙니다. 각 수위를 따로 적용하며 서로 합산하지 않습니다.</p><div class="seaLevelActions"><button type="button" data-sea-experiment="thwaites" aria-pressed="false">스웨이츠 빙하 +0.65m</button><button type="button" data-sea-experiment="westAntarctic" aria-pressed="false">서남극 전체 +3.3m</button><button type="button" data-sea-experiment="allIce" aria-pressed="false">모든 육상빙하 +70m</button></div><p class="seaLevelNote">+70m는 남극·그린란드 빙상을 포함한 육상 얼음 전체의 대략적인 해수면 환산량을 가정한 실험입니다.</p></details>
  <details class="seaLevelDetails"><summary>자료 출처와 계산 한계</summary><p>해수면: <a href="https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool/" target="_blank" rel="noopener">NASA IPCC AR6 자료</a> · 전 지구 평균, 중간 신뢰도, 1995–2014 평균 대비. 중간값은 50백분위, 예상 범위는 17~83백분위입니다. 상단은 가능한 최대값이나 지역별 침수 확률이 아닙니다. 2030~2150년의 10년 간격 원자료 사이를 선형 보간합니다.</p><p>고도: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS 공개 Mapzen Terrain Tiles</a>. 바다 제외: <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/" target="_blank" rel="noopener">Natural Earth 육지 경계</a>(1:1,000만 개략 지도이며 10m 해상도가 아닙니다). 해안선과 고도 자료의 시점·기준이 달라 간척지, 작은 섬, 연안과 호수 주변은 빠지거나 잘못 표시될 수 있습니다.</p><p>수위 이하의 육지를 선별할 뿐 바닷물이 실제 유입되는 경로를 계산하지 않습니다. 해수면보다 낮지만 제방으로 보호되는 땅이나 내륙 저지대도 색칠될 수 있습니다. 색칠되지 않았다고 안전하다는 뜻은 아닙니다. 자료 정밀도는 지역마다 다르며 소수점 수위 표시와 지도 확대가 지형 오차를 줄여 주지는 않습니다. 고도 기준면을 기준기간의 현지 평균 해수면에 맞추는 보정도 적용하지 않았습니다.</p><p>가상실험 근거: <a href="https://www.bas.ac.uk/news/grim-outlook-for-antarcticas-thwaites-glacier/" target="_blank" rel="noopener">British Antarctic Survey · 스웨이츠·서남극</a> · <a href="https://sealevel.jpl.nasa.gov/news/1302/whats-up-with-sea-level/" target="_blank" rel="noopener">NASA JPL · 육상 얼음</a>. 이 지도는 도시계획·대피 판단용 정밀 침수해석을 대신하지 않습니다.</p><p>자료 확인: 2026-09-08 · API 키와 유료 가입 없이 제공되는 공개 자료 사용.</p></details>
</section>
`;
//#endregion
//#region lib/sea-level-map.js
function prepareSeaLevelPanel(document) {
	const panel = document.getElementById("seaLevelPanel");
	if (!panel) throw Error("해수면 화면이 오래되었습니다. 새로고침 후 다시 열어 주세요.");
	panel.innerHTML = SEA_LEVEL_HTML.slice(SEA_LEVEL_HTML.indexOf(">", SEA_LEVEL_HTML.indexOf("<section")) + 1, SEA_LEVEL_HTML.lastIndexOf("</section>"));
	let style = document.getElementById("seaLevelClientStyle");
	if (!style) {
		style = document.createElement("style");
		style.id = "seaLevelClientStyle";
		document.head.append(style);
	}
	style.textContent = SEA_LEVEL_CSS;
	return panel;
}
function mountSeaLevel(map, L) {
	const el = (id) => document.getElementById(id), panel = prepareSeaLevelPanel(document), section = panel.closest(".mapSection");
	const button = el("seaLevelMapToggle"), records = /* @__PURE__ */ new Map();
	let enabled = false, revision = 0, timer, worker, data, dataPromise, year = 2030, scenario = "ssp245", experiment = "", levels;
	let yearRange = {
		min: 2030,
		max: 2150
	};
	let compareBaseline = false, highlightAdded = true, changesOnly = false;
	const number = (value) => value.toLocaleString("ko-KR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	if (!map.getPane("seaLevelPane")) map.createPane("seaLevelPane");
	map.getPane("seaLevelPane").style.zIndex = "405";
	map.getPane("seaLevelPane").style.pointerEvents = "none";
	const layer = new (L.GridLayer.extend({ createTile(coords, done) {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 256;
		canvas.setAttribute("aria-hidden", "true");
		const key = `${coords.z}/${coords.x}/${coords.y}`;
		const record = {
			canvas,
			coords: {
				x: coords.x,
				y: coords.y,
				z: coords.z
			},
			done,
			finished: false,
			revision: -1,
			dark: 0,
			light: 0,
			stepAdded: 0,
			stepPixel: -1,
			error: false
		};
		canvas.seaRecord = record;
		record.key = key;
		if (!records.has(key)) records.set(key, /* @__PURE__ */ new Set());
		records.get(key).add(record);
		schedule();
		return canvas;
	} }))({
		pane: "seaLevelPane",
		tileSize: 256,
		minZoom: 6,
		maxZoom: 19,
		maxNativeZoom: 13,
		updateWhenIdle: true,
		updateWhenZooming: false,
		keepBuffer: 0,
		className: "seaLevelTiles",
		attribution: "<a href=\"https://registry.opendata.aws/terrain-tiles/\" target=\"_blank\" rel=\"noopener\">Mapzen terrain</a> · Natural Earth · IPCC/NASA"
	});
	layer.on("tileunload", (e) => {
		const record = e.tile.seaRecord;
		if (!record) return;
		const set = records.get(record.key);
		set?.delete(record);
		if (!set?.size) records.delete(record.key);
		schedule();
	});
	function updateStatus() {
		if (!enabled) return;
		el("seaLevelFocusChange").hidden = !changesOnly;
		el("seaLevelFocusChange").disabled = true;
		el("seaLevelZoom").hidden = map.getZoom() >= 13;
		if (!data) {
			el("seaLevelStatus").textContent = "IPCC 기준값을 불러오는 중입니다.";
			return;
		}
		if (map.getZoom() < 6) {
			el("seaLevelStatus").textContent = "현재 지도가 너무 넓어 침수 지형이 숨겨져 있습니다. 아래에서 해안을 선택하거나 현재 지도를 확대하세요.";
			el("seaLevelRetry").hidden = true;
			return;
		}
		const all = [...records.values()].map((set) => [...set][0]);
		const errors = all.filter((r) => r.error).length, pending = all.filter((r) => r.revision !== revision && !r.error).length;
		const count = all.filter((r) => r.revision === revision).reduce((sum, r) => sum + r.dark + r.light, 0);
		el("seaLevelStatus").textContent = errors ? "일부 고도를 불러오지 못했습니다. 다시 확인해 주세요." : pending || !all.length ? "침수 지형을 불러오는 중입니다…" : count ? "침수 지형 표시 완료" : "현재 화면에서 수위 이하의 육지를 찾지 못했습니다. 안전 판정이 아닙니다.";
		if (!errors && !pending && all.length && !experiment && !compareBaseline) {
			const stepAdded = all.reduce((sum, r) => sum + (r.stepAdded || 0), 0);
			if (year > yearRange.min) {
				el("seaLevelStatus").textContent = `${year - 5}→${year}년 갱신 완료 · ` + (stepAdded ? changesOnly ? "청록색이 지난 5년 새로 추가된 영역입니다. 작게 보이면 확대하세요." : "새로 추가된 파란 영역이 있습니다. ‘5년 변화만’으로 비교해 보세요." : "이 지형 범위에서 지난 5년 새로 색칠되는 격자는 없습니다.");
				el("seaLevelFocusChange").disabled = !stepAdded;
			} else el("seaLevelStatus").textContent += " · 시작 연도";
		}
		el("seaLevelRetry").hidden = !errors;
	}
	function ensureWorker() {
		if (worker) return;
		if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) throw Error("이 브라우저는 지형 계산을 지원하지 않습니다. 최신 Safari 또는 Chrome에서 열어 주세요.");
		worker = new Worker("/richdisk/earthquake-radar/sea-level/terrain-e5f743577774cedc.mjs", { type: "module" });
		worker.onmessage = ({ data: response }) => {
			if (!enabled) return;
			const set = records.get(response.key);
			if (!set) return;
			if (response.type === "tile" && response.revision !== revision) return;
			for (const r of set) {
				if (response.type === "tile") {
					r.canvas.getContext("2d").putImageData(new ImageData(response.pixels, 256, 256), 0, 0);
					r.revision = revision;
					r.dark = response.dark;
					r.light = response.light;
					r.added = response.added;
					r.stepAdded = response.stepAdded || 0;
					r.stepPixel = response.stepPixel ?? -1;
					r.error = false;
				} else {
					r.error = true;
					r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
				}
				if (!r.finished) {
					r.finished = true;
					r.done(null, r.canvas);
				}
			}
			updateStatus();
		};
		worker.onerror = () => {
			worker?.terminate();
			worker = null;
			for (const set of records.values()) for (const r of set) {
				r.error = true;
				r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
				if (!r.finished) {
					r.finished = true;
					r.done(null, r.canvas);
				}
			}
			updateStatus();
		};
	}
	function schedule() {
		clearTimeout(timer);
		if (!enabled || !data) return;
		timer = setTimeout(() => {
			if (!enabled) return;
			try {
				ensureWorker();
				const tiles = [...records.values()].filter((set) => [...set].some((r) => r.revision !== revision && !r.error)).map((set) => [...set][0].coords);
				worker.postMessage({
					type: "render",
					tiles,
					levels: {
						...levels,
						revision
					}
				});
				updateStatus();
			} catch (error) {
				el("seaLevelStatus").textContent = error.message;
				el("seaLevelRetry").hidden = false;
			}
		}, 90);
	}
	function updateSelection() {
		if (data) yearRange = projectionRange(data, scenario);
		year = Math.min(yearRange.max, Math.max(yearRange.min, year));
		el("seaLevelYear").min = String(yearRange.min);
		el("seaLevelYear").max = String(yearRange.max);
		el("seaLevelYear").value = String(year);
		el("seaLevelYearValue").textContent = `${year}년`;
		el("seaLevelYear").setAttribute("aria-valuetext", `${year}년`);
		panel.querySelectorAll("[data-sea-year-step]").forEach((b) => {
			b.disabled = year + Number(b.dataset.seaYearStep) > yearRange.max;
		});
		el("seaLevelYearEnd").disabled = year === yearRange.max;
		el("seaLevelYearEnd").setAttribute("aria-label", `마지막 예측 연도 ${yearRange.max}년으로 이동`);
		el("seaLevelYearEndValue").textContent = `${yearRange.max}년`;
		el("seaLevelYearMin").textContent = String(yearRange.min);
		if (year === yearRange.min || experiment || compareBaseline) changesOnly = false;
		el("seaLevelChangesOnly").disabled = year === yearRange.min;
		el("seaLevelChangesOnly").setAttribute("aria-pressed", String(changesOnly));
		section.classList.toggle("seaChangesOnly", enabled && changesOnly);
		el("seaLevelYearRange").textContent = `NASA/IPCC 자료 · ${yearRange.min}~${yearRange.max}년. +버튼은 선택한 연도에서 이동합니다. 범위를 넘는 버튼은 비활성화됩니다.`;
		panel.querySelectorAll("[data-sea-scenario]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaScenario === scenario)));
		panel.querySelectorAll("[data-sea-experiment]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaExperiment === experiment)));
		el("seaLevelScenarioControls").disabled = Boolean(experiment);
		el("seaLevelYearControls").hidden = Boolean(experiment);
		el("seaLevelYearRange").hidden = Boolean(experiment);
		el("seaLevelBack").hidden = !experiment;
		el("seaLevelUpperLegend").hidden = Boolean(experiment) || changesOnly;
		el("seaLevelComparison").hidden = Boolean(experiment);
		el("seaLevelCompare").setAttribute("aria-pressed", String(compareBaseline));
		el("seaLevelCompare").textContent = compareBaseline ? `${year}년 지도로 돌아가기` : "2030년 지도와 비교";
		el("seaLevelHighlight").setAttribute("aria-pressed", String(highlightAdded));
		el("seaLevelHighlight").textContent = highlightAdded ? "추가 영역 강조 켜짐" : "추가 영역 강조 꺼짐";
		el("seaLevelAddedLegend").hidden = changesOnly || !highlightAdded || compareBaseline;
		if (!data) return;
		levels = selectedLevels(data, scenario, compareBaseline && !experiment ? 2030 : year, experiment);
		if (!experiment) {
			const baseline = projectionAt(data, scenario, 2030), selected = projectionAt(data, scenario, year), previous = projectionAt(data, scenario, Math.max(2030, year - 5));
			levels = {
				...levels,
				baselineMedian: baseline.median,
				highlightAdded: highlightAdded && !compareBaseline,
				previousUpper: previous.upper,
				changesOnly
			};
			el("seaLevelChange").textContent = `${year}년 중간값은 2030년보다 +${number((selected.median - baseline.median) * 100)}cm${year > 2030 ? ` · 직전 5년보다 +${number((selected.median - previous.median) * 100)}cm` : ""}.`;
			el("seaLevelStepChange").textContent = year > yearRange.min ? `지난 5년 수위 +${number((selected.median - previous.median) * 100)}cm` : "시작 연도 · 5년 단위로 비교";
		}
		el("seaLevelMedian").textContent = `+${number(levels.median)}m`;
		el("seaLevelUpper").textContent = `+${number(levels.upper)}m`;
		el("seaLevelUpperMetric").hidden = Boolean(experiment);
		el("seaLevelMedianLabel").textContent = experiment ? "가상 수위" : "중간값 · 50백분위";
		el("seaLevelMode").textContent = experiment ? `가상실험 · ${EXPERIMENTS[experiment].label}` : compareBaseline ? `지금 지도: 2030년 비교 기준 · ${SCENARIOS[scenario]}` : changesOnly ? `5년 변화만: ${year - 5}→${year}년 · ${SCENARIOS[scenario]}` : `지금 지도: ${year}년 · ${SCENARIOS[scenario]}`;
		el("seaLevelBasis").textContent = experiment ? "발생 연도·발생 가능성을 정하지 않은 독립 실험입니다. 연도별 시나리오에 더하지 않으며, 빙하 실험끼리도 합산하지 않습니다." : `1995–2014 평균 대비 전 지구 평균 해수면 상승량. 지역별 상대 해수면은 다를 수 있습니다. ${levels.interpolated ? `${levels.anchors[0]}·${levels.anchors[1]}년 IPCC 기준값 사이를 선형 보간한 추정치입니다.` : "이 연도는 NASA가 제공하는 IPCC 기준값입니다. 5년 사이 값은 기준연도 사이를 보간합니다."}`;
		el("seaLevelDarkLegend").textContent = experiment ? "진한 파랑: 가상 수위 이하의 잠재 침수 지역" : changesOnly ? "청록: 지난 5년 새로 추가된 영역 · 예상 범위 상단 포함" : "진한 파랑: 중간값 기준 잠재 침수 지역";
		revision++;
		for (const set of records.values()) for (const r of set) {
			r.error = false;
			r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
		}
		schedule();
		updateStatus();
	}
	async function setEnabled(value) {
		enabled = value;
		panel.hidden = !value;
		section.classList.toggle("seaMode", value);
		button.setAttribute("aria-pressed", String(value));
		button.setAttribute("aria-expanded", String(value));
		if (!value) {
			section.classList.toggle("seaChangesOnly", false);
			clearTimeout(timer);
			worker?.terminate();
			worker = null;
			if (map.hasLayer(layer)) map.removeLayer(layer);
			records.clear();
			document.querySelector(".layerMenu > summary")?.focus();
		} else {
			map.closePopup();
			document.querySelector(".layerMenu")?.removeAttribute("open");
			panel.scrollTop = 0;
			section.scrollIntoView({ block: "start" });
			el("seaLevelClose").focus({ preventScroll: true });
			const showExample = map.getZoom() < 6;
			el("seaLevelLocationNote").hidden = !showExample;
			if (showExample) map.setView([37.46, 126.59], 13, { animate: false });
			updateStatus();
			try {
				if (!data) {
					if (!dataPromise) dataPromise = fetch("/richdisk/earthquake-radar/sea-level/projections.json", { signal: AbortSignal.timeout(12e3) }).then((r) => {
						if (!r.ok) throw Error();
						return r.json();
					}).catch((e) => {
						dataPromise = null;
						throw e;
					});
					data = await dataPromise;
				}
				if (!enabled) return;
				updateSelection();
				ensureWorker();
				if (!map.hasLayer(layer)) map.addLayer(layer);
			} catch (error) {
				el("seaLevelStatus").textContent = error.message || "자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
				el("seaLevelRetry").hidden = false;
			}
		}
		requestAnimationFrame(() => map.invalidateSize({ pan: false }));
	}
	el("seaLevelClose").addEventListener("click", () => setEnabled(false));
	function selectYear(next) {
		if (!Number.isInteger(next) || next % 5 || next < yearRange.min || next > yearRange.max) return;
		year = next;
		compareBaseline = false;
		updateSelection();
	}
	el("seaLevelYear").addEventListener("input", (e) => selectYear(Number(e.target.value)));
	panel.querySelectorAll("[data-sea-year-step]").forEach((b) => b.addEventListener("click", () => selectYear(year + Number(b.dataset.seaYearStep))));
	el("seaLevelYearEnd").addEventListener("click", () => selectYear(yearRange.max));
	el("seaLevelChangesOnly").addEventListener("click", () => {
		if (year === yearRange.min) return;
		changesOnly = !changesOnly;
		compareBaseline = false;
		updateSelection();
	});
	el("seaLevelFocusChange").addEventListener("click", () => {
		const center = map.getCenter();
		const points = [...records.values()].flatMap((set) => [...set].filter((r) => r.revision === revision && !r.error && r.stepPixel >= 0).map((r) => {
			const n = 2 ** r.coords.z, lng = (r.coords.x + (r.stepPixel % 256 + .5) / 256) / n * 360 - 180;
			const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (r.coords.y + (Math.floor(r.stepPixel / 256) + .5) / 256) / n))) * 180 / Math.PI;
			const dx = ((lng - center.lng + 540) % 360 - 180) * Math.cos(center.lat * Math.PI / 180);
			return {
				lat,
				lng,
				distance: dx * dx + (lat - center.lat) ** 2
			};
		})).sort((a, b) => a.distance - b.distance);
		if (points.length) {
			map.setView([points[0].lat, points[0].lng], Math.max(15, map.getZoom()), { animate: false });
			panel.scrollTop = 0;
			section.scrollIntoView({ block: "start" });
		}
	});
	el("seaLevelCompare").addEventListener("click", () => {
		compareBaseline = !compareBaseline;
		updateSelection();
	});
	el("seaLevelHighlight").addEventListener("click", () => {
		highlightAdded = !highlightAdded;
		updateSelection();
	});
	panel.querySelectorAll("[data-sea-scenario]").forEach((b) => b.addEventListener("click", () => {
		scenario = b.dataset.seaScenario;
		experiment = "";
		compareBaseline = false;
		updateSelection();
	}));
	panel.querySelectorAll("[data-sea-experiment]").forEach((b) => b.addEventListener("click", () => {
		experiment = experiment === b.dataset.seaExperiment ? "" : b.dataset.seaExperiment;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
	}));
	el("seaLevelBack").addEventListener("click", () => {
		experiment = "";
		updateSelection();
	});
	el("seaLevelRetry").addEventListener("click", () => {
		if (!data || !worker) setEnabled(true);
		else updateSelection();
	});
	el("seaLevelZoom").addEventListener("click", () => {
		map.setZoom(13);
		panel.scrollTop = 0;
	});
	panel.querySelectorAll("[data-sea-place]").forEach((b) => b.addEventListener("click", () => {
		const [lat, lon] = b.dataset.seaPlace.split(",").map(Number);
		el("seaLevelLocationNote").hidden = true;
		map.setView([lat, lon], 13);
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	}));
	map.on("zoomend moveend", () => {
		if (enabled) {
			schedule();
			updateStatus();
		}
	});
	panel.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			e.preventDefault();
			setEnabled(false);
		}
	});
	return { toggle: () => setEnabled(!enabled) };
}
//#endregion
export { mountSeaLevel, prepareSeaLevelPanel };

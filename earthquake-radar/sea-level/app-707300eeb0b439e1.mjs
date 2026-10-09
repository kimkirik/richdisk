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
const DARK = [
	4,
	82,
	135,
	220
];
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
function intervalColor(year) {
	if (year === 2030) return DARK;
	const hue = ((year - 2035) / 5 * 137.508 + 172) % 360;
	const component = (n) => {
		const k = (n + hue / 30) % 12;
		return Math.round(255 * (.64 - .32 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
	};
	return [
		component(0),
		component(8),
		component(4),
		170
	];
}
function projectionBands(data, scenario, year) {
	const { min } = projectionRange(data, scenario);
	projectionAt(data, scenario, year);
	const bands = [];
	for (let end = min; end <= year; end += 5) {
		const upper = projectionAt(data, scenario, end).upper;
		if (!Number.isFinite(upper) || upper < 0 || bands.length && upper < bands.at(-1).upper) throw Error("Invalid interval projection");
		bands.push({
			year: end,
			upper,
			color: intervalColor(end)
		});
	}
	return bands;
}
//#endregion
//#region public/sea-level/regional.mjs
function regionalCell(lat, lng) {
	if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -60 || lat >= 83) return null;
	return {
		lat: Math.floor(lat),
		lon: Math.floor(((lng + 180) % 360 + 360) % 360 - 180)
	};
}
function regionalUrl({ lat, lon }) {
	return `https://sealevel.nasa.gov/projection-passthru/?lat=${lat}&lon=${lon}&process=total&confidence=medium&data_layer=ssp`;
}
function normalizeRegional(rows, cell, accessed) {
	if (!Array.isArray(rows)) throw Error("Regional data unavailable");
	const scenarios = {};
	for (const scenario of Object.keys(SCENARIOS)) {
		const matches = rows.filter((r) => r.type === "grid" && r.lat === cell.lat && r.lon === cell.lon && r.process === "total" && r.confidence === "medium" && r.scenario === scenario);
		if (matches.length !== 1) throw Error("Regional projection missing");
		const row = matches[0], years = row.year;
		if (!Array.isArray(years) || years.length !== 14 || !years.every((y, i) => y === 2020 + i * 10)) throw Error("Invalid regional years");
		for (const field of [
			"height_17",
			"height_50",
			"height_83"
		]) if (!Array.isArray(row[field]) || row[field].length !== years.length || !row[field].every((v) => Number.isFinite(v) && Math.abs(v) < 20)) throw Error("Invalid regional levels");
		if (!years.every((_, i) => row.height_17[i] <= row.height_50[i] && row.height_50[i] <= row.height_83[i])) throw Error("Invalid regional quantiles");
		scenarios[scenario] = Object.fromEntries([
			"year",
			"height_17",
			"height_50",
			"height_83"
		].map((k) => [k, row[k]]));
	}
	return {
		scope: "regional",
		grid: cell,
		baseline: "1995–2014",
		confidence: "medium",
		unit: "m",
		accessed,
		source: regionalUrl(cell),
		sourcePage: "https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool/",
		scenarios
	};
}
function increasingProjection(data, scenario) {
	const row = data.scenarios[scenario];
	return ["height_50", "height_83"].every((k) => row[k].slice(1).every((v, i, values) => v >= 0 && (!i || v >= values[i - 1])));
}
function createRegionalLoader(fetcher = fetch) {
	const cache = /* @__PURE__ */ new Map();
	return async (cell) => {
		const key = `${cell.lat}/${cell.lon}`;
		if (cache.has(key)) return cache.get(key);
		const response = await fetcher(`/api/sea-projection?lat=${cell.lat}&lon=${cell.lon}`, { signal: AbortSignal.timeout(18e3) });
		if (!response.ok) throw Error("Regional data unavailable");
		const data = await response.json();
		if (data.scope !== "regional" || data.grid?.lat !== cell.lat || data.grid?.lon !== cell.lon || data.unit !== "m" || data.baseline !== "1995–2014") throw Error("Regional grid mismatch");
		normalizeRegional(Object.entries(data.scenarios).map(([scenario, row]) => ({
			...row,
			scenario,
			...cell,
			type: "grid",
			process: "total",
			confidence: "medium"
		})), cell, data.accessed);
		cache.set(key, data);
		if (cache.size > 12) cache.delete(cache.keys().next().value);
		return data;
	};
}
//#endregion
//#region lib/sea-level-ui.js
const SEA_COASTS = [
	{
		id: "incheon",
		name: "대한민국 · 인천",
		lat: 37.46,
		lng: 126.59
	},
	{
		id: "tuvalu",
		name: "투발루 · 푸나푸티",
		lat: -8.52,
		lng: 179.2
	},
	{
		id: "kiribati",
		name: "키리바시 · 타라와",
		lat: 1.36,
		lng: 173.1
	},
	{
		id: "maldives",
		name: "몰디브 · 말레",
		lat: 4.175,
		lng: 73.51
	},
	{
		id: "netherlands",
		name: "네덜란드 · 로테르담",
		lat: 51.95,
		lng: 4.22
	},
	{
		id: "miami",
		name: "미국 · 마이애미",
		lat: 25.78,
		lng: -80.16
	}
];
const SEA_LEVEL_CSS = `
.seaMode{scroll-margin-top:125px}.seaLevelHead{position:sticky;top:-12px;background:#091f30;z-index:2;padding:4px 0 8px}
.seaLevelPanel[hidden]{display:none!important}.seaMode{display:flex;flex-direction:column;min-height:0!important}.seaMode .mapCanvas{position:relative;inset:auto;flex:1;min-height:280px}.seaMode .timeline{display:none}.seaLevelPanel{flex:none;padding:12px 16px;background:#091f30;border-top:1px solid #458aa5;max-height:min(38dvh,340px);overflow:auto;overscroll-behavior:contain;color:#ecf8ff;font-size:.875rem;line-height:1.6}.seaLevelPanel *{box-sizing:border-box}.seaLevelHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.seaLevelHead h2{font-size:1rem;margin:0}.seaWaterMeaning{display:block}.seaLevelHead small{display:block;color:#a8cddd;font-size:.75rem;line-height:1.4}.seaLevelHead>div{min-width:0}.seaLevelHead select{display:block;width:100%;max-width:300px;min-height:44px;margin-top:4px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;font:inherit;font-size:.8125rem;padding:6px}.seaLevelHead select:focus-visible{outline:3px solid #a3e8ff}.seaLevelHead>button{flex:none;white-space:nowrap}.seaLevelPanel button{min-height:44px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;padding:8px 11px;font:inherit;cursor:pointer}.seaLevelPanel button[aria-pressed="true"]{border-color:#78d7ff;background:#175d85;color:#fff;box-shadow:inset 0 0 0 1px #78d7ff}.seaLevelPanel button:focus-visible,.seaLevelPanel input:focus-visible,.seaLevelPanel summary:focus-visible{outline:3px solid #a3e8ff;outline-offset:2px}.seaLevelGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.85fr);gap:12px 24px;margin-top:8px}.seaLevelPanel fieldset{border:0;margin:0;padding:0;min-width:0}.seaLevelPanel legend{font-weight:700;margin-bottom:5px}.seaLevelScenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.seaLevelScenarios button{padding:6px 4px;font-size:.875rem}.seaLevelScenarios small{display:block;font-size:.75rem;color:#b8d5e3}.seaLevelYearHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px}.seaLevelYearHead output{font-size:1.375rem;font-weight:800;color:#94ddff}.seaLevelPanel input[type="range"]{width:100%;height:36px;accent-color:#65cfff;cursor:pointer}.seaLevelTicks{display:flex;justify-content:space-between;color:#a8cddd;font-size:.75rem}.seaLevelMetrics{display:flex;gap:24px}.seaLevelMetrics span{display:block;color:#b4d3e0;font-size:.75rem}.seaLevelMetrics strong{font-size:1.65rem;letter-spacing:-.02em}.seaLevelKey{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:.8125rem}.seaLevelSwatch{display:inline-block;width:18px;height:13px;border-radius:3px;background:#045287;flex:none;border:1px solid #ceeaff}.seaLevelSwatch.light{background:#2da2d0}.seaLevelNote{color:#c2d8e2;font-size:.8125rem;margin:8px 0 0}.seaLevelNote strong{color:#f2cf8d}.seaLevelActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.seaLevelStatus{font-size:.8125rem;color:#a6dded;margin:8px 0 0}.seaLevelDetails{margin-top:9px;border-top:1px solid #2f5266;padding-top:7px}.seaLevelDetails summary{min-height:36px;cursor:pointer;font-weight:700}.seaLevelDetails p{margin:6px 0}.seaLevelPanel a{color:#8ae3ff}.seaLevelTiles{image-rendering:pixelated}.seaLevelPanel [hidden]{display:none!important}
.seaLevelYearSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:6px}.seaLevelYearSteps button{padding:6px 3px;font-weight:700;line-height:1.25}.seaLevelYearSteps button{white-space:nowrap}.seaLevelTicks{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:center}.seaLevelTicks #seaLevelYearEnd{grid-column:4}.seaLevelTicks #seaLevelFocusChange{justify-self:center}.seaLevelTicks>span:nth-child(2){text-align:center}.seaLevelTicks button{justify-self:end;min-height:44px;padding:4px 8px;line-height:1.2}.seaLevelTicks small{display:block;font-size:.75rem}.seaLevelYearSteps button:disabled{opacity:.4;cursor:default}.seaLevelYearControls{padding-bottom:10px;border-bottom:1px solid #2f5266}.seaLevelYearHead label{font-weight:700}.seaLevelYearHead output{white-space:nowrap}.seaLevelVisibility{padding:8px 0}.seaLevelVisibility p{margin:0 0 8px}.seaLevelVisibility button{width:100%}.seaLevelYearHead small{display:block;color:#92e9df;font-size:.8125rem;font-weight:600;line-height:1.5}.seaLevelTicks #seaLevelExpansionOnly{justify-self:center}.seaLevelPanel button:disabled{opacity:.45;cursor:default}.seaChangesOnly .satelliteTiles,.seaChangesOnly .streetTiles{filter:brightness(.55) saturate(.4)}.seaChangesOnly #seaLevelDarkKey .seaLevelSwatch:not(.light){background:#00f5dc}
.seaLevelBandLegend{padding:8px 0;border-bottom:1px solid #2f5266}.seaLevelBandLegend summary{cursor:pointer;min-height:44px;padding:8px 0;color:#b9e4f3}.seaLevelBandList{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:5px;max-height:190px;overflow:auto;padding:3px}.seaLevelBandList button{display:flex;align-items:center;gap:8px;text-align:left;font-size:.8125rem}.seaLevelBandLegend .seaLevelNote{margin-top:2px}
.seaLevelYearHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 8px}.seaLevelYearHead>div{display:contents}.seaLevelYearHead label{grid-column:1;grid-row:1}.seaLevelYearHead output{grid-column:2;grid-row:1;line-height:1}.seaLevelYearHead small{grid-column:1/-1;grid-row:2}
.seaMode .legend{display:none}.seaMode .leaflet-control-zoom{display:flex;margin-top:60px!important}.seaMode .leaflet-control-zoom a{width:40px;height:40px;line-height:40px}.seaMode .mapActions{display:flex;justify-content:space-between;pointer-events:none}.seaMode .mapActions>*{pointer-events:auto}.seaMode #latestQuakeButton{display:none}.seaMode .placeSearch{top:12px;left:64px;right:120px}.seaMode .placeSearch>button{padding:0;font-size:.875rem}
@media(max-width:900px){.seaMode .placeSearch{top:8px;left:58px;right:102px;grid-template-columns:minmax(0,1fr) 44px}.seaMode .placeSearch input{padding-left:8px;font-size:.875rem}}
@media(max-width:600px){.seaLevelPanel{padding-top:8px!important}.seaLevelHead{padding-bottom:4px}.seaLevelHead h2{line-height:1.35}.seaLevelPanel:has(#seaLevelYearControls:not([hidden])) #seaLevelMode{display:none}}
@media(min-width:901px) and (min-height:600px){.seaMode .mapCanvas{height:auto;min-height:180px}.seaMode{height:100%}.seaLevelPanel{max-height:min(48dvh,380px)}}
@media(max-width:900px),(max-height:599px) and (orientation:landscape){.seaMode .mapCanvas{flex:none;height:clamp(160px,calc(100svh - 410px),360px);min-height:160px}.seaLevelPanel{padding:12px;max-height:340px}.seaLevelGrid{grid-template-columns:1fr;gap:12px}.seaLevelScenarios button{font-size:.875rem}.seaLevelHead h2{font-size:1rem}}
`;
const SEA_LEVEL_HTML = `
<section id="seaLevelPanel" class="seaLevelPanel" aria-labelledby="seaLevelTitle" hidden>
  <div class="seaLevelHead"><div><h2 id="seaLevelTitle">🌊 잠재 침수 시뮬레이션</h2><small id="seaLevelMode">미래 해수면</small><select id="seaLevelPlace" aria-label="세계 해안 예시 선택"><option value="">🌐 세계 해안 선택</option>${SEA_COASTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select></div><button id="seaLevelClose" type="button" aria-label="미래 해수면 닫기">닫기 ×</button></div>
  <button type="button" id="seaLevelBack" hidden>연도별 시나리오로 돌아가기</button>
  <div id="seaLevelVisibility" class="seaLevelVisibility" hidden><p>전 세계 해안을 볼 수 있습니다. <strong>지도에서 살펴볼 해안을 누르면</strong> 그곳을 확대해 계산합니다. 국가 전체 보기에서는 작은 침수 격자를 표시하지 않습니다.</p><button id="seaLevelZoom" type="button">지도 중심 확대</button></div>
  <div id="seaLevelYearControls" class="seaLevelYearControls"><div class="seaLevelYearHead"><div><label for="seaLevelYear">살펴볼 연도 · 5년 간격</label><small id="seaLevelStepChange">시작 연도 · 5년 단위로 비교</small></div><output id="seaLevelYearValue" for="seaLevelYear" aria-live="polite">2030년</output></div><input id="seaLevelYear" type="range" min="2030" max="2150" step="5" value="2030" aria-valuetext="2030년"><div class="seaLevelTicks"><span id="seaLevelYearMin" hidden>2030</span><button id="seaLevelCompare" type="button" aria-label="2030년 지도와 비교" aria-pressed="false" disabled>2030 비교</button><button id="seaLevelExpansionOnly" type="button" aria-pressed="false" disabled>추가 영역만</button><button id="seaLevelFocusChange" type="button" aria-label="추가 영역만 확대" hidden>변화 확대</button><button type="button" id="seaLevelYearEnd" aria-label="마지막 예측 연도 2150년으로 이동">최대<small id="seaLevelYearEndValue">2150년</small></button></div><div class="seaLevelYearSteps" role="group" aria-label="선택 연도에서 앞으로 이동"><button type="button" data-sea-year-step="5" aria-label="5년 이후">+5년</button><button type="button" data-sea-year-step="10" aria-label="10년 이후">+10년</button><button type="button" data-sea-year-step="50" aria-label="50년 이후">+50년</button><button type="button" data-sea-year-step="100" aria-label="100년 이후">+100년</button></div></div>
  <p id="seaLevelColorMeaning" class="seaLevelNote">색칠 = 물에 잠길 후보 육지 · 새 땅이 아닙니다</p>
  <p id="seaLevelRegion" class="seaLevelNote"></p>
  <p id="seaLevelStatus" class="seaLevelStatus" role="status" aria-live="polite"></p><button id="seaLevelRetry" type="button" hidden>자료 다시 확인</button>
  <p id="seaLevelConnectionStatus" class="seaLevelNote"></p>
  <p id="seaLevelChangeCaution" class="seaLevelNote" hidden>색칠된 곳은 계산상 새로 추가된 육지 격자입니다. 2021년 물·육지 분류와 지형 자료의 시점·오차 때문에 현재 해안선과 다를 수 있습니다.</p>
  <div id="seaLevelBandLegend" class="seaLevelBandLegend"><div id="seaLevelBandCurrent" class="seaLevelKey" aria-live="polite"></div><p class="seaLevelNote">색 = 처음 표시되는 5년 구간 · 예상 범위 상단 기준</p><details><summary>누적 색상 범례 · 구간을 누르면 따로 보기</summary><div id="seaLevelBandList" class="seaLevelBandList" role="group" aria-label="처음 표시되는 5년 구간별 색상"></div></details></div>
  <p id="seaLevelYearRange" class="seaLevelNote">NASA/IPCC 자료 · 2030~2150년. +버튼은 선택한 연도에서 이동합니다.</p>
  <p class="seaLevelNote">다른 나라·도시도 지도 검색으로 이동할 수 있습니다. 색칠은 자료가 있는 해안의 잠재 침수 후보이며, 정밀 침수 예측이 아닙니다.</p>
  <div id="seaLevelLoadRecovery" class="seaLevelActions" hidden><button id="seaLevelLoadRetry" type="button">해수면 다시 불러오기</button><button id="seaLevelReload" type="button">최신 화면으로 새로고침</button></div>
  <p id="seaLevelLocationNote" class="seaLevelNote" hidden></p>

  <div class="seaLevelGrid">
    <fieldset id="seaLevelScenarioControls"><legend>배출 시나리오</legend><div class="seaLevelScenarios"><button type="button" data-sea-scenario="ssp126" aria-pressed="false">저배출<small>SSP1-2.6</small></button><button type="button" data-sea-scenario="ssp245" aria-pressed="true">중간<small>SSP2-4.5</small></button><button type="button" data-sea-scenario="ssp370" aria-pressed="false">고배출<small>SSP3-7.0</small></button></div></fieldset>
    <div><div class="seaLevelMetrics" aria-live="polite" aria-atomic="true"><div><span id="seaLevelMedianLabel">중간값 · 50백분위</span><strong id="seaLevelMedian">—</strong></div><div id="seaLevelUpperMetric"><span>예상 범위 상단 · 83백분위</span><strong id="seaLevelUpper">—</strong></div></div><div class="seaLevelKey" id="seaLevelDarkKey"><i class="seaLevelSwatch" aria-hidden="true"></i><span id="seaLevelDarkLegend">진한 파랑: 중간값 기준 잠재 침수 지역</span></div><div class="seaLevelKey" id="seaLevelUpperLegend"><i class="seaLevelSwatch light" aria-hidden="true"></i><span>옅은 파랑: 예상 범위 상단에서 바다와 연결되는 후보</span></div><p id="seaLevelBasis" class="seaLevelNote">IPCC 기준값을 확인하고 있습니다.</p></div>
  </div>
  <div id="seaLevelComparison" class="seaLevelComparison"><p id="seaLevelChange" class="seaLevelNote" aria-live="polite"></p><div class="seaLevelActions"><button id="seaLevelHighlight" type="button" aria-pressed="false">5년 구간 색상 보기</button><button id="seaLevelChangesOnly" type="button" aria-pressed="false" disabled>직전 5년 변화만</button></div></div>
  <p class="seaLevelNote"><strong>확정 침수 예측이 아닙니다.</strong> 파랑·청록은 주어진 수위에서 바다까지 지형상 경로가 이어지는 후보 육지입니다. 황토색 빗금은 수위 이하이지만 연결을 확인하지 못한 저지대입니다. 방파제·조수·폭풍해일·미래 지반침하와 현지 높이 기준 보정은 반영하지 않습니다.</p>
  <details class="seaLevelDetails"><summary>작은 섬인데 왜 잠기는 색이 적나요?</summary><p>몰디브·투발루 같은 좁은 섬은 지형 해상도와 물·육지 경계 제외 때문에 낮은 땅을 놓칠 수 있습니다. 색칠이 없다고 안전하지 않습니다. 만조·파도·폭풍해일·지하수 침수는 이 지도에 포함하지 않으며, 반복 침수 위험과 나라 전체의 영구 침수는 다릅니다.</p><p><a href="https://sealevel.nasa.gov/data_tools/19/" target="_blank" rel="noopener">NASA 태평양 섬 만조 침수 분석</a>에서 지원 지역의 침수 빈도와 상세 지도를 함께 확인하세요.</p></details><details class="seaLevelDetails"><summary>색상과 연도 변화 읽는 법</summary><p>기본 비교에서 파랑은 2030년부터 연결되는 후보, 청록은 선택 연도까지 새로 연결되는 후보입니다. ‘추가 영역만’은 새로 연결된 곳만 보여 줍니다. 황토색 빗금 구역은 연결 시점을 확인할 수 없어 추가 영역 비교에서 제외합니다.</p><p>5년 구간 색상은 계산상 경로가 처음 연결되는 연도에 고정됩니다. 실제 침수 시점이나 확률이 아닙니다. 연도 옆 ‘추가 N칸’은 불러온 지도 조각 전체의 계산 격자 수이며 화면 밖 일부도 포함합니다. 실제 침수 면적이나 정확도가 아니고, 지도 이동·배율에 따라 달라집니다. 수위가 조금 높아져도 면적이 그대로일 수 있고, 낮은 땅을 가로막던 지형을 넘을 때 한꺼번에 넓어질 수도 있습니다. 미래 위성사진이나 확정 해안선을 표시하는 기능이 아닙니다.</p></details>
  <details class="seaLevelDetails"><summary>별도 가상실험 · 빙하가 모두 녹는다면</summary><p class="seaLevelNote">선택한 연도의 예측이 아닙니다. 각 수위를 따로 적용하며 서로 합산하지 않습니다.</p><div class="seaLevelActions"><button type="button" data-sea-experiment="thwaites" aria-pressed="false">스웨이츠 빙하 +0.65m</button><button type="button" data-sea-experiment="westAntarctic" aria-pressed="false">서남극 전체 +3.3m</button><button type="button" data-sea-experiment="allIce" aria-pressed="false">모든 육상빙하 +70m</button></div><p class="seaLevelNote">+70m는 남극·그린란드 빙상을 포함한 육상 얼음 전체의 대략적인 해수면 환산량을 가정한 실험입니다.</p></details>
  <details class="seaLevelDetails"><summary>자료 출처와 계산 한계</summary><p>해수면: <a href="https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool/" target="_blank" rel="noopener">NASA IPCC AR6 자료</a> · 지역별 상대 해수면(지도 중심 1° 격자), 중간 신뢰도, 1995–2014 평균 대비. 지역 자료가 없거나 요청이 실패하면 전 지구 평균으로 전환하고 화면에 표시합니다. 격자 사이 공간 보간은 하지 않으며, 인접 격자 이동 시 수치가 달라질 수 있습니다. 중간값은 50백분위, 예상 범위는 17~83백분위입니다. 상단은 가능한 최대값이나 지역별 침수 확률이 아닙니다. 2030~2150년의 10년 간격 원자료 사이를 선형 보간합니다.</p><p>고도: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS 공개 Mapzen Terrain Tiles</a>. 물·육지 구분: <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover 2021 v200</a>의 10m급 원자료(CC BY 4.0). 바다·호수 등 상시 수역, 미분류와 물·육지가 섞인 경계 격자는 후보 육지에서 제외합니다. 알려진 물·육지 혼합 격자는 고도 조건에 따라 경로 계산에만 사용합니다. 화면용 색상을 판독하지 않고 원자료 분류값을 사용합니다. 2021년 이후 간척·해안 변화, 조간대와 분류 오차는 남습니다. 침수 높이를 정하는 고도 자료의 해상도는 10m로 개선된 것이 아닙니다.</p><p>상시 수역 중 Natural Earth의 거친 해안선에서 약 1km 이상 떨어진 바다를 시작점으로, 고도가 수위를 넘지 않는 상하좌우 경로를 확인합니다. 각 지도 조각과 주변 8개 조각 안에서만 계산합니다. 범위 밖으로 우회하는 경로, 미분류 지형과 자료에 잡히지 않는 제방·수문·배수관은 확인하지 못합니다. 연결 미확인은 고립이나 안전이 확정됐다는 뜻이 아닙니다. 색칠되지 않았다고 안전하다는 뜻은 아닙니다. 자료 정밀도는 지역마다 다르며 소수점 수위 표시와 지도 확대가 지형 오차를 줄여 주지는 않습니다. 고도 기준면을 기준기간의 현지 평균 해수면에 맞추는 보정도 적용하지 않았습니다.</p><p>연결 시작점: <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/" target="_blank" rel="noopener">Natural Earth 육지 자료</a>(공개 도메인). 해안 침수 경계로 직접 사용하지 않습니다. 계산 참고: <a href="https://coast.noaa.gov/digitalcoast/tools/slr.html" target="_blank" rel="noopener">NOAA 해수면 상승 지도 작성 방법</a>. 이 앱은 NOAA 침수 지도를 재현하거나 동일한 정확도를 보장하지 않습니다.</p><p>가상실험 근거: <a href="https://www.bas.ac.uk/news/grim-outlook-for-antarcticas-thwaites-glacier/" target="_blank" rel="noopener">British Antarctic Survey · 스웨이츠·서남극</a> · <a href="https://sealevel.jpl.nasa.gov/news/1302/whats-up-with-sea-level/" target="_blank" rel="noopener">NASA JPL · 육상 얼음</a>. 이 지도는 도시계획·대피 판단용 정밀 침수해석을 대신하지 않습니다.</p><p>© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. <a href="https://doi.org/10.5281/zenodo.7254221" target="_blank" rel="noopener">Zanaga et al. (2022), ESA WorldCover 10 m 2021 v200</a> · 육지 마스크로 재표본화하여 사용.</p><p>자료 확인: 2026-09-09 · API 키와 유료 가입 없이 제공되는 공개 자료 사용.</p></details>
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
	}, stepChangeText = "";
	let compareBaseline = false, intervalColors = false, changesOnly = false, expansionOnly = false;
	let globalData, regionKey = "", regionRevision = 0, regionLoading = false, regionError = false;
	const loadRegional = createRegionalLoader();
	const number = (value) => value.toLocaleString("ko-KR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
	const signed = (value) => `${value < 0 ? "" : "+"}${number(value)}`;
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
		minZoom: 10,
		maxZoom: 19,
		maxNativeZoom: 13,
		updateWhenIdle: true,
		updateWhenZooming: false,
		keepBuffer: 0,
		className: "seaLevelTiles",
		attribution: "<a href=\"https://registry.opendata.aws/terrain-tiles/\" target=\"_blank\" rel=\"noopener\">Mapzen terrain</a> · <a href=\"https://esa-worldcover.org/en/data-access\" target=\"_blank\" rel=\"noopener\">© ESA WorldCover project 2021</a> · Natural Earth · IPCC/NASA"
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
		const hiddenByZoom = map.getZoom() < 10;
		el("seaLevelVisibility").hidden = !hiddenByZoom;
		el("seaLevelYearControls").hidden = hiddenByZoom || Boolean(experiment) || compareBaseline;
		el("seaLevelStepChange").textContent = stepChangeText;
		el("seaLevelStepChange").title = "추가 칸 수는 불러온 지도 조각 전체의 계산 격자 수입니다. 화면 밖 일부도 포함하며, 실제 침수 면적·확률·정확도가 아닙니다.";
		const showChangeTools = year > yearRange.min && !experiment && !compareBaseline && data && increasingProjection(data, scenario);
		el("seaLevelFocusChange").hidden = !showChangeTools;
		el("seaLevelChangeCaution").hidden = !(changesOnly || expansionOnly);
		el("seaLevelFocusChange").disabled = true;
		el("seaLevelZoom").hidden = !hiddenByZoom;
		if (!data) {
			el("seaLevelStatus").textContent = "IPCC 기준값을 불러오는 중입니다.";
			return;
		}
		if (regionLoading) {
			el("seaLevelStatus").textContent = "현재 지역의 NASA 수위 자료를 확인하고 있습니다…";
			return;
		}
		if (map.getZoom() < 10) {
			el("seaLevelStatus").textContent = "현재 지도가 너무 넓어 침수 지형이 숨겨져 있습니다. 지도에서 해안을 누르거나 ‘세계 해안 선택’을 이용하세요.";
			el("seaLevelRetry").hidden = true;
			return;
		}
		const all = [...records.values()].map((set) => [...set][0]);
		const errors = all.filter((r) => r.error).length, pending = all.filter((r) => r.revision !== revision && !r.error).length;
		const count = all.filter((r) => r.revision === revision).reduce((sum, r) => sum + r.dark + r.light, 0);
		const unconfirmed = all.filter((r) => r.revision === revision).reduce((sum, r) => sum + (r.unconfirmed || 0), 0), partial = all.some((r) => r.partial);
		if (errors || pending || !all.length) el("seaLevelStepChange").textContent = stepChangeText + (errors ? " · 일부 표시 실패" : " · 지형 계산 중");
		el("seaLevelConnectionStatus").textContent = unconfirmed && (changesOnly || expansionOnly) ? "연결 미확인 저지대는 추가 영역 비교에서 제외했습니다. 전체 영역에서 황토색 빗금으로 볼 수 있습니다." : unconfirmed ? "황토색 빗금: 수위 이하지만 바다 연결을 확인하지 못한 저지대입니다. 안전하다는 뜻이 아닙니다." : "바다 연결은 주변 지형 안에서 확인합니다. 색칠되지 않은 곳의 안전을 판정하지 않습니다.";
		el("seaLevelStatus").textContent = errors ? "일부 물·육지 또는 고도 자료가 지연됩니다. 해당 구역은 표시를 보류합니다." : pending || !all.length ? "주변 지형에서 바다와 이어지는 경로를 확인하고 있습니다…" : count ? "바다 연결 후보 표시 완료" : unconfirmed ? "수위 이하 저지대는 있지만 바다 연결을 확인하지 못했습니다. 황토색 빗금으로 구분했습니다." : "현재 자료에서 수위 이하의 육지를 찾지 못했습니다. 미분류·경계 혼합 격자도 제외하며, 안전 판정이 아닙니다.";
		if (!errors && !pending && all.length && !experiment && !compareBaseline && increasingProjection(data, scenario)) {
			const stepAdded = all.reduce((sum, r) => sum + (r.stepAdded || 0), 0);
			const expansionAdded = all.reduce((sum, r) => sum + (r.expansionAdded || 0), 0);
			if (year > yearRange.min) {
				const from = changesOnly ? year - 5 : yearRange.min, changeCount = changesOnly ? stepAdded : expansionAdded;
				el("seaLevelStatus").textContent = `${from}→${year}년 갱신 완료 · ` + (changeCount ? intervalColors ? "추가 영역을 5년 구간 색상으로 표시했습니다." : "청록이 이 기간에 추가된 후보 육지입니다. ‘변화 확대’로 추가 부분만 크게 볼 수 있습니다." : "이 지형 범위에서 새로 색칠되는 격자는 없습니다. 수위 상승과 지도 면적 변화는 비례하지 않습니다.");
				el("seaLevelStepChange").textContent = stepChangeText + (partial ? " · 일부 자료 누락" : ` · 추가 ${changeCount.toLocaleString("ko-KR")}칸`);
				el("seaLevelFocusChange").disabled = !changeCount;
			} else el("seaLevelStatus").textContent += " · 시작 연도";
		}
		if (partial && !pending) el("seaLevelStatus").textContent += " · 주변 자료 일부 누락: 연결 여부를 덜 확인했을 수 있습니다.";
		el("seaLevelRetry").hidden = !errors && !partial && !regionError;
	}
	function ensureWorker() {
		if (worker) return;
		if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) throw Error("이 브라우저는 지형 계산을 지원하지 않습니다. 최신 Safari 또는 Chrome에서 열어 주세요.");
		const activeWorker = new Worker("/richdisk/earthquake-radar/sea-level/terrain-e116a59ce78f2669.mjs", { type: "module" });
		worker = activeWorker;
		activeWorker.onmessage = ({ data: response }) => {
			if (!enabled || worker !== activeWorker) return;
			const set = records.get(response.key);
			if (!set) return;
			if (response.revision !== revision) return;
			if (response.type !== "tile" && response.type !== "error") return;
			for (const r of set) {
				if (response.type === "tile") {
					r.canvas.getContext("2d").putImageData(new ImageData(response.pixels, 256, 256), 0, 0);
					r.revision = revision;
					r.dark = response.dark;
					r.light = response.light;
					r.unconfirmed = response.unconfirmed || 0;
					r.partial = response.partial;
					r.added = response.added;
					r.stepAdded = response.stepAdded || 0;
					r.stepPixel = response.stepPixel ?? -1;
					r.expansionAdded = response.expansionAdded || 0;
					r.expansionPixel = response.expansionPixel ?? -1;
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
		activeWorker.onerror = () => {
			if (!enabled || worker !== activeWorker) return;
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
		if (!enabled || !data || regionLoading) return;
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
		const increasing = !data || increasingProjection(data, scenario);
		if (!increasing) {
			changesOnly = false;
			expansionOnly = false;
			intervalColors = false;
		}
		if (year === yearRange.min || experiment || compareBaseline) {
			changesOnly = false;
			expansionOnly = false;
		}
		el("seaLevelChangesOnly").disabled = year === yearRange.min || !increasing;
		el("seaLevelChangesOnly").setAttribute("aria-pressed", String(changesOnly));
		el("seaLevelExpansionOnly").disabled = year === yearRange.min || !increasing;
		el("seaLevelHighlight").disabled = !increasing;
		el("seaLevelExpansionOnly").setAttribute("aria-pressed", String(expansionOnly));
		el("seaLevelExpansionOnly").textContent = expansionOnly ? "전체 영역 보기" : "추가 영역만";
		section.classList.toggle("seaChangesOnly", enabled && (changesOnly || expansionOnly));
		el("seaLevelYearRange").textContent = `NASA/IPCC 자료 · ${yearRange.min}~${yearRange.max}년. +버튼은 선택한 연도에서 이동합니다. 범위를 넘는 버튼은 비활성화됩니다.`;
		panel.querySelectorAll("[data-sea-scenario]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaScenario === scenario)));
		panel.querySelectorAll("[data-sea-experiment]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaExperiment === experiment)));
		el("seaLevelScenarioControls").disabled = Boolean(experiment);
		el("seaLevelYearControls").hidden = Boolean(experiment) || compareBaseline;
		el("seaLevelYearRange").hidden = Boolean(experiment) || compareBaseline;
		el("seaLevelBack").hidden = !experiment && !compareBaseline;
		el("seaLevelBack").textContent = compareBaseline ? `${year}년 지도로 돌아가기` : "연도별 시나리오로 돌아가기";
		const showBands = intervalColors && !experiment && !compareBaseline;
		el("seaLevelBandLegend").hidden = !showBands;
		el("seaLevelDarkKey").hidden = showBands;
		const showExpansion = increasing && year > yearRange.min && !experiment && !compareBaseline && !changesOnly && !showBands;
		el("seaLevelUpperLegend").hidden = Boolean(experiment) || changesOnly || showBands || showExpansion;
		el("seaLevelComparison").hidden = Boolean(experiment) || compareBaseline;
		el("seaLevelCompare").setAttribute("aria-pressed", String(compareBaseline));
		el("seaLevelCompare").textContent = "2030 비교";
		el("seaLevelCompare").disabled = year === yearRange.min;
		el("seaLevelHighlight").setAttribute("aria-pressed", String(intervalColors));
		el("seaLevelHighlight").textContent = intervalColors ? "5년 구간 색상 켜짐" : "5년 구간 색상 보기";
		if (!data) return;
		const mapYear = compareBaseline && !experiment ? 2030 : year;
		levels = selectedLevels(data, scenario, mapYear, experiment);
		if (!experiment) {
			const baseline = projectionAt(data, scenario, 2030), selected = projectionAt(data, scenario, year), previous = projectionAt(data, scenario, Math.max(2030, year - 5));
			levels = {
				...levels,
				baselineMedian: baseline.median,
				baselineUpper: baseline.upper,
				highlightExpansion: showExpansion,
				bands: showBands ? projectionBands(data, scenario, mapYear) : void 0,
				previousUpper: previous.upper,
				changesOnly,
				expansionOnly
			};
			el("seaLevelChange").textContent = `${year}년 중간값은 2030년보다 ${signed((selected.median - baseline.median) * 100)}cm${year > 2030 ? ` · 직전 5년보다 ${signed((selected.median - previous.median) * 100)}cm` : ""}.`;
			stepChangeText = year > yearRange.min ? changesOnly ? `지난 5년 수위 ${signed((selected.median - previous.median) * 100)}cm` : `2030년 대비 수위 ${signed((selected.median - baseline.median) * 100)}cm` : "시작 연도 · 5년 단위로 비교";
		}
		if (showBands) {
			const bands = levels.bands, current = bands.at(-1);
			const swatch = (band) => `<i class="seaLevelSwatch" style="background:rgb(${band.color.slice(0, 3).join(",")})" aria-hidden="true"></i>`;
			const label = (band) => band.year === yearRange.min ? `${band.year}년 기준` : `${band.year - 5}–${band.year}년 추가`;
			el("seaLevelBandCurrent").innerHTML = `${swatch(current)}<span>${label(current)}${changesOnly ? "만 표시 중" : ""}</span>`;
			el("seaLevelBandList").innerHTML = bands.map((band) => `<button type="button" data-sea-band-year="${band.year}" aria-label="${label(band)}만 보기" aria-pressed="${changesOnly && band.year === year}">${swatch(band)}<span>${label(band)}</span></button>`).join("");
		}
		el("seaLevelMedian").textContent = `${levels.median < 0 ? "" : "+"}${number(levels.median)}m`;
		el("seaLevelUpper").textContent = `${levels.upper < 0 ? "" : "+"}${number(levels.upper)}m`;
		el("seaLevelUpperMetric").hidden = Boolean(experiment);
		el("seaLevelMedianLabel").textContent = experiment ? "가상 수위" : compareBaseline ? "2030년 중간값 · 50백분위" : "중간값 · 50백분위";
		el("seaLevelMode").textContent = experiment ? `가상실험 · ${EXPERIMENTS[experiment].label}` : compareBaseline ? `지금 지도: 2030년 비교 기준 · ${SCENARIOS[scenario]}` : changesOnly ? `${year - 5}→${year}년 추가 · ${SCENARIOS[scenario].split(" · ")[0]}` : expansionOnly ? `2030→${year}년 추가 · ${SCENARIOS[scenario].split(" · ")[0]}` : `지금 지도: ${year}년 · ${SCENARIOS[scenario]}`;
		el("seaLevelColorMeaning").textContent = showExpansion ? expansionOnly ? "청록:2030년 이후 추가 후보" : "파랑:2030 · 청록:이후 추가" : changesOnly ? "색칠:직전 5년 추가 후보" : "색칠 = 물에 잠길 후보 육지 · 새 땅이 아닙니다";
		el("seaLevelRegion").textContent = regionLoading ? "현재 지역 자료 확인 중 · 이전 지역의 색칠은 숨겼습니다." : experiment ? "가상 수위 실험 · 지역별 예측과 별개" : data.scope === "regional" ? `NASA 지역 자료 적용 · 지도 중심 격자 ${data.grid.lat}°, ${data.grid.lon}°` : regionError ? "이 지역의 수위 자료를 받지 못해 전 지구 평균을 사용 중입니다." : "전 지구 평균 자료 사용 중";
		el("seaLevelBasis").textContent = experiment ? "발생 연도·발생 가능성을 정하지 않은 독립 실험입니다. 연도별 시나리오에 더하지 않으며, 빙하 실험끼리도 합산하지 않습니다." : `1995–2014 평균 대비 ${data.scope === "regional" ? "지도 중심 1° 격자의 지역별 상대" : "전 지구 평균"} 해수면 변화량. ${levels.interpolated ? `${levels.anchors[0]}·${levels.anchors[1]}년 IPCC 기준값 사이를 선형 보간한 추정치입니다.` : "이 연도는 NASA가 제공하는 IPCC 기준값입니다. 5년 사이 값은 기준연도 사이를 보간합니다."}${!increasing ? " 해수면이 낮아지는 구간이 있어 추가 영역·5년 색상 기능은 끕니다." : ""}`;
		el("seaLevelDarkLegend").textContent = experiment ? "진한 파랑: 가상 수위 이하의 잠재 침수 지역" : changesOnly ? "청록: 지난 5년 새로 추가된 영역 · 예상 범위 상단 포함" : expansionOnly ? "청록: 2030년 이후 추가된 후보 육지 · 예상 범위 상단 포함" : showExpansion ? "파랑: 2030년 후보 육지 · 청록: 선택 연도까지 추가 · 모두 예상 범위 상단 포함" : "진한 파랑: 중간값 기준 잠재 침수 지역";
		revision++;
		for (const set of records.values()) for (const r of set) {
			r.error = false;
			r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
		}
		schedule();
		updateStatus();
	}
	async function refreshRegion(force = false) {
		if (!enabled || !globalData) return;
		const center = map.getCenter(), cell = map.getZoom() >= 10 ? regionalCell(center.lat, center.lng) : null;
		const key = cell ? `${cell.lat}/${cell.lon}` : "global";
		if (!force && key === regionKey) return;
		regionKey = key;
		const ticket = ++regionRevision;
		regionLoading = true;
		revision++;
		for (const set of records.values()) for (const r of set) r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
		updateStatus();
		let next = globalData, failed = false;
		if (cell) try {
			next = await loadRegional(cell);
		} catch {
			failed = true;
		}
		if (!enabled || ticket !== regionRevision) return;
		data = next;
		regionError = failed;
		regionLoading = false;
		updateSelection();
	}
	async function setEnabled(value) {
		enabled = value;
		panel.hidden = !value;
		section.classList.toggle("seaMode", value);
		button.setAttribute("aria-pressed", String(value));
		button.setAttribute("aria-expanded", String(value));
		if (!value) {
			regionRevision++;
			regionKey = "";
			regionLoading = false;
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
			updateStatus();
			try {
				if (!globalData) {
					if (!dataPromise) dataPromise = fetch("/richdisk/earthquake-radar/sea-level/projections.json", { signal: AbortSignal.timeout(12e3) }).then((r) => {
						if (!r.ok) throw Error();
						return r.json();
					}).catch((e) => {
						dataPromise = null;
						throw e;
					});
					globalData = await dataPromise;
					data = globalData;
				}
				if (!enabled) return;
				await refreshRegion();
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
		if (Math.abs(next - year) !== 5) changesOnly = false;
		year = next;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	}
	el("seaLevelYear").addEventListener("input", (e) => {
		changesOnly = false;
		selectYear(Number(e.target.value));
	});
	panel.querySelectorAll("[data-sea-year-step]").forEach((b) => b.addEventListener("click", () => selectYear(year + Number(b.dataset.seaYearStep))));
	el("seaLevelYearEnd").addEventListener("click", () => selectYear(yearRange.max));
	el("seaLevelChangesOnly").addEventListener("click", () => {
		if (year === yearRange.min) return;
		changesOnly = !changesOnly;
		expansionOnly = false;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	});
	el("seaLevelExpansionOnly").addEventListener("click", () => {
		if (year === yearRange.min) return;
		expansionOnly = !expansionOnly;
		changesOnly = false;
		intervalColors = false;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	});
	el("seaLevelBandList").addEventListener("click", (e) => {
		const choice = e.target.closest("[data-sea-band-year]");
		if (!choice) return;
		const next = Number(choice.dataset.seaBandYear);
		if (!Number.isInteger(next) || next % 5 || next < yearRange.min || next > year) return;
		intervalColors = true;
		expansionOnly = false;
		selectYear(next);
		changesOnly = next > yearRange.min;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
		el("seaLevelChangesOnly").focus({ preventScroll: true });
	});
	el("seaLevelFocusChange").addEventListener("click", () => {
		const center = map.getCenter();
		const points = [...records.values()].flatMap((set) => [...set].filter((r) => r.revision === revision && !r.error && (changesOnly ? r.stepPixel : r.expansionPixel) >= 0).map((r) => {
			const pixel = changesOnly ? r.stepPixel : r.expansionPixel;
			const n = 2 ** r.coords.z, lng = (r.coords.x + (pixel % 256 + .5) / 256) / n * 360 - 180;
			const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * (r.coords.y + (Math.floor(pixel / 256) + .5) / 256) / n))) * 180 / Math.PI;
			const dx = ((lng - center.lng + 540) % 360 - 180) * Math.cos(center.lat * Math.PI / 180);
			return {
				lat,
				lng,
				distance: dx * dx + (lat - center.lat) ** 2
			};
		})).sort((a, b) => a.distance - b.distance);
		if (points.length) {
			expansionOnly = !changesOnly;
			intervalColors = false;
			compareBaseline = false;
			updateSelection();
			map.setView([points[0].lat, points[0].lng], Math.max(16, map.getZoom()), { animate: false });
			panel.scrollTop = 0;
			section.scrollIntoView({ block: "start" });
		}
	});
	el("seaLevelCompare").addEventListener("click", () => {
		compareBaseline = !compareBaseline;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
		if (compareBaseline) el("seaLevelBack").focus({ preventScroll: true });
	});
	el("seaLevelHighlight").addEventListener("click", () => {
		intervalColors = !intervalColors;
		expansionOnly = false;
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
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	});
	el("seaLevelRetry").addEventListener("click", () => {
		if (!data || !worker) setEnabled(true);
		else if (regionError) refreshRegion(true);
		else updateSelection();
	});
	el("seaLevelZoom").addEventListener("click", () => {
		map.setZoom(13);
		panel.scrollTop = 0;
	});
	function focusPlace(place) {
		if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) return;
		compareBaseline = false;
		changesOnly = false;
		expansionOnly = false;
		intervalColors = false;
		experiment = "";
		map.closePopup();
		el("seaLevelPlace").value = place.id || "";
		const b = place.bbox;
		if (Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[1] > b[0] && b[3] > b[2]) map.fitBounds([[b[0], b[2]], [b[1], b[3]]], {
			padding: [24, 24],
			maxZoom: 13,
			animate: false
		});
		else map.setView([place.lat, place.lng], 13, { animate: false });
		el("seaLevelLocationNote").hidden = !place.name;
		el("seaLevelLocationNote").textContent = place.name ? `살펴보는 지역: ${place.name} · 국가 전체가 한 번에 침수 계산되는 것은 아닙니다. 해안을 확대해 비교하세요.` : "";
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
		if (enabled) {
			refreshRegion();
			updateSelection();
		}
	}
	el("seaLevelPlace").addEventListener("change", (e) => {
		const place = SEA_COASTS.find((p) => p.id === e.target.value);
		if (place) focusPlace(place);
	});
	map.on("click", (e) => {
		if (enabled && map.getZoom() < 10 && e.latlng) focusPlace({
			lat: e.latlng.lat,
			lng: e.latlng.lng
		});
	});
	map.on("zoomend moveend", () => {
		if (enabled) {
			refreshRegion();
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
	return {
		toggle: () => setEnabled(!enabled),
		open: () => setEnabled(true),
		focusPlace
	};
}
//#endregion
export { mountSeaLevel, prepareSeaLevelPanel };

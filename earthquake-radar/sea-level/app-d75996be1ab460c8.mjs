//#region public/sea-level/warming.mjs
const WARMING_SOURCE = Object.freeze({
	title: "IPCC AR6 · 표 9.10",
	url: "https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter09.pdf#page=95",
	seaLevelBaseline: "1995–2014",
	temperatureBaseline: "1850–1900",
	checked: "2026-09-11"
});
const WARMING_TEMPERATURES = Object.freeze([
	1.5,
	2,
	3,
	4,
	5
]);
const WARMING_HORIZONS = Object.freeze({
	"2050": Object.freeze({
		label: "2050년",
		year: 2050,
		timeScaleYears: null,
		confidence: "medium",
		quantiles: true
	}),
	"2100": Object.freeze({
		label: "2100년",
		year: 2100,
		timeScaleYears: null,
		confidence: "medium",
		quantiles: true
	}),
	"commitment2000": Object.freeze({
		label: "약 2,000년 규모",
		year: null,
		timeScaleYears: 2e3,
		confidence: "low",
		quantiles: false
	}),
	"commitment10000": Object.freeze({
		label: "약 10,000년 규모",
		year: null,
		timeScaleYears: 1e4,
		confidence: "low",
		quantiles: false
	})
});
const TABLE = Object.freeze(Object.fromEntries(Object.entries({
	"2050": [
		[
			.16,
			.18,
			.24
		],
		[
			.17,
			.2,
			.26
		],
		[
			.18,
			.21,
			.27
		],
		[
			.19,
			.22,
			.28
		],
		[
			.22,
			.25,
			.31
		]
	],
	"2100": [
		[
			.34,
			.44,
			.59
		],
		[
			.4,
			.51,
			.69
		],
		[
			.5,
			.61,
			.81
		],
		[
			.58,
			.7,
			.92
		],
		[
			.69,
			.81,
			1.05
		]
	],
	"commitment2000": [
		[
			2,
			null,
			3
		],
		[
			2,
			null,
			6
		],
		[
			4,
			null,
			10
		],
		[
			12,
			null,
			16
		],
		[
			19,
			null,
			22
		]
	],
	"commitment10000": [
		[
			6,
			null,
			7
		],
		[
			8,
			null,
			13
		],
		[
			10,
			null,
			24
		],
		[
			19,
			null,
			33
		],
		[
			28,
			null,
			37
		]
	]
}).map(([key, rows]) => [key, Object.freeze(rows.map((row) => Object.freeze(row)))])));
function warmingProjection(temperature, horizon) {
	const index = WARMING_TEMPERATURES.indexOf(temperature);
	if (index < 0 || !Object.hasOwn(WARMING_HORIZONS, horizon)) throw Error("원문에 없는 온도·시간 조합입니다.");
	const [lower, median, upper] = TABLE[horizon][index], profile = WARMING_HORIZONS[horizon];
	return {
		temperature,
		horizon,
		...profile,
		lower,
		median,
		upper,
		scope: "global",
		baseline: WARMING_SOURCE.seaLevelBaseline,
		temperatureDefinition: profile.year ? "2081–2100 mean warming" : "peak warming",
		interpolated: false
	};
}
function warmingTerrainLevels(projection) {
	const p = warmingProjection(projection.temperature, projection.horizon);
	if ([
		"lower",
		"median",
		"upper"
	].some((key) => p[key] !== projection[key])) throw Error("해수면 원문 수치가 일치하지 않습니다.");
	return {
		median: p.median ?? p.lower,
		upper: p.upper,
		longTerm: true
	};
}
//#endregion
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
	240,
	60,
	50,
	220
];
const LIGHT = [
	255,
	170,
	45,
	185
];
const ADDED = [
	255,
	155,
	35,
	245
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
function additionalWaterLevels(levels, metres = 0) {
	if (![
		0,
		.5,
		1,
		2
	].includes(metres)) throw Error("Invalid additional water level");
	if (levels.experiment && metres) throw Error("Cannot combine independent experiments");
	if (!metres) return { ...levels };
	return {
		...levels,
		median: levels.median + metres,
		upper: levels.upper + metres,
		lower: levels.lower + metres,
		additionalMetres: metres
	};
}
function intervalColor(year) {
	if (year === 2030) return DARK;
	const shade = (year - 2035) / 5 * 13 % 24;
	return [
		255,
		65 + Math.round(shade * 125 / 23),
		35,
		210
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
//#region public/sea-level/long-term-data.mjs
const LONG_TERM_DATA = {
	"turner": {
		"ssp126": {
			"2150": [
				.16835187898415824,
				.3046068686925505,
				1.2019323368513928,
				1.555135808769494
			],
			"2155": [
				.1698619911891814,
				.311455576908772,
				1.2428696459607633,
				1.6091562787579383
			],
			"2160": [
				.17119677803179595,
				.31815261243520154,
				1.2815145887824655,
				1.6646602435648115
			],
			"2165": [
				.1738602316514627,
				.32610772454691833,
				1.3202246759213696,
				1.7160408407636152
			],
			"2170": [
				.1768457212048582,
				.33398828679730586,
				1.3599961495019617,
				1.772705058915225
			],
			"2175": [
				.17735929650940896,
				.3409450111232966,
				1.4121008504019612,
				1.8258646488964383
			],
			"2180": [
				.18091193096393343,
				.34828017770755515,
				1.476606511313075,
				1.8803563014288098
			],
			"2185": [
				.1846168169729626,
				.35474379690041835,
				1.5320900481702506,
				1.9351213014751023
			],
			"2190": [
				.18724108428905165,
				.36355681428079994,
				1.586170889608153,
				1.9913948588497634
			],
			"2195": [
				.19054909553741828,
				.37109465973822253,
				1.6407477778371349,
				2.038517939985213
			],
			"2200": [
				.1940790159239809,
				.37854010583070574,
				1.6913375524059626,
				2.0878802558435527
			],
			"2205": [
				.1980373320642615,
				.38503491029114856,
				1.7401641889476078,
				2.14075350571079
			],
			"2210": [
				.20252326250916458,
				.39266705394541934,
				1.7913643119351534,
				2.190306201444547
			],
			"2215": [
				.20619130950714926,
				.40130392622952393,
				1.836176234234149,
				2.2332304617788976
			],
			"2220": [
				.20763389094813647,
				.40716020904610434,
				1.8772761708298504,
				2.2804826116782024
			],
			"2225": [
				.21182215437981267,
				.41516009721666414,
				1.9201880337678927,
				2.321604365227588
			],
			"2230": [
				.21471608711762658,
				.421676460145739,
				1.95968186966581,
				2.361420920281181
			],
			"2235": [
				.21672977266178967,
				.4296090916855163,
				1.9963478728750244,
				2.3955730596297817
			],
			"2240": [
				.2179615612596271,
				.437156118521998,
				2.033258102813992,
				2.4299110721140065
			],
			"2245": [
				.2200980938789115,
				.4442529120863664,
				2.071878762063967,
				2.462777569474888
			],
			"2250": [
				.22123565622530536,
				.45043666615656797,
				2.1110646844344005,
				2.495374896326354
			],
			"2255": [
				.22416443717581075,
				.4555977767687536,
				2.1501899220408904,
				2.5237572229741483
			],
			"2260": [
				.22773667114414883,
				.4631062511748467,
				2.1912305221015966,
				2.5617044057303864
			],
			"2265": [
				.22968909188087594,
				.46869978622514863,
				2.227459168501705,
				2.608758775992415
			],
			"2270": [
				.2319277985815793,
				.47498897252351524,
				2.2654867014684754,
				2.6556998040159425
			],
			"2275": [
				.23288866203958347,
				.4817536503934817,
				2.3015450607150365,
				2.6995401518894595
			],
			"2280": [
				.23531090523840012,
				.4883510081823822,
				2.347171515588614,
				2.7459994556151877
			],
			"2285": [
				.23807726481486982,
				.4938490759758414,
				2.3979421629726576,
				2.792266053111716
			],
			"2290": [
				.23874238864068043,
				.49895450746940306,
				2.4509797920194103,
				2.83432462945846
			],
			"2295": [
				.23895464896084556,
				.5044028339845346,
				2.506697939264834,
				2.879905294789013
			],
			"2300": [
				.24058216400074253,
				.5109598267243973,
				2.559675389051676,
				2.9256610497051354
			],
			"2305": [
				.2409477799181876,
				.5168810598224027,
				2.582058362235957,
				2.9590588807001343
			],
			"2310": [
				.24236335756333408,
				.5218431591418271,
				2.608519002258543,
				2.9906892639713134
			],
			"2315": [
				.24352637257107596,
				.5262352774556307,
				2.634758115984794,
				3.022183302232875
			],
			"2320": [
				.2442743889811111,
				.5310325092633175,
				2.6615345908078583,
				3.0489285933270907
			],
			"2325": [
				.24548246602747584,
				.5355710809959398,
				2.6881160778004656,
				3.0797193257771696
			],
			"2330": [
				.24623341493328926,
				.5419378673626448,
				2.7088985590178396,
				3.1035361505882566
			],
			"2335": [
				.24798051332102844,
				.5484212927660395,
				2.731036150551288,
				3.137288810157277
			],
			"2340": [
				.2526032741602302,
				.5543638434615821,
				2.753421343003548,
				3.1715752998259124
			],
			"2345": [
				.2540192473159255,
				.5583749213203825,
				2.775328120178498,
				3.2068804858611415
			],
			"2350": [
				.2571188236194366,
				.563398701910612,
				2.7966015080262467,
				3.241765745494039
			],
			"2355": [
				.2598313026407631,
				.5687655074431492,
				2.8189549000117293,
				3.2769498611899417
			],
			"2360": [
				.26202229349897616,
				.5735955818926933,
				2.8424029976139105,
				3.312025025885003
			],
			"2365": [
				.2642774790066118,
				.5792318144247842,
				2.8634419106159603,
				3.3461113509874685
			],
			"2370": [
				.2672393678303343,
				.5849910296762093,
				2.8885844810401853,
				3.3802346383141844
			],
			"2375": [
				.26828905963238114,
				.5894361323501157,
				2.914081250991628,
				3.414392704519746
			],
			"2380": [
				.2705363255412415,
				.593161802161475,
				2.9399946100462238,
				3.4492880381810727
			],
			"2385": [
				.27270321797361735,
				.5995429018857201,
				2.9681971920477555,
				3.4867880935768056
			],
			"2390": [
				.2733988764390327,
				.6057114361048701,
				2.995132579483908,
				3.520793359394136
			],
			"2395": [
				.27514144884605485,
				.6131158485783306,
				3.0193528805791745,
				3.55431614953641
			],
			"2400": [
				.2767854652843504,
				.6199520108385641,
				3.039789758261802,
				3.58757079224712
			],
			"2405": [
				.27552394093529886,
				.6242318208067148,
				3.057772992961512,
				3.620902125623787
			],
			"2410": [
				.2755435789446435,
				.6279663830768889,
				3.0772906165549,
				3.654136081621784
			],
			"2415": [
				.27715674163737025,
				.6315823232908018,
				3.1004497663363955,
				3.6869990615745474
			],
			"2420": [
				.279568030504074,
				.6347069458490335,
				3.1204274902671485,
				3.722196052790961
			],
			"2425": [
				.28266528528782614,
				.6387172236274035,
				3.143199338238534,
				3.7577865801908192
			],
			"2430": [
				.28580026193235597,
				.6429641022631444,
				3.1747982297891437,
				3.7920264369700147
			],
			"2435": [
				.2872373428830928,
				.6482289865549897,
				3.206416196676763,
				3.8259231397531828
			],
			"2440": [
				.2877717179043743,
				.6522667861289634,
				3.2350812183812843,
				3.8631878421276995
			],
			"2445": [
				.28798983290785485,
				.6561304895688524,
				3.264303519883832,
				3.898505803594416
			],
			"2450": [
				.28851728199616156,
				.6598990881398292,
				3.2950435884420983,
				3.9347779125950892
			],
			"2455": [
				.2896034733074801,
				.6653030998995408,
				3.320609958174142,
				3.970777735422115
			],
			"2460": [
				.290309975578931,
				.6704635003610115,
				3.343536301737405,
				4.007284112991724
			],
			"2465": [
				.29209586323444825,
				.6744249237268236,
				3.3683507384067246,
				4.0396201899760555
			],
			"2470": [
				.29326654702047267,
				.6771736276600935,
				3.4003176680005507,
				4.071600780491108
			],
			"2475": [
				.2927186486963959,
				.6811106640931894,
				3.4336507708577484,
				4.103943266703908
			],
			"2480": [
				.29539565548799207,
				.6842760451595884,
				3.456798427611613,
				4.1386410948826775
			],
			"2485": [
				.2960225395302375,
				.6872761828712892,
				3.4844698504250013,
				4.172140413115868
			],
			"2490": [
				.29768497777599207,
				.6891612534834509,
				3.509797565688415,
				4.204358547587022
			],
			"2495": [
				.296416088943976,
				.6907469961105202,
				3.538122388790652,
				4.236802222480767
			],
			"2500": [
				.29852262633244564,
				.6945017275747595,
				3.562885059416116,
				4.269204733514404
			]
		},
		"ssp245": {
			"2150": [
				.3279843809439025,
				.5208132029102315,
				1.6637996421413828,
				2.155564186746903
			],
			"2155": [
				.3382182229891073,
				.5416687759626511,
				1.737444649157018,
				2.2606938836678268
			],
			"2160": [
				.3511516420753544,
				.5616088949427884,
				1.8143498207475666,
				2.367993670410904
			],
			"2165": [
				.36277062195229304,
				.5829259689259336,
				1.8922565846212762,
				2.4644605327173705
			],
			"2170": [
				.37541727258002777,
				.6017146187315374,
				1.9687007745923113,
				2.558745060834382
			],
			"2175": [
				.3855408474711346,
				.6227282536560648,
				2.0426839150021454,
				2.6528846097498713
			],
			"2180": [
				.3993655690768001,
				.6451739150763165,
				2.119046000044638,
				2.7526042556452164
			],
			"2185": [
				.41324392194040116,
				.6641223323953358,
				2.1919260853712492,
				2.847124241925121
			],
			"2190": [
				.4270300742705766,
				.6863757538475246,
				2.2688416353448284,
				2.94577018629289
			],
			"2195": [
				.4400837123453905,
				.7073656958713381,
				2.3422581974575323,
				3.0478727644623764
			],
			"2200": [
				.45340798792369097,
				.729054028097203,
				2.41875685247338,
				3.145106028013695
			],
			"2205": [
				.46446699683514103,
				.7489316016939608,
				2.4951760303028205,
				3.23845769828716
			],
			"2210": [
				.4744946515821231,
				.7690010226162091,
				2.5716052493872907,
				3.340405171009624
			],
			"2215": [
				.4873133626546029,
				.7916312087239543,
				2.648802980539853,
				3.4311468924420327
			],
			"2220": [
				.49613166116945145,
				.8110836501504306,
				2.72838731540546,
				3.5219153959529543
			],
			"2225": [
				.5086247825873806,
				.8325163034821339,
				2.806576244905112,
				3.6174619021835723
			],
			"2230": [
				.5204287214117245,
				.8530669753468196,
				2.881296114314734,
				3.7098004311084676
			],
			"2235": [
				.532474865384368,
				.8736741705229257,
				2.957986172117338,
				3.7941287503092225
			],
			"2240": [
				.5411927365639891,
				.89414011257025,
				3.0360407009111867,
				3.8815526318473883
			],
			"2245": [
				.5519680415530211,
				.9127686355189351,
				3.1142609661755882,
				3.961677942588679
			],
			"2250": [
				.5641455730902432,
				.9318110829678352,
				3.195804488069414,
				4.046172834188784
			],
			"2255": [
				.5742626965710244,
				.9493684753213205,
				3.2729057532341503,
				4.11892764954456
			],
			"2260": [
				.585509037727741,
				.967693933476656,
				3.3541176035940947,
				4.196957103330059
			],
			"2265": [
				.59831379997025,
				.9850767009805828,
				3.434978957904978,
				4.272378494522263
			],
			"2270": [
				.6104342299638424,
				1.0002769968735414,
				3.514441179504304,
				4.341722707087379
			],
			"2275": [
				.6217114080220717,
				1.0177115551841278,
				3.59538818929677,
				4.407997388552248
			],
			"2280": [
				.6320555996872014,
				1.0339175496181578,
				3.67847243265967,
				4.476205768449309
			],
			"2285": [
				.6411871483190676,
				1.051197150714236,
				3.759972813738526,
				4.542116591542546
			],
			"2290": [
				.6520055304808905,
				1.067166617801412,
				3.8388758961251988,
				4.604398655869915
			],
			"2295": [
				.6634230075305383,
				1.0842263584362484,
				3.9150160460104226,
				4.658475160490501
			],
			"2300": [
				.6729890420794995,
				1.100540891632437,
				3.9948841261918138,
				4.71800900235291
			],
			"2305": [
				.6837008409245366,
				1.1132131746868927,
				4.0520439601003675,
				4.764164876461347
			],
			"2310": [
				.6943909469645191,
				1.1243537476361385,
				4.108632084764594,
				4.818864968852944
			],
			"2315": [
				.7035475286387052,
				1.136537270158906,
				4.162289549374359,
				4.883212150779893
			],
			"2320": [
				.7145134237564306,
				1.147958014056572,
				4.2180063348594015,
				4.950958690954058
			],
			"2325": [
				.7259109450109263,
				1.1588463510612634,
				4.276196357218059,
				5.017847302589009
			],
			"2330": [
				.7373473445051583,
				1.1709002280722935,
				4.33306215109852,
				5.079276349549027
			],
			"2335": [
				.747792421094333,
				1.181958669370291,
				4.3945409270751075,
				5.141363890511443
			],
			"2340": [
				.7576965319462557,
				1.1935051531246437,
				4.450764610574929,
				5.220312647993647
			],
			"2345": [
				.7679206377169265,
				1.2044370397927726,
				4.509210086690674,
				5.289919044895342
			],
			"2350": [
				.7791173357250767,
				1.2148508790850427,
				4.5713772694385675,
				5.352191127753174
			],
			"2355": [
				.7904461602591574,
				1.2274213029025567,
				4.632613548704764,
				5.409930142148003
			],
			"2360": [
				.8023528086720593,
				1.2371615095776032,
				4.693608714208465,
				5.4633923003509235
			],
			"2365": [
				.8137752051255864,
				1.2484105709229103,
				4.755716523750593,
				5.524369944063299
			],
			"2370": [
				.8233948962587854,
				1.2583796795412294,
				4.813257805434358,
				5.596013561710262
			],
			"2375": [
				.8344739373390307,
				1.2665360663196483,
				4.875642279837139,
				5.667247066212759
			],
			"2380": [
				.8448844686455104,
				1.2751405424315507,
				4.933993833696348,
				5.7369887201724
			],
			"2385": [
				.856377360969488,
				1.2864623495745127,
				4.991724414449166,
				5.807651863529305
			],
			"2390": [
				.86670825633432,
				1.2963766124488165,
				5.053020601570797,
				5.87793966337038
			],
			"2395": [
				.8780297608037545,
				1.3057456213389416,
				5.1096002109594565,
				5.951038785541907
			],
			"2400": [
				.8884515326350442,
				1.3144693314931264,
				5.1658590563333435,
				6.013356247372836
			],
			"2405": [
				.8981597609374656,
				1.3234854164843828,
				5.227550864893057,
				6.0814078833771115
			],
			"2410": [
				.9034218273034231,
				1.3327766588592647,
				5.287810668294567,
				6.157469908399749
			],
			"2415": [
				.90846601352336,
				1.3430288346270771,
				5.341056816471025,
				6.234505128272047
			],
			"2420": [
				.9143941250461521,
				1.3511003247521929,
				5.400878125597998,
				6.313095384297535
			],
			"2425": [
				.919401017358509,
				1.3599097858718476,
				5.4623486351040125,
				6.395920621359981
			],
			"2430": [
				.9242854722475942,
				1.368340434837188,
				5.520783809178605,
				6.472539577153578
			],
			"2435": [
				.9308438428468744,
				1.3770267900433983,
				5.581347113308153,
				6.555766387545786
			],
			"2440": [
				.9358400770942723,
				1.3832781632205706,
				5.644069762369866,
				6.637915964576058
			],
			"2445": [
				.9422747778468809,
				1.3877268103350469,
				5.707902389755757,
				6.718470050904472
			],
			"2450": [
				.9480767398172938,
				1.393838523999908,
				5.765633155609293,
				6.793790078854634
			],
			"2455": [
				.9542318371401366,
				1.4010004254866333,
				5.832900284482487,
				6.867958818486182
			],
			"2460": [
				.9606817769508742,
				1.407445845569495,
				5.8959146132119615,
				6.946586484759923
			],
			"2465": [
				.9664863678170876,
				1.4135140383351863,
				5.955667578770257,
				7.026460970512638
			],
			"2470": [
				.9728475327221758,
				1.4202582265473387,
				6.016375494132521,
				7.106140257566279
			],
			"2475": [
				.9773228650792584,
				1.4257814150560033,
				6.076054321080979,
				7.1865699518426736
			],
			"2480": [
				.9819375502759626,
				1.4315429393943848,
				6.139833238022692,
				7.266882805797168
			],
			"2485": [
				.9849793123082793,
				1.4348588440798737,
				6.1980133755351785,
				7.338087005152492
			],
			"2490": [
				.989427631898374,
				1.43991891772068,
				6.261847769208162,
				7.4148964975941425
			],
			"2495": [
				.9937835464438246,
				1.4450366796470286,
				6.328639066495802,
				7.493473103155134
			],
			"2500": [
				1.0000514674849308,
				1.4506602124704777,
				6.390988389694343,
				7.565409402564186
			]
		}
	},
	"ipcc": {
		"ssp126": { "2300": [
			null,
			.3,
			3.1,
			null
		] },
		"ssp585": { "2300": [
			null,
			1.7,
			6.8,
			null
		] }
	},
	"knmi": [
		{
			"label": "네덜란드",
			"sourceTime": 2300.5,
			"baseline": "1995–2014",
			"ssp126": [.5592988163878551, 1.6062699903885216],
			"ssp585": [2.1026244816687383, 5.986941519046839],
			"median": null
		},
		{
			"label": "보네르",
			"sourceTime": 2300.5,
			"baseline": "1995–2014",
			"ssp126": [.7166992094971477, 1.8598788736533893],
			"ssp585": [2.3957594565378213, 6.798030382478061],
			"median": null
		},
		{
			"label": "사바",
			"sourceTime": 2300.5,
			"baseline": "1995–2014",
			"ssp126": [.6949286031493576, 1.8769612185117457],
			"ssp585": [2.1987786626067423, 6.723194515301174],
			"median": null
		}
	]
};
//#endregion
//#region public/sea-level/long-term.mjs
const LONG_SOURCES = {
	turner: {
		label: "Turner 등 · 2150–2500년",
		baseline: "2020",
		scenarios: ["ssp126", "ssp245"],
		years: Array.from({ length: 71 }, (_, i) => 2150 + i * 5)
	},
	ipcc: {
		label: "IPCC AR6 · 2300년",
		baseline: "1995–2014",
		scenarios: ["ssp126", "ssp585"],
		years: [2300]
	}
};
const LONG_SCENARIOS = {
	ssp126: "저배출 · SSP1-2.6",
	ssp245: "중간 · SSP2-4.5",
	ssp585: "매우 높은 배출 · SSP5-8.5"
};
function longTermProjection(source, scenario, year, range = "central") {
	const profile = LONG_SOURCES[source];
	if (!profile || !profile.scenarios.includes(scenario) || !profile.years.includes(year) || !["central", "wide"].includes(range) || source === "ipcc" && range !== "central") throw Error("제공되지 않는 장기 전망 조합입니다.");
	const row = LONG_TERM_DATA[source][scenario][year];
	const lower = row[range === "wide" ? 0 : 1], upper = row[range === "wide" ? 3 : 2];
	if (!Number.isFinite(lower) || !Number.isFinite(upper) || lower > upper) throw Error("장기 전망 수치를 확인할 수 없습니다.");
	return {
		lower,
		upper,
		year,
		source,
		scenario,
		baseline: profile.baseline,
		range,
		scope: "global",
		median: null
	};
}
function longTermTerrainLevels(projection) {
	return {
		median: projection.lower,
		upper: projection.upper,
		longTerm: true
	};
}
function knmiComparisonRows() {
	return LONG_TERM_DATA.knmi;
}
//#endregion
//#region public/sea-level/elevation.mjs
const ELEVATION_SOURCES = {
	ahn: {
		label: "네덜란드 AHN · 지면 DTM 0.5m 원자료",
		datum: "NAP",
		url: "https://www.ahn.nl/kwaliteitsbeschrijving"
	},
	gsi5a: {
		label: "일본 GSI · 항공 레이저 5m 원자료",
		datum: "일본 국가 표고 기준",
		url: "https://maps.gsi.go.jp/development/ichiran.html"
	},
	gsi10: {
		label: "일본 GSI · 10m 원자료",
		datum: "일본 국가 표고 기준",
		url: "https://maps.gsi.go.jp/development/ichiran.html"
	},
	mapzen: {
		label: "Mapzen · 지역별 해상도가 다른 합성 고도",
		datum: "원자료별 높이 기준",
		url: "https://registry.opendata.aws/terrain-tiles/"
	}
};
function terrainRegion(lat, lng) {
	if (lat >= 50.72 && lat <= 53.56 && lng >= 3.2 && lng <= 7.28) return "ahn";
	if (lat >= 20 && lat < 30 && lng >= 122 && lng <= 154 || lat >= 30 && lat < 34 && lng >= 129 && lng <= 142 || lat >= 34 && lat < 38 && lng >= 130 && lng <= 142 || lat >= 38 && lat < 42 && lng >= 137 && lng <= 146 || lat >= 42 && lat <= 46 && lng >= 139 && lng <= 146) return "gsi";
	return "";
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
//#region lib/sea-warming-ui.js
const SEA_WARMING_HTML = `<div id="seaWarmingControls" hidden>
  <div class="seaLongSelects seaWarmingSelects">
    <label><span id="seaWarmingTemperatureLabel">세기말 지구 평균 온난화</span><select id="seaWarmingTemperature" aria-label="온도 상승 조건">${WARMING_TEMPERATURES.map((t) => `<option value="${t}"${t === 2 ? " selected" : ""}>+${t}°C</option>`).join("")}</select></label>
    <label>전망 시간<select id="seaWarmingHorizon" aria-label="온도별 전망 시간">${Object.entries(WARMING_HORIZONS).map(([key, p]) => `<option value="${key}"${key === "2100" ? " selected" : ""}>${p.label}</option>`).join("")}</select></label>
  </div>
  <p id="seaWarmingSummary" class="seaWarmingSummary" role="status" aria-live="polite"></p>
  <p id="seaWarmingTimeNote" class="seaLevelNote"></p>
  <p id="seaWarmingConfidence" class="seaLevelNote"></p>
  <button id="seaWarmingMap" class="seaWarmingMap" type="button" aria-pressed="false">현재 지형에 범위 비교</button>
  <p class="seaLevelNote">지도 비교는 전 지구 평균 수치를 현재 지형 높이에 대입합니다. <strong>현지 평균해수면 기준을 보정하지 않아 실제 침수 경계가 아닙니다.</strong> 미래 지형·방어시설·침하·조석·해일은 반영하지 않습니다.</p>
  <details class="seaLevelDetails"><summary>원문 수치와 검증 근거</summary>
    <p><a href="${WARMING_SOURCE.url}" target="_blank" rel="noopener">${WARMING_SOURCE.title} · 원문 1305쪽</a>의 공개 수치입니다. NASA 지역 전망과 합산하거나 기관별 값을 평균내지 않았습니다. 2026-09-11 원문 표·본문 대조.</p>
    <p>온도는 1850–1900년 대비, 해수면은 표의 1995–2014년 기준 변화량입니다. 지금보다 추가로 그만큼 더워진다는 뜻이 아닙니다. 2050·2100년은 세기말 온난화 조건에 따른 예시 전망, 수천 년 범위는 최고 온난화에 따른 장기 반응입니다.</p>
    <div class="seaWarmingTableWrap"><table class="seaLongTable"><caption>전 지구 평균 해수면 · 원문 범위(m)</caption><thead><tr><th>온도</th><th>2100년<br>중간값 (범위)</th><th>2,000년<br>범위</th></tr></thead><tbody>${WARMING_TEMPERATURES.map((t) => {
	const n = warmingProjection(t, "2100"), l = warmingProjection(t, "commitment2000");
	return `<tr><th>+${t}°C</th><td>${n.median.toFixed(2)} (${n.lower.toFixed(2)}–${n.upper.toFixed(2)})</td><td>${l.lower}–${l.upper}</td></tr>`;
}).join("")}</tbody></table></div>
    <p>2050·2100년은 17–83백분위 범위이며, 중간 신뢰도로 평가할 수 있는 과정을 반영합니다. 수천 년 범위는 낮은 신뢰도의 평가로 백분위·침수 확률이 아닙니다. 범위 상단을 가능한 최대치로 단정할 수 없습니다.</p>
    <p>수천 년 평가는 Clark 등(2016)·Van Breedam 등(2020)을 IPCC가 평가한 결과입니다. 연구별 가정 차이가 있으며, +1.5°C 장기 값은 한 연구에 근거합니다. 본문 2.3–3.1m를 앱에서 재반올림한 것이 아니라 표 9.10의 요약 범위 2–3m를 그대로 사용합니다.</p>
    <p>원문에 없는 온도·중간 연도는 보간하지 않습니다. 같은 온도라도 도달 경로와 걸리는 시간에 따라 해수면 반응이 다르므로 온도 하나로 침수 시점이나 국토 침수율을 계산하지 않습니다.</p>
  </details>
</div>`;
const SEA_WARMING_CSS = `
.seaHorizon{grid-template-columns:repeat(3,minmax(0,1fr))}.seaHorizon button{padding:6px 3px;font-size:.8125rem;line-height:1.35}.seaHorizon small{display:block;font-size:.6875rem}.seaWarmingSelects{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:8px}.seaWarmingSelects label{font-size:.8125rem}.seaWarmingSummary{margin:10px 0 0;color:#ffd3a2;font-size:1.125rem;font-weight:750;line-height:1.4}.seaWarmingMap{margin-top:10px;width:100%}.seaWarmingTableWrap{overflow-x:auto}.seaWarmingTableWrap td{white-space:normal}.seaWarmingTableWrap caption{text-align:left;margin:6px 0;color:#c2d8e2}#seaWarmingControls .seaLevelNote{line-height:1.55}
`;
//#endregion
//#region lib/sea-long-term-ui.js
const range = (v) => v.map((n) => n.toFixed(2)).join("–") + "m";
const SEA_HORIZON_HTML = `<div class="seaHorizon" role="group" aria-label="해수면 전망 기간"><button id="seaHorizonNear" type="button" aria-pressed="true">연도별<small>2030–2150년</small></button><button id="seaHorizonLong" type="button" aria-pressed="false">장기 연구<small>2500년까지</small></button><button id="seaHorizonWarming" type="button" aria-pressed="false">온도별<small>시간 조건 선택</small></button></div>`;
const SEA_LONG_HTML = `

<div id="seaLongControls" hidden>
  <div class="seaLevelYearHead"><label id="seaLongYearLabel" for="seaLongYear">장기 연구 · 5년 간격</label><output id="seaLongYearValue" for="seaLongYear" aria-live="polite">2300년</output></div>
  <input id="seaLongYear" type="range" min="2150" max="2500" step="5" value="2300" aria-label="장기 전망 연도">
  <div class="seaLongJumps"><button id="seaLong200" type="button">2225년</button><button id="seaLong300" type="button">2325년</button><button id="seaLongEnd" type="button">2500년</button></div>
  <p id="seaLongSummary" class="seaLongSummary" aria-live="polite"></p>
  <details class="seaLevelDetails"><summary id="seaLongSelection">자료 · 배출 · 예상 범위 선택</summary>
    <div class="seaLongSelects"><label>자료<select id="seaLongSource" aria-label="장기 전망 자료"><option value="turner">Turner 등 · 2150–2500년</option><option value="ipcc">IPCC AR6 · 2300년</option></select></label><label>배출 시나리오<select id="seaLongScenario" aria-label="장기 배출 시나리오"></select></label><label>표시 범위<select id="seaLongRange" aria-label="장기 표시 범위"><option value="central">약 17–83백분위 범위</option><option value="wide">5–95백분위 · 더 넓은 범위</option></select></label></div>
  </details>
  <p id="seaLongExplanation" class="seaLevelNote"></p>
  <details class="seaLevelDetails"><summary>KNMI 지역 전망 비교 · 2300년</summary><p>1995–2014 평균 대비 지역별 해수면 변화량입니다. 17–83백분위 범위이며 중간값은 제공되지 않습니다. 아래 수치는 비교용으로, 현재 지도의 전 지구 평균 수위를 바꾸지 않습니다.</p><table class="seaLongTable"><thead><tr><th>지역</th><th>저배출<br>SSP1-2.6</th><th>매우 높음<br>SSP5-8.5</th></tr></thead><tbody>${knmiComparisonRows().map((r) => `<tr><th>${r.label}</th><td>${range(r.ssp126)}</td><td>${range(r.ssp585)}</td></tr>`).join("")}</tbody></table><p>KNMI 원자료의 시간 좌표는 2300.5입니다. NAP 등 지형 높이 기준에 맞춘 절대 수위가 아닙니다. <a href="https://zenodo.org/records/14047707" target="_blank" rel="noopener">KNMI’23 공개 수치 · Dewi Le Bars · CC BY 4.0</a></p></details>
  <details class="seaLevelDetails"><summary>장기 자료의 근거와 한계</summary><p><a href="https://agupubs.onlinelibrary.wiley.com/doi/10.1029/2023EF003550" target="_blank" rel="noopener">Turner 등(2023)</a>의 전 지구 평균 연구입니다. 남극·그린란드 빙상, 산악빙하, 해수 열팽창, 육상 물 저장량을 포함합니다. 저자 공개 자료의 연간 값에서 5년 간격을 선택하고 최종 논문의 계산 방식으로 범위를 재현했습니다. 2300·2400·2500년은 논문 표 2와 대조했습니다. 2300년 이후에는 저자의 통계적 외삽 가정이 포함됩니다.</p><p>연구 간 차이를 포함하는 범위(p-box)이며 각 기여량이 완전히 함께 변한다고 가정한 합계입니다. 약 17–83백분위는 원자료의 16.7·83.3백분위에 해당합니다. 중간값을 임의로 만들지 않았으며, 상단은 최대 가능한 수위나 해당 땅의 침수 확률이 아닙니다. <a href="https://zenodo.org/records/7997863" target="_blank" rel="noopener">저자 공개 데이터</a></p><p><a href="https://www.ipcc.ch/report/ar6/wg1/downloads/report/IPCC_AR6_WGI_Chapter09.pdf" target="_blank" rel="noopener">IPCC AR6 9장</a>의 2300년 평가는 낮은 신뢰도의 장기 범위입니다. SSP1-2.6은 0.3–3.1m, SSP5-8.5는 1.7–6.8m이며 매우 큰 빙상 불안정성을 포함한 최악의 상한이 아닙니다. 중간 시나리오나 중간 연도를 새로 만들지 않았습니다.</p><p>기관마다 기준기간·가정·지역 범위가 다릅니다. NASA 지역 자료, IPCC 전 지구 평가, 2020년 기준 장기 연구를 하나의 연속 곡선으로 합산하지 않습니다. 장기 지도는 현재 지형에 전 지구 평균 상승량을 대입한 참고 시뮬레이션입니다. 미래 해안선·지역별 침수 확률을 예측하지 않으며, 현지 평균해수면 기준 보정·방어시설·침하·침식·해일·파도·미래 간척은 미반영입니다.</p></details>
</div>`;
const SEA_LONG_CSS = `
.seaLevelHead{flex-wrap:wrap}.seaLevelHead>div:first-child{max-width:calc(100% - 82px)}.seaHorizon{width:100%;flex-basis:100%;order:3;display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:4px 0 0}.seaLevelPanel [hidden]{display:none!important}.seaLongJumps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.seaLongSelects{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px}.seaLongSelects label{min-width:0}.seaLongSelects select{display:block;width:100%;min-height:44px;padding:6px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;font:inherit}.seaLongSelects select:focus-visible{outline:3px solid #a3e8ff}.seaLongSummary{margin:8px 0;font-weight:700;color:#ffd3a2}.seaLongTable{width:100%;border-collapse:collapse;font-size:.8125rem}.seaLongTable th,.seaLongTable td{text-align:left;padding:6px 3px;border-bottom:1px solid #365568}.seaLongTable td{white-space:nowrap}#seaLongYear{display:block;width:100%;min-height:32px;accent-color:#ffa24b}#seaLongControls .seaLevelYearHead label{font-size:.8125rem}
`;
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
		id: "tokyo",
		name: "일본 · 도쿄만",
		lat: 35.65,
		lng: 139.8
	},
	{
		id: "miami",
		name: "미국 · 마이애미",
		lat: 25.78,
		lng: -80.16
	}
];
const SEA_LEVEL_CSS = `${SEA_LONG_CSS}${SEA_WARMING_CSS}
.seaRiskOverlay{display:none}.seaMode .seaRiskOverlay{display:block;position:absolute;z-index:425;left:110px;bottom:calc(var(--attribution-height,40px) + 8px);max-width:calc(100% - 170px);margin:0;padding:4px 7px;border:1px solid #c49444;border-radius:6px;background:#33250feb;color:#ffe2a1;font-size:12px;line-height:1.4;pointer-events:none}.seaLevelHead h2{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.seaLevelHead .seaRiskBadge{font-size:12px;font-weight:700;color:#ffe2a1;border-bottom:1px solid #d8a354;white-space:nowrap}.seaRiskNotice{padding:9px 10px;border:1px solid #9b773d;border-radius:8px;background:#382910;color:#ffe5b3}.seaRiskNotice strong{color:#ffe5b3}.seaExtraWater{border:1px solid #856b3f!important;border-radius:8px;padding:0 9px!important;background:#1e2a2a}.seaExtraWater>summary{min-height:44px;padding:8px 0;color:#ffe1a3}.seaExtraWater .seaLevelActions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));margin-bottom:8px}.seaExtraWater .seaLevelActions button{padding:6px 3px}.seaExtraWater .seaLevelNote{margin-bottom:8px}.seaMode{scroll-margin-top:125px}.seaLevelHead{position:sticky;top:-12px;background:#091f30;z-index:2;padding:4px 0 8px}
.seaLevelPanel[hidden]{display:none!important}.seaMode{display:flex;flex-direction:column;min-height:0!important}.seaMode .mapCanvas{position:relative;inset:auto;flex:1;min-height:280px}.seaMode .timeline{display:none}.seaLevelPanel{flex:none;padding:12px 16px;background:#091f30;border-top:1px solid #458aa5;max-height:min(38dvh,340px);overflow:auto;overscroll-behavior:contain;color:#ecf8ff;font-size:.875rem;line-height:1.6}.seaLevelPanel *{box-sizing:border-box}.seaLevelHead{display:flex;align-items:center;justify-content:space-between;gap:8px}.seaLevelHead h2{font-size:1rem;margin:0}.seaWaterMeaning{display:block}.seaLevelHead small{display:block;color:#a8cddd;font-size:.75rem;line-height:1.4}.seaLevelHead>div{min-width:0}.seaLevelHead select{display:block;width:100%;max-width:300px;min-height:44px;margin-top:4px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;font:inherit;font-size:.8125rem;padding:6px}.seaLevelHead select:focus-visible{outline:3px solid #a3e8ff}.seaLevelHead>button{flex:none;white-space:nowrap}.seaLevelPanel button{min-height:44px;border:1px solid #497083;border-radius:8px;background:#113347;color:#eaf8ff;padding:8px 11px;font:inherit;cursor:pointer}.seaLevelPanel button[aria-pressed="true"]{border-color:#78d7ff;background:#175d85;color:#fff;box-shadow:inset 0 0 0 1px #78d7ff}.seaLevelPanel button:focus-visible,.seaLevelPanel input:focus-visible,.seaLevelPanel summary:focus-visible{outline:3px solid #a3e8ff;outline-offset:2px}.seaLevelGrid{display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,.85fr);gap:12px 24px;margin-top:8px}.seaLevelPanel fieldset{border:0;margin:0;padding:0;min-width:0}.seaLevelPanel legend{font-weight:700;margin-bottom:5px}.seaLevelScenarios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.seaLevelScenarios button{padding:6px 4px;font-size:.875rem}.seaLevelScenarios small{display:block;font-size:.75rem;color:#b8d5e3}.seaLevelYearHead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px}.seaLevelYearHead output{font-size:1.375rem;font-weight:800;color:#94ddff}.seaLevelPanel input[type="range"]{width:100%;height:36px;accent-color:#65cfff;cursor:pointer}.seaLevelTicks{display:flex;justify-content:space-between;color:#a8cddd;font-size:.75rem}.seaLevelMetrics{display:flex;gap:24px}.seaLevelMetrics span{display:block;color:#b4d3e0;font-size:.75rem}.seaLevelMetrics strong{font-size:1.65rem;letter-spacing:-.02em}.seaLevelKey{display:flex;align-items:center;gap:8px;margin-top:5px;font-size:.8125rem}.seaLevelSwatch{display:inline-block;width:18px;height:13px;border-radius:3px;background:#f03c32;flex:none;border:1px solid #ceeaff}.seaLevelSwatch.light{background:#ffaa2d}.seaLevelNote{color:#c2d8e2;font-size:.8125rem;margin:8px 0 0}.seaLevelNote strong{color:#f2cf8d}.seaLevelActions{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}.seaLevelStatus{font-size:.8125rem;color:#a6dded;margin:8px 0 0}.seaLevelDetails{margin-top:9px;border-top:1px solid #2f5266;padding-top:7px}.seaLevelDetails summary{min-height:36px;cursor:pointer;font-weight:700}.seaLevelDetails p{margin:6px 0}.seaLevelPanel a{color:#8ae3ff}.seaLevelTiles,.seaOverviewTiles{image-rendering:pixelated}.seaLevelPanel [hidden]{display:none!important}
.seaLevelYearSteps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:6px}.seaLevelYearSteps button{padding:6px 3px;font-weight:700;line-height:1.25}.seaLevelYearSteps button{white-space:nowrap}.seaLevelTicks{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(0,1fr) auto;gap:6px;align-items:center}.seaLevelTicks #seaLevelYearEnd{grid-column:4}.seaLevelTicks #seaLevelFocusChange{justify-self:center}.seaLevelTicks>span:nth-child(2){text-align:center}.seaLevelTicks button{justify-self:end;min-height:44px;padding:4px 8px;line-height:1.2}.seaLevelTicks small{display:block;font-size:.75rem}.seaLevelYearSteps button:disabled{opacity:.4;cursor:default}.seaLevelYearControls{padding-bottom:10px;border-bottom:1px solid #2f5266}.seaLevelYearHead label{font-weight:700}.seaLevelYearHead output{white-space:nowrap}.seaLevelVisibility{padding:8px 0}.seaLevelVisibility p{margin:0 0 8px}.seaLevelVisibility button{width:100%}.seaLevelYearHead small{display:block;color:#92e9df;font-size:.8125rem;font-weight:600;line-height:1.5}.seaLevelTicks #seaLevelExpansionOnly{justify-self:center}.seaLevelPanel button:disabled{opacity:.45;cursor:default}.seaChangesOnly .satelliteTiles,.seaChangesOnly .streetTiles{filter:brightness(.55) saturate(.4)}.seaExpansionComparison:not(.seaChangesOnly) #seaLevelDarkKey .seaLevelSwatch{background:linear-gradient(90deg,#f03c32 50%,#ff9b23 50%)}.seaChangesOnly #seaLevelDarkKey .seaLevelSwatch:not(.light){background:#ff9b23}
.seaLevelBandLegend{padding:8px 0;border-bottom:1px solid #2f5266}.seaLevelBandLegend summary{cursor:pointer;min-height:44px;padding:8px 0;color:#b9e4f3}.seaLevelBandList{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:5px;max-height:190px;overflow:auto;padding:3px}.seaLevelBandList button{display:flex;align-items:center;gap:8px;text-align:left;font-size:.8125rem}.seaLevelBandLegend .seaLevelNote{margin-top:2px}
.seaLevelYearHead{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 8px}.seaLevelYearHead>div{display:contents}.seaLevelYearHead label{grid-column:1;grid-row:1}.seaLevelYearHead output{grid-column:2;grid-row:1;line-height:1}.seaLevelYearHead small{grid-column:1/-1;grid-row:2}
.seaMode .legend{display:none}.seaMode .leaflet-control-zoom{display:flex;margin-top:60px!important}.seaMode .leaflet-control-zoom a{width:40px;height:40px;line-height:40px}.seaMode .mapActions{display:flex;justify-content:space-between;pointer-events:none}.seaMode .mapActions>*{pointer-events:auto}.seaMode #latestQuakeButton{display:none}.seaMode .placeSearch{top:12px;left:64px;right:120px}.seaMode .placeSearch>button{padding:0;font-size:.875rem}
@media(max-width:900px){.seaMode .placeSearch{top:8px;left:58px;right:102px;grid-template-columns:minmax(0,1fr) 44px}.seaMode .placeSearch input{padding-left:8px;font-size:.875rem}}
@media(max-width:600px){.seaLevelPanel{padding-top:8px!important}.seaLevelHead{padding-bottom:4px;top:-8px}.seaLevelHead h2{line-height:1.35}.seaLevelPanel:has(#seaLevelYearControls:not([hidden])) #seaLevelMode{display:none}}
@media(min-width:901px) and (min-height:600px){.seaMode .mapCanvas{height:auto;min-height:180px}.seaMode{height:100%}.seaLevelPanel{max-height:min(48dvh,380px)}}
@media(max-width:900px),(max-height:599px) and (orientation:landscape){.seaMode .mapCanvas{flex:none;height:clamp(160px,calc(100svh - 410px),360px);min-height:160px}.seaLevelPanel{padding:12px;max-height:340px}.seaLevelGrid{grid-template-columns:1fr;gap:12px}.seaLevelScenarios button{font-size:.875rem}.seaLevelHead h2{font-size:1rem}}
`;
const SEA_LEVEL_HTML = `
<section id="seaLevelPanel" class="seaLevelPanel" aria-labelledby="seaLevelTitle" hidden>
  <div class="seaLevelHead"><div><h2 id="seaLevelTitle" aria-label="잠재 침수 시뮬레이션 · 안전 판정 불가">🌊 해수면 <span class="seaRiskBadge">안전 판정 불가</span></h2><small id="seaLevelMode">미래 해수면</small><select id="seaLevelPlace" aria-label="세계 해안 예시 선택"><option value="">🌐 세계 해안 선택</option>${SEA_COASTS.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}</select></div><button id="seaLevelClose" type="button" aria-label="미래 해수면 닫기">닫기 ×</button>${SEA_HORIZON_HTML}</div>
  ${SEA_LONG_HTML}
  ${SEA_WARMING_HTML}
  <button type="button" id="seaLevelBack" hidden>연도별 시나리오로 돌아가기</button>

  <div id="seaLevelYearControls" class="seaLevelYearControls"><div class="seaLevelYearHead"><div><label for="seaLevelYear">살펴볼 연도 · 5년 간격</label><small id="seaLevelStepChange">시작 연도 · 5년 단위로 비교</small></div><output id="seaLevelYearValue" for="seaLevelYear" aria-live="polite">2030년</output></div><input id="seaLevelYear" type="range" min="2030" max="2150" step="5" value="2030" aria-valuetext="2030년"><div class="seaLevelTicks"><span id="seaLevelYearMin" hidden>2030</span><button id="seaLevelCompare" type="button" aria-label="2030년 지도와 비교" aria-pressed="false" disabled>2030 비교</button><button id="seaLevelExpansionOnly" type="button" aria-pressed="false" disabled>추가 영역만</button><button id="seaLevelFocusChange" type="button" aria-label="추가 영역만 확대" hidden>변화 확대</button><button type="button" id="seaLevelYearEnd" aria-label="마지막 예측 연도 2150년으로 이동">최대<small id="seaLevelYearEndValue">2150년</small></button></div><div class="seaLevelYearSteps" role="group" aria-label="선택 연도에서 앞으로 이동"><button type="button" data-sea-year-step="5" aria-label="5년 이후">+5년</button><button type="button" data-sea-year-step="10" aria-label="10년 이후">+10년</button><button type="button" data-sea-year-step="50" aria-label="50년 이후">+50년</button><button type="button" data-sea-year-step="100" aria-label="100년 이후">+100년</button></div></div>
  <div id="seaLevelVisibility" class="seaLevelVisibility" hidden><p>축소 화면은 <strong>해안 저지대 위치 개요</strong>입니다. 작은 후보도 찾도록 표시를 강조하며 실제 침수 면적을 뜻하지 않습니다. 해안을 누르면 상세 지형으로 확대합니다.</p><button id="seaLevelZoom" type="button">지도 중심 확대</button></div>
  <p class="seaLevelNote seaRiskNotice"><strong>현재 지형의 참고 비교 · 정밀 침수 경계가 아닙니다.</strong><br>현지 해수면 기준 미보정. 색칠이 적어도 안전하지 않으며 만조·파도·해일·염수 침투는 미반영입니다.</p>
  <details id="seaLevelWaterDetails" class="seaLevelDetails seaExtraWater"><summary>만조 설명 · 추가 수위 가상실험</summary><p class="seaLevelNote">보통 해안 침수는 간조보다 만조 때 우려됩니다. 현재 지역의 실제 간조·만조 높이와 시각은 연결하지 않았습니다. ‘기본’도 간조를 뜻하지 않습니다.</p><p class="seaLevelNote"><strong>아래 값은 사용자가 정하는 가정입니다.</strong> 선택 연도의 중간값과 예상 범위에 같은 높이를 더해 지형의 반응을 살펴봅니다. 실제 만조·해일 예측이나 발생 확률이 아닙니다.</p><div class="seaLevelActions" role="group" aria-label="추가 수위 가상실험"><button type="button" data-sea-extra="0" aria-pressed="true">기본</button><button type="button" data-sea-extra="0.5" aria-pressed="false">+0.5m</button><button type="button" data-sea-extra="1" aria-pressed="false">+1m</button><button type="button" data-sea-extra="2" aria-pressed="false">+2m</button></div><p id="seaLevelExtraNote" class="seaLevelNote" role="status">추가 수위 없음 · 실제 조석을 계산하지 않습니다.</p><p class="seaLevelNote">자료 설명: <a href="https://oceanservice.noaa.gov/facts/high-tide-flooding.html" target="_blank" rel="noopener">NOAA 만조 침수</a>. 실제 조석을 지도에 적용하려면 현지 높이 기준과 지형 높이를 맞추는 보정도 필요합니다.</p></details>
  <p id="seaLevelColorMeaning" class="seaLevelNote">색칠 = 물에 잠길 후보 육지 · 새 땅이 아닙니다</p>
  <p id="seaLevelRegion" class="seaLevelNote"></p>
  <p id="seaLevelStatus" class="seaLevelStatus" role="status" aria-live="polite"></p><button id="seaLevelRetry" type="button" hidden>자료 다시 확인</button>
  <details class="seaLevelDetails"><summary id="seaLevelTerrainQuality">사용할 지형 자료 확인 중</summary><p id="seaLevelTerrainDetail"></p><p>고도 개선 지역: 네덜란드 AHN / 일본 GSI. 다른 지역은 Mapzen을 사용합니다. 제공 범위 안의 고도 누락은 메우지 않으며, 자료 전체가 없거나 실패한 조각은 대체 출처를 표시합니다.</p></details>
  <p id="seaLevelConnectionStatus" class="seaLevelNote"></p>
  <p id="seaLevelChangeCaution" class="seaLevelNote" hidden>색칠된 곳은 계산상 새로 추가된 육지 격자입니다. 2021년 물·육지 분류와 지형 자료의 시점·오차 때문에 현재 해안선과 다를 수 있습니다.</p>
  <div id="seaLevelBandLegend" class="seaLevelBandLegend"><div id="seaLevelBandCurrent" class="seaLevelKey" aria-live="polite"></div><p class="seaLevelNote">빨강·주황 색조 = 처음 표시되는 5년 구간 · 예상 범위 상단 기준</p><details><summary>누적 색상 범례 · 구간을 누르면 따로 보기</summary><div id="seaLevelBandList" class="seaLevelBandList" role="group" aria-label="처음 표시되는 5년 구간별 색상"></div></details></div>
  <p id="seaLevelYearRange" class="seaLevelNote">NASA/IPCC 자료 · 2030~2150년. +버튼은 선택한 연도에서 이동합니다.</p>
  <p class="seaLevelNote">다른 나라·도시도 지도 검색으로 이동할 수 있습니다. 색칠은 자료가 있는 해안의 잠재 침수 후보이며, 정밀 침수 예측이 아닙니다.</p>
  <div id="seaLevelLoadRecovery" class="seaLevelActions" hidden><button id="seaLevelLoadRetry" type="button">해수면 다시 불러오기</button><button id="seaLevelReload" type="button">최신 화면으로 새로고침</button></div>
  <p id="seaLevelLocationNote" class="seaLevelNote" hidden></p>

  <div class="seaLevelGrid">
    <fieldset id="seaLevelScenarioControls"><legend>배출 시나리오</legend><div class="seaLevelScenarios"><button type="button" data-sea-scenario="ssp126" aria-pressed="false">저배출<small>SSP1-2.6</small></button><button type="button" data-sea-scenario="ssp245" aria-pressed="true">중간<small>SSP2-4.5</small></button><button type="button" data-sea-scenario="ssp370" aria-pressed="false">고배출<small>SSP3-7.0</small></button></div></fieldset>
    <div><div class="seaLevelMetrics" aria-live="polite" aria-atomic="true"><div><span id="seaLevelMedianLabel">중간값 · 50백분위</span><strong id="seaLevelMedian">—</strong></div><div id="seaLevelUpperMetric"><span id="seaLevelUpperLabel">예상 범위 상단 · 83백분위</span><strong id="seaLevelUpper">—</strong></div></div><div class="seaLevelKey" id="seaLevelDarkKey"><i class="seaLevelSwatch" aria-hidden="true"></i><span id="seaLevelDarkLegend">빨강: 중간값 기준 잠재 침수 지역</span></div><div class="seaLevelKey" id="seaLevelUpperLegend"><i class="seaLevelSwatch light" aria-hidden="true"></i><span id="seaLevelUpperLegendText">주황: 예상 범위 상단에서 바다와 연결되는 후보</span></div><p id="seaLevelBasis" class="seaLevelNote">IPCC 기준값을 확인하고 있습니다.</p></div>
  </div>
  <div id="seaLevelComparison" class="seaLevelComparison"><p id="seaLevelChange" class="seaLevelNote" aria-live="polite"></p><div class="seaLevelActions"><button id="seaLevelHighlight" type="button" aria-pressed="false">5년 구간 색상 보기</button><button id="seaLevelChangesOnly" type="button" aria-pressed="false" disabled>직전 5년 변화만</button></div></div>
  <p class="seaLevelNote"><strong>확정 침수 예측이 아닙니다.</strong> 빨강·주황은 주어진 수위에서 바다까지 지형상 경로가 이어지는 후보 육지입니다. 회색 빗금은 수위 이하이지만 연결을 확인하지 못한 저지대입니다. 방파제·조수·폭풍해일·미래 지반침하와 현지 높이 기준 보정은 반영하지 않습니다.</p>
  <details class="seaLevelDetails"><summary>작은 섬인데 왜 잠기는 색이 적나요?</summary><p>몰디브·투발루 같은 좁은 섬은 지형 해상도와 물·육지 경계 제외 때문에 낮은 땅을 놓칠 수 있습니다. 색칠이 없다고 안전하지 않습니다. 만조·파도·폭풍해일·지하수 침수는 이 지도에 포함하지 않으며, 반복 침수 위험과 나라 전체의 영구 침수는 다릅니다.</p><p><a href="https://sealevel.nasa.gov/data_tools/19/" target="_blank" rel="noopener">NASA 태평양 섬 만조 침수 분석</a>에서 지원 지역의 침수 빈도와 상세 지도를 함께 확인하세요.</p></details><details id="seaLevelReadingDetails" class="seaLevelDetails"><summary>색상과 연도 변화 읽는 법</summary><p>기본 비교에서 빨강은 2030년부터 연결되는 후보, 주황은 선택 연도까지 새로 연결되는 후보입니다. ‘추가 영역만’은 새로 연결된 곳만 보여 줍니다. 회색 빗금 구역은 연결 시점을 확인할 수 없어 추가 영역 비교에서 제외합니다.</p><p>5년 구간 색상은 계산상 경로가 처음 연결되는 연도에 고정됩니다. 실제 침수 시점이나 확률이 아닙니다. 연도 옆 ‘추가 N칸’은 불러온 지도 조각 전체의 계산 격자 수이며 화면 밖 일부도 포함합니다. 실제 침수 면적이나 정확도가 아니고, 지도 이동·배율에 따라 달라집니다. 수위가 조금 높아져도 면적이 그대로일 수 있고, 낮은 땅을 가로막던 지형을 넘을 때 한꺼번에 넓어질 수도 있습니다. 미래 위성사진이나 확정 해안선을 표시하는 기능이 아닙니다.</p></details>
  <details id="seaLevelIceDetails" class="seaLevelDetails"><summary>별도 가상실험 · 빙하가 모두 녹는다면</summary><p class="seaLevelNote">선택한 연도의 예측이 아닙니다. 각 수위를 따로 적용하며 서로 합산하지 않습니다.</p><div class="seaLevelActions"><button type="button" data-sea-experiment="thwaites" aria-pressed="false">스웨이츠 빙하 +0.65m</button><button type="button" data-sea-experiment="westAntarctic" aria-pressed="false">서남극 전체 +3.3m</button><button type="button" data-sea-experiment="allIce" aria-pressed="false">모든 육상빙하 +70m</button></div><p class="seaLevelNote">+70m는 남극·그린란드 빙상을 포함한 육상 얼음 전체의 대략적인 해수면 환산량을 가정한 실험입니다.</p></details>
  <details class="seaLevelDetails"><summary>자료 출처와 계산 한계</summary><p>해수면: <a href="https://sealevel.nasa.gov/ipcc-ar6-sea-level-projection-tool/" target="_blank" rel="noopener">NASA IPCC AR6 자료</a> · 지역별 상대 해수면(지도 중심 1° 격자), 중간 신뢰도, 1995–2014 평균 대비. 지역 자료가 없거나 요청이 실패하면 전 지구 평균으로 전환하고 화면에 표시합니다. 격자 사이 공간 보간은 하지 않으며, 인접 격자 이동 시 수치가 달라질 수 있습니다. 중간값은 50백분위, 예상 범위는 17~83백분위입니다. 상단은 가능한 최대값이나 지역별 침수 확률이 아닙니다. 2030~2150년의 10년 간격 원자료 사이를 선형 보간합니다.</p><p>축소 개요는 Mapzen의 줌 6 저해상도 고도와 Natural Earth 1:1,000만 육지를 사용합니다. 4×4 격자에서 가장 낮은 육지 표본의 위치를 표시하며 전 지구 평균 수위와 비교합니다. 바다 연결·제방·배수는 계산하지 않습니다. 좁은 섬·혼합 경계는 빠질 수 있습니다. 거친 해안선에서 바다 깊이를 육지 높이로 오인하지 않도록 개요의 음수 고도는 제외합니다. 상세 지형에서 육지로 확인한 음수 고도 후보는 유지합니다. 먼저 확인한 상세 지형은 해당 지역 수위로 다시 비교해 축소 화면에도 유지합니다. 점 크기는 실제 침수 면적과 무관합니다.</p><p>고도: 네덜란드는 <a href="https://www.ahn.nl/kwaliteitsbeschrijving" target="_blank" rel="noopener">AHN 지면 DTM</a>을 <a href="https://www.pdok.nl/ogc-webservices/-/article/actueel-hoogtebestand-nederland-ahn3-" target="_blank" rel="noopener">PDOK WCS</a>에서 받아 화면 격자로 최근접 재표본화합니다(원자료 0.5m, NAP 기준). 일본은 <a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">국토지리원 GSI</a>의 5m 항공 레이저 DEM을 우선 사용하고, 해당 조각이 없으면 10m DEM을 확인합니다. RGB에 기록된 수치 표고를 해독하며 일반 지도 이미지를 높이로 추측하지 않습니다. 자료 전체가 없거나 실패하면 다음 출처로 전환하고 화면에 알립니다. 일부 누락을 다른 고도로 섞어 메우지 않습니다. 국가별 고도 기준과 과거 평균해수면의 차이는 미보정 상태입니다. 네덜란드·일본의 상세 계산은 최대 줌 14, 그 밖은 줌 13까지이며 그 이상 확대는 같은 격자를 확대합니다. 나머지 지역: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">AWS 공개 Mapzen Terrain Tiles</a>. 물·육지 구분: <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover 2021 v200</a>의 10m급 원자료(CC BY 4.0). 바다·호수 등 상시 수역, 미분류와 물·육지가 섞인 경계 격자는 후보 육지에서 제외합니다. 알려진 물·육지 혼합 격자는 고도 조건에 따라 경로 계산에만 사용합니다. 화면용 색상을 판독하지 않고 원자료 분류값을 사용합니다. 2021년 이후 간척·해안 변화, 조간대와 분류 오차는 남습니다. 침수 높이를 정하는 고도 자료의 해상도는 10m로 개선된 것이 아닙니다.</p><p>공식 지면 DEM에서 빠지는 상시 수역은 높이를 육지로 꾸며 채우지 않고 물 경로로만 취급합니다. 호수는 바다 시작점으로 사용하지 않습니다. 상시 수역 중 Natural Earth의 거친 해안선에서 약 1km 이상 떨어진 바다를 시작점으로, 고도가 수위를 넘지 않는 상하좌우 경로를 확인합니다. 각 지도 조각과 주변 8개 조각 안에서만 계산합니다. 범위 밖으로 우회하는 경로, 미분류 지형과 자료에 잡히지 않는 제방·수문·배수관은 확인하지 못합니다. 연결 미확인은 고립이나 안전이 확정됐다는 뜻이 아닙니다. 색칠되지 않았다고 안전하다는 뜻은 아닙니다. 자료 정밀도는 지역마다 다르며 소수점 수위 표시와 지도 확대가 지형 오차를 줄여 주지는 않습니다. 고도 기준면을 기준기간의 현지 평균 해수면에 맞추는 보정도 적용하지 않았습니다.</p><p>연결 시작점: <a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/" target="_blank" rel="noopener">Natural Earth 육지 자료</a>(공개 도메인). 해안 침수 경계로 직접 사용하지 않습니다. 계산 참고: <a href="https://coast.noaa.gov/digitalcoast/tools/slr.html" target="_blank" rel="noopener">NOAA 해수면 상승 지도 작성 방법</a>. NOAA 지도는 현지 평균최고고조위(MHHW) 기준으로, 이 앱의 1995–2014 평균 대비 상승량과 그대로 합칠 수 없습니다. NOAA의 지형·조석 기준 오차를 함께 다루는 방식을 참고하되 검증되지 않은 오차값이나 신뢰도를 만들지 않습니다. 이 앱은 NOAA 침수 지도를 재현하거나 동일한 정확도를 보장하지 않습니다.</p><p>가상실험 근거: <a href="https://www.bas.ac.uk/news/grim-outlook-for-antarcticas-thwaites-glacier/" target="_blank" rel="noopener">British Antarctic Survey · 스웨이츠·서남극</a> · <a href="https://sealevel.jpl.nasa.gov/news/1302/whats-up-with-sea-level/" target="_blank" rel="noopener">NASA JPL · 육상 얼음</a>. 이 지도는 도시계획·대피 판단용 정밀 침수해석을 대신하지 않습니다.</p><p>© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium. <a href="https://doi.org/10.5281/zenodo.7254221" target="_blank" rel="noopener">Zanaga et al. (2022), ESA WorldCover 10 m 2021 v200</a> · 육지 마스크로 재표본화하여 사용.</p><p>자료 확인: 2026-09-11 · API 키와 유료 가입 없이 제공되는 공개 자료 사용.</p></details>
</section>
`;
//#endregion
//#region public/sea-level/overview.mjs
function overviewLevels(data, options) {
	if (options.longTermLevels) return { ...options.longTermLevels };
	const { scenario, year, experiment, extraWater, compareBaseline, changesOnly, expansionOnly, intervalColors } = options;
	const levels = additionalWaterLevels(selectedLevels(data, scenario, compareBaseline && !experiment ? 2030 : year, experiment), extraWater);
	if (!experiment && !extraWater) {
		levels.baselineUpper = projectionAt(data, scenario, 2030).upper;
		levels.previousUpper = projectionAt(data, scenario, Math.max(2030, year - 5)).upper;
		levels.changesOnly = changesOnly;
		levels.expansionOnly = expansionOnly;
		levels.compare = !compareBaseline && year > 2030 && !intervalColors;
		if (intervalColors && !compareBaseline) levels.bands = Array.from({ length: (year - 2030) / 5 + 1 }, (_, i) => ({
			year: 2030 + i * 5,
			upper: projectionAt(data, scenario, 2030 + i * 5).upper
		}));
	}
	return levels;
}
function overviewColor(height, levels) {
	if (!Number.isFinite(height) || height > levels.upper) return null;
	if (levels.changesOnly && height <= levels.previousUpper || levels.expansionOnly && height <= levels.baselineUpper) return null;
	if (levels.bands) return intervalColor(levels.bands.find((b) => height <= b.upper)?.year ?? 2030);
	if (levels.changesOnly || levels.expansionOnly) return ADDED;
	if (levels.compare) return height > levels.baselineUpper ? ADDED : DARK;
	return height <= levels.median ? DARK : LIGHT;
}
function validateOverview(manifest, buffer) {
	if (manifest.schema !== 2 || manifest.zoom !== 6 || !manifest.buckets || buffer.byteLength !== manifest.points * 6) throw Error("Invalid overview data");
	const values = new Uint16Array(buffer), buckets = /* @__PURE__ */ new Map();
	let count = 0;
	for (const [key, [offset, length]] of Object.entries(manifest.buckets)) {
		const [x, y] = key.split("/").map(Number);
		if (![
			x,
			y,
			offset,
			length
		].every(Number.isInteger) || x < 0 || x >= 16 || y < 0 || y >= 16 || offset !== count || length < 0 || offset + length > manifest.points) throw Error("Invalid overview bucket");
		buckets.set(key, values.subarray(offset * 3, (offset + length) * 3));
		count += length;
	}
	if (count !== manifest.points) throw Error("Incomplete overview index");
	return {
		buckets,
		points: count,
		zoom: 6
	};
}
function createOverviewReader(fetcher = fetch) {
	let promise;
	return () => promise ||= (async () => {
		const response = await fetcher("/richdisk/earthquake-radar/sea-level/overview-index-ae6ec33dde9568cf.json", { signal: AbortSignal.timeout(18e3) });
		if (!response.ok) throw Error("Overview index unavailable");
		const manifest = await response.json();
		if (!/^\/sea-level\/overview-[a-f0-9]{16}\.bin$/.test(manifest.url)) throw Error("Invalid overview URL");
		const file = await fetcher(manifest.url, { signal: AbortSignal.timeout(25e3) });
		if (!file.ok) throw Error("Overview data unavailable");
		return validateOverview(manifest, await file.arrayBuffer());
	})().catch((error) => {
		promise = null;
		throw error;
	});
}
function overviewTilePoints(index, coords) {
	const n = 2 ** coords.z, left = coords.x / n, top = coords.y / n, right = (coords.x + 1) / n, bottom = (coords.y + 1) / n;
	const parts = [];
	for (let y = Math.floor(top * 16); y < Math.ceil(bottom * 16); y++) for (let x = Math.floor(left * 16); x < Math.ceil(right * 16); x++) {
		const bucket = index.buckets.get(`${x}/${y}`);
		if (bucket) parts.push(bucket);
	}
	return {
		parts,
		left,
		top,
		right,
		bottom,
		n
	};
}
//#endregion
//#region lib/sea-level-overview.js
function mountSeaLevelOverview(map, L, onStatus = () => {}) {
	const read = createOverviewReader(), records = /* @__PURE__ */ new Set(), summaries = /* @__PURE__ */ new Map();
	let state, index, loading = false, error = false, active = false;
	const status = () => ({
		loading,
		error,
		detailRegions: summaries.size
	});
	function draw(record) {
		const ctx = record.canvas.getContext("2d");
		ctx.clearRect(0, 0, 256, 256);
		if (!active || !state?.data && !state?.options?.longTermLevels) return;
		const { coords } = record, n = 2 ** coords.z, pixels = new Uint8ClampedArray(256 * 256 * 4);
		const detail = [...summaries.values()].filter((s) => {
			const scale = 2 ** s.coords.z;
			return (s.coords.x + 1) / scale > coords.x / n && s.coords.x / scale < (coords.x + 1) / n && (s.coords.y + 1) / scale > coords.y / n && s.coords.y / scale < (coords.y + 1) / n;
		}).map((s) => ({
			...s,
			scale: 2 ** s.coords.z,
			levels: overviewLevels(s.data, state.options)
		}));
		const put = (u, v, height, levels) => {
			const color = overviewColor(height, levels);
			if (!color) return;
			const x = Math.floor((u * n - coords.x) * 256), y = Math.floor((v * n - coords.y) * 256);
			for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
				if (Math.abs(dx) + Math.abs(dy) > 1) continue;
				const px = x + dx, py = y + dy;
				if (px < 0 || py < 0 || px >= 256 || py >= 256) continue;
				pixels.set([
					color[0],
					color[1],
					color[2],
					235
				], (py * 256 + px) * 4);
			}
		};
		if (index) {
			const visible = overviewTilePoints(index, coords), levels = overviewLevels(state.data, state.options);
			for (const part of visible.parts) for (let i = 0; i < part.length; i += 3) {
				const u = (part[i] + .5) / 16384, v = (part[i + 1] + .5) / 16384;
				if (u < visible.left || u >= visible.right || v < visible.top || v >= visible.bottom) continue;
				if (detail.some((s) => u >= s.coords.x / s.scale && u < (s.coords.x + 1) / s.scale && v >= s.coords.y / s.scale && v < (s.coords.y + 1) / s.scale)) continue;
				put(u, v, (part[i + 2] - 32768) / 100, levels);
			}
		}
		for (const s of detail) for (let i = 0; i < s.points.length; i += 3) {
			const u = (s.coords.x + (s.points[i] + .5) / 256) / s.scale, v = (s.coords.y + (s.points[i + 1] + .5) / 256) / s.scale;
			if (detail.some((finer) => finer.scale > s.scale && u >= finer.coords.x / finer.scale && u < (finer.coords.x + 1) / finer.scale && v >= finer.coords.y / finer.scale && v < (finer.coords.y + 1) / finer.scale)) continue;
			put(u, v, s.points[i + 2], s.levels);
		}
		ctx.putImageData(new ImageData(pixels, 256, 256), 0, 0);
	}
	function redraw() {
		if (active) for (const record of records) draw(record);
		onStatus(status());
	}
	const layer = new (L.GridLayer.extend({ createTile(coords, done) {
		const canvas = document.createElement("canvas");
		canvas.width = canvas.height = 256;
		canvas.setAttribute("aria-hidden", "true");
		const record = {
			canvas,
			coords
		};
		canvas.seaOverviewRecord = record;
		records.add(record);
		draw(record);
		setTimeout(() => done(null, canvas), 0);
		return canvas;
	} }))({
		pane: "seaLevelPane",
		tileSize: 256,
		minZoom: 1,
		maxZoom: 9.5,
		updateWhenIdle: true,
		updateWhenZooming: false,
		keepBuffer: 0,
		className: "seaOverviewTiles",
		attribution: "해안 저지대 위치 개요 · Mapzen / Natural Earth"
	});
	layer.on("tileunload", (event) => records.delete(event.tile.seaOverviewRecord));
	function setState(next) {
		state = next;
		active = Boolean(next.enabled && Math.round(map.getZoom()) < 10);
		if (!active) {
			if (map.hasLayer(layer)) map.removeLayer(layer);
			records.clear();
			return;
		}
		if (!map.hasLayer(layer)) map.addLayer(layer);
		redraw();
		if (!index && !loading && !error) {
			loading = true;
			onStatus(status());
			read().then((value) => {
				index = value;
				error = false;
			}).catch(() => {
				error = true;
			}).finally(() => {
				loading = false;
				redraw();
			});
		}
	}
	return {
		setState,
		status,
		retry() {
			error = false;
			setState(state);
		},
		remember(coords, points, data, partial) {
			if (!data || partial || !(points instanceof Float32Array) || points.length % 3) return;
			const key = `${coords.z}/${coords.x}/${coords.y}`;
			summaries.delete(key);
			summaries.set(key, {
				coords: { ...coords },
				points,
				data
			});
			while (summaries.size > 128) summaries.delete(summaries.keys().next().value);
		}
	};
}
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
	}, stepChangeText = "", extraWater = 0;
	let compareBaseline = false, intervalColors = false, changesOnly = false, expansionOnly = false;
	let warmingView = false, warmingTemperature = 2, warmingHorizon = "2100", warmingMap = false, warmingData;
	const referenceView = () => longView || warmingView;
	const drawingEnabled = () => enabled && (!warmingView || warmingMap);
	let longView = false, longSource = "turner", longYear = 2300, longScenario = "ssp245", longRange = "central", longProjection;
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
		minZoom: 9.5,
		maxZoom: 19,
		maxNativeZoom: 13,
		updateWhenIdle: true,
		updateWhenZooming: false,
		keepBuffer: 0,
		className: "seaLevelTiles",
		attribution: "<a href=\"https://registry.opendata.aws/terrain-tiles/\" target=\"_blank\" rel=\"noopener\">Mapzen terrain</a> · <a href=\"https://www.ahn.nl/\" target=\"_blank\" rel=\"noopener\">AHN/PDOK</a> · <a href=\"https://maps.gsi.go.jp/development/ichiran.html\" target=\"_blank\" rel=\"noopener\">GSI</a> · <a href=\"https://esa-worldcover.org/en/data-access\" target=\"_blank\" rel=\"noopener\">© ESA WorldCover project 2021</a> · Natural Earth · IPCC/NASA"
	});
	layer.on("tileunload", (e) => {
		const record = e.tile.seaRecord;
		if (!record) return;
		const set = records.get(record.key);
		set?.delete(record);
		if (!set?.size) records.delete(record.key);
		schedule();
	});
	const overview = mountSeaLevelOverview(map, L, () => {
		if (enabled && Math.round(map.getZoom()) < 10) updateStatus();
	});
	function syncOverview() {
		overview.setState({
			enabled: drawingEnabled(),
			data: globalData,
			options: {
				scenario,
				year,
				experiment,
				extraWater,
				compareBaseline,
				changesOnly,
				expansionOnly,
				intervalColors,
				longTermLevels: referenceView() ? levels : null
			}
		});
	}
	function updateStatus() {
		if (!enabled) return;
		const hiddenByZoom = Math.round(map.getZoom()) < 10;
		el("seaLevelVisibility").hidden = !hiddenByZoom;
		updateTerrainQuality(hiddenByZoom);
		el("seaLevelYearControls").hidden = referenceView() || Boolean(experiment) || compareBaseline;
		el("seaLevelStepChange").textContent = stepChangeText;
		el("seaLevelStepChange").title = "추가 칸 수는 불러온 지도 조각 전체의 계산 격자 수입니다. 화면 밖 일부도 포함하며, 실제 침수 면적·확률·정확도가 아닙니다.";
		const showChangeTools = !referenceView() && year > yearRange.min && !experiment && !extraWater && !compareBaseline && data && increasingProjection(data, scenario);
		el("seaLevelFocusChange").hidden = hiddenByZoom || !showChangeTools;
		el("seaLevelChangeCaution").hidden = !(changesOnly || expansionOnly);
		el("seaLevelFocusChange").disabled = true;
		el("seaLevelZoom").hidden = !hiddenByZoom;
		if (!data && !referenceView()) {
			el("seaLevelStatus").textContent = "IPCC 기준값을 불러오는 중입니다.";
			return;
		}
		if (warmingView && !warmingMap) {
			el("seaLevelStatus").textContent = "원문 수치를 표시 중입니다. 지형 비교를 켜면 참고 색칠을 표시합니다.";
			el("seaLevelConnectionStatus").textContent = "";
			el("seaLevelRetry").hidden = true;
			paintWarmingLabels(hiddenByZoom);
			return;
		}
		if (regionLoading) {
			el("seaLevelStatus").textContent = "현재 지역의 NASA 수위 자료를 확인하고 있습니다…";
			return;
		}
		if (hiddenByZoom) {
			const info = overview.status();
			el("seaLevelStatus").textContent = info.loading ? "전 세계 해안 저지대 개요를 불러오는 중입니다. 확인한 상세 후보는 유지합니다." : info.error ? "세계 개요를 불러오지 못했습니다. 확인한 상세 후보만 표시합니다. 자료 다시 확인을 눌러 주세요." : "세계 해안 저지대 위치 개요 · 확대하면 지형별 상세 후보로 전환됩니다.";
			el("seaLevelConnectionStatus").textContent = "작은 빨강·주황 표시는 위치를 찾기 위한 강조이며 실제 면적이 아닙니다. 세계 개요는 낮은 해안 지형을 선별하며 바다 연결·방어시설을 확인한 침수 예측이 아닙니다.";
			el("seaLevelRegion").textContent = "세계 개요: 전 지구 평균 수위 사용 · 확인한 상세 지역은 해당 지역 수위로 비교";
			el("seaLevelDarkLegend").textContent = experiment ? "빨강: 가상 수위 이하 저지대 위치" : changesOnly || expansionOnly ? "주황: 비교 구간에 추가된 저지대 위치" : !extraWater && !compareBaseline && year > 2030 ? "빨강: 2030년 기준 · 주황: 이후 추가 저지대 위치" : "빨강: 중간값 이하 저지대 위치";
			el("seaLevelUpperLegendText").textContent = "주황: 예상 범위 상단 이하 저지대 위치";
			el("seaLevelColorMeaning").textContent = "축소 표시 = 저지대 위치 개요 · 실제 침수 면적 아님";
			el("seaLevelRiskOverlay").textContent = (experiment ? "빙하 가상실험 · " : extraWater ? `가정 +${extraWater}m · ` : "") + "개요 · 면적 아님";
			el("seaLevelRetry").hidden = !info.error;
			if (longView) paintLongLabels(true);
			if (warmingView) paintWarmingLabels(true);
			return;
		}
		const all = [...records.values()].map((set) => [...set][0]);
		const errors = all.filter((r) => r.error).length, pending = all.filter((r) => r.revision !== revision && !r.error).length;
		const count = all.filter((r) => r.revision === revision).reduce((sum, r) => sum + r.dark + r.light, 0);
		const unconfirmed = all.filter((r) => r.revision === revision).reduce((sum, r) => sum + (r.unconfirmed || 0), 0), partial = all.some((r) => r.partial);
		if (errors || pending || !all.length) el("seaLevelStepChange").textContent = stepChangeText + (errors ? " · 일부 표시 실패" : " · 지형 계산 중");
		el("seaLevelConnectionStatus").textContent = unconfirmed && (changesOnly || expansionOnly) ? "연결 미확인 저지대는 추가 영역 비교에서 제외했습니다. 전체 영역에서 회색 빗금으로 볼 수 있습니다." : unconfirmed ? "회색 빗금: 수위 이하지만 바다 연결을 확인하지 못한 저지대입니다. 안전하다는 뜻이 아닙니다." : "바다 연결은 주변 지형 안에서 확인합니다. 색칠되지 않은 곳의 안전을 판정하지 않습니다.";
		el("seaLevelStatus").textContent = errors ? "일부 물·육지 또는 고도 자료가 지연됩니다. 해당 구역은 표시를 보류합니다." : pending || !all.length ? "주변 지형에서 바다와 이어지는 경로를 확인하고 있습니다…" : count ? "바다 연결 후보 표시 완료" : unconfirmed ? "수위 이하 저지대는 있지만 바다 연결을 확인하지 못했습니다. 회색 빗금으로 구분했습니다." : "현재 자료에서 수위 이하의 육지를 찾지 못했습니다. 미분류·경계 혼합 격자도 제외하며, 안전 판정이 아닙니다.";
		if (!referenceView() && !errors && !pending && all.length && !experiment && !extraWater && !compareBaseline && increasingProjection(data, scenario)) {
			const stepAdded = all.reduce((sum, r) => sum + (r.stepAdded || 0), 0);
			const expansionAdded = all.reduce((sum, r) => sum + (r.expansionAdded || 0), 0);
			if (year > yearRange.min) {
				const from = changesOnly ? year - 5 : yearRange.min, changeCount = changesOnly ? stepAdded : expansionAdded;
				el("seaLevelStatus").textContent = `${from}→${year}년 갱신 완료 · ` + (changeCount ? intervalColors ? "추가 영역을 5년 구간 색상으로 표시했습니다." : "주황이 이 기간에 추가된 후보 육지입니다. ‘변화 확대’로 추가 부분만 크게 볼 수 있습니다." : "이 지형 범위에서 새로 색칠되는 격자는 없습니다. 수위 상승과 지도 면적 변화는 비례하지 않습니다.");
				el("seaLevelStepChange").textContent = stepChangeText + (partial ? " · 일부 자료 누락" : ` · 추가 ${changeCount.toLocaleString("ko-KR")}칸`);
				el("seaLevelFocusChange").disabled = !changeCount;
			} else el("seaLevelStatus").textContent += " · 시작 연도";
		}
		if (extraWater && !errors && !pending && all.length) el("seaLevelStatus").textContent = `가정 수위 +${number(extraWater)}m 계산 완료 · 실제 만조·해일 예측이 아닙니다. ` + (count ? "가정 수위에서 바다로 연결되는 후보를 표시했습니다." : "표시 후보가 없어도 안전하다고 판단할 수 없습니다.");
		if (partial && !pending) el("seaLevelStatus").textContent += " · 주변 자료 일부 누락: 연결 여부를 덜 확인했을 수 있습니다.";
		el("seaLevelRetry").hidden = !errors && !partial && !regionError;
		if (longView) paintLongLabels(false);
		if (warmingView) paintWarmingLabels(false);
	}
	function updateTerrainQuality(coarse) {
		const qualityEl = el("seaLevelTerrainQuality");
		if (coarse) {
			qualityEl.textContent = "축소 개요 · 정밀 지형 경계가 아닙니다";
			return;
		}
		const rows = [...records.values()].map((set) => [...set][0]).filter((r) => r.revision === revision && !r.error && r.quality);
		const sources = [...new Set(rows.map((r) => r.quality.source))];
		const missing = rows.reduce((n, r) => n + r.quality.missing, 0), fallback = rows.some((r) => r.quality.fallbacks?.length);
		const labels = sources.map((s) => ELEVATION_SOURCES[s]?.label).filter(Boolean);
		qualityEl.textContent = (labels.length ? labels.join(" · ") : "사용할 지형 자료 확인 중") + (missing ? " · 일부 육지 고도 없음" : "") + (fallback ? " · 미제공/실패한 자료는 다음 고도 자료 사용" : "") + " · 현지 평균해수면 기준 미보정";
		const center = map.getCenter(), nativeZoom = Math.min(Math.round(map.getZoom()), layer.options.maxNativeZoom);
		const metres = 156543.03392 * Math.cos(center.lat * Math.PI / 180) / 2 ** nativeZoom;
		el("seaLevelTerrainDetail").textContent = `계산 격자 약 ${metres.toFixed(1)}m · 물·육지 구분 10m급. 원자료 해상도와 침수 경계 정확도는 다릅니다. 고도 없는 육지는 침수·안전 어느 쪽으로도 판정하지 않습니다. ${sources.map((s) => ELEVATION_SOURCES[s]?.datum).filter(Boolean).join(" / ")} 기준 높이를 사용하며, ${longView ? LONG_SOURCES[longSource].baseline : "1995–2014"} 현지 평균해수면과의 차이를 보정하지 않은 지형 비교입니다.`;
	}
	function syncTerrainResolution() {
		const c = map.getCenter(), next = terrainRegion(c.lat, c.lng) ? 14 : 13;
		if (layer.options.maxNativeZoom !== next) {
			layer.options.maxNativeZoom = next;
			if (map.hasLayer(layer)) {
				map.removeLayer(layer);
				map.addLayer(layer);
			}
		}
	}
	function ensureWorker() {
		if (worker) return;
		if (!window.Worker || !window.OffscreenCanvas || !window.createImageBitmap) throw Error("이 브라우저는 지형 계산을 지원하지 않습니다. 최신 Safari 또는 Chrome에서 열어 주세요.");
		const activeWorker = new Worker("/richdisk/earthquake-radar/sea-level/terrain-51a90a56b2cc1387.mjs", { type: "module" });
		worker = activeWorker;
		activeWorker.onmessage = ({ data: response }) => {
			if (!drawingEnabled() || worker !== activeWorker) return;
			const set = records.get(response.key);
			if (!set) return;
			if (response.revision !== revision) return;
			if (response.type !== "tile" && response.type !== "error") return;
			if (response.type === "tile") overview.remember([...set][0].coords, response.overview, data, response.partial);
			for (const r of set) {
				if (response.type === "tile") {
					r.canvas.getContext("2d").putImageData(new ImageData(response.pixels, 256, 256), 0, 0);
					r.quality = response.quality;
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
			if (!drawingEnabled() || worker !== activeWorker) return;
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
		if (!drawingEnabled() || !data && !referenceView() || regionLoading) return;
		timer = setTimeout(() => {
			if (!drawingEnabled()) return;
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
	function resetDrawing() {
		revision++;
		for (const set of records.values()) for (const r of set) {
			r.error = false;
			r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
		}
		syncOverview();
		schedule();
		updateStatus();
	}
	function paintLongLabels(coarse) {
		if (!longProjection) return;
		el("seaLevelRegion").textContent = "전 지구 평균 상승량을 현재 지형에 대입 · 지역별 전망 아님";
		el("seaLevelDarkLegend").textContent = coarse ? "빨강: 범위 하단 이하 저지대 위치" : "빨강: 범위 하단에서 바다로 연결되는 후보";
		el("seaLevelUpperLegendText").textContent = coarse ? "주황: 범위 상단까지의 추가 저지대 위치" : "주황: 범위 상단까지 추가로 연결되는 후보";
		el("seaLevelColorMeaning").textContent = coarse ? "장기 저지대 위치 개요 · 실제 침수 면적 아님" : "장기 수위 범위와 현재 지형 비교 · 미래 해안선 아님";
		el("seaLevelRiskOverlay").textContent = `${longYear}년 · 전 지구 평균 참고${coarse ? " · 면적 아님" : ""}`;
	}
	function paintWarmingLabels(coarse) {
		if (!warmingData) return;
		const p = warmingData, inner = p.median === null ? "범위 하단" : "중간값";
		el("seaLevelRegion").textContent = "전 지구 평균 평가 · 지역별 해수면·침수 확률 아님";
		el("seaLevelDarkLegend").textContent = `빨강: ${inner} 이하 ${coarse ? "저지대 위치" : "바다 연결 후보"}`;
		el("seaLevelUpperLegendText").textContent = `주황: 범위 상단까지 ${coarse ? "추가 저지대 위치" : "추가 연결 후보"}`;
		el("seaLevelColorMeaning").textContent = warmingMap ? coarse ? "저지대 위치 개요 · 실제 침수 면적 아님" : "현재 지형과 수치 비교 · 실제 미래 해안선 아님" : "지도 색칠 꺼짐 · 원문 수치 비교";
		el("seaLevelRiskOverlay").textContent = `+${p.temperature}°C · ${p.label} · ${warmingMap ? "지형 참고 / 현지 수위 미보정" : "수치만 표시"}`;
	}
	function updateWarmingSelection() {
		warmingData = warmingProjection(warmingTemperature, warmingHorizon);
		const p = warmingData;
		levels = warmingTerrainLevels(p);
		el("seaWarmingTemperature").value = String(p.temperature);
		el("seaWarmingHorizon").value = p.horizon;
		el("seaWarmingTemperatureLabel").textContent = p.year ? "세기말 지구 평균 온난화" : "최고 지구 평균 온난화";
		el("seaWarmingSummary").textContent = `${p.label} · 약 ${number(p.lower)}–${number(p.upper)}m${p.median === null ? "" : ` / 중간값 ${number(p.median)}m`}`;
		el("seaWarmingTimeNote").textContent = p.year ? `1850–1900년 대비 세기말(2081–2100) 평균 +${p.temperature}°C에 이르는 경로의 ${p.year}년 예시 전망입니다. ${p.year === 2050 ? "2050년에 이 온도에 도달한다는 뜻이 아닙니다." : "단년 기온이나 현재 대비 추가 상승량이 아닙니다."}` : `1850–1900년 대비 최고 온난화 +${p.temperature}°C 조건의 수천 년 반응입니다. ‘${p.timeScaleYears.toLocaleString("ko-KR")}년’은 시간 규모이며 서기 연도나 2100년 예측이 아닙니다.`;
		el("seaWarmingConfidence").textContent = p.quantiles ? "17–83백분위 · 중간 신뢰도 과정만 반영. 빙상 불안정성에 따라 상단을 넘는 결과도 가능합니다." : "낮은 신뢰도 · 제한된 연구의 평가 범위. 중간값·백분위·지역 침수 확률은 제공하지 않습니다.";
		el("seaWarmingMap").setAttribute("aria-pressed", String(warmingMap));
		el("seaWarmingMap").textContent = warmingMap ? "지형 비교 끄기" : "현재 지형에 범위 비교";
		el("seaLevelMode").textContent = `온도별 참고 · +${p.temperature}°C · ${p.label}`;
		el("seaLevelMedianLabel").textContent = p.quantiles ? "중간값 · 50백분위" : "평가 범위 하단";
		el("seaLevelUpperLabel").textContent = p.quantiles ? "범위 상단 · 83백분위" : "평가 범위 상단";
		el("seaLevelMedian").textContent = `${signed(p.median ?? p.lower)}m`;
		el("seaLevelUpper").textContent = `${signed(p.upper)}m`;
		el("seaLevelBasis").textContent = "IPCC 표 9.10 · 1995–2014 평균 대비 전 지구 변화량. 원문 수치를 그대로 사용하며 임의 보간·지역 변환·수위 합산을 하지 않습니다. 지형 비교는 현지 높이 기준 미보정입니다.";
		for (const id of [
			"seaLevelYearControls",
			"seaLevelYearRange",
			"seaLevelComparison",
			"seaLevelBack",
			"seaLevelBandLegend",
			"seaLevelChangeCaution",
			"seaLevelFocusChange"
		]) el(id).hidden = true;
		for (const id of [
			"seaLevelDarkKey",
			"seaLevelUpperLegend",
			"seaLevelUpperMetric"
		]) el(id).hidden = false;
		section.classList.toggle("seaChangesOnly", false);
		section.classList.toggle("seaExpansionComparison", false);
		if (!warmingMap) {
			clearTimeout(timer);
			worker?.terminate();
			worker = null;
			if (map.hasLayer(layer)) map.removeLayer(layer);
			records.clear();
		}
		stepChangeText = "온도·시간 조건별 원문 범위";
		resetDrawing();
	}
	function updateLongSelection() {
		const profile = LONG_SOURCES[longSource];
		longProjection = longTermProjection(longSource, longScenario, longYear, longRange);
		levels = longTermTerrainLevels(longProjection);
		el("seaLongSource").value = longSource;
		el("seaLongScenario").innerHTML = profile.scenarios.map((s) => `<option value="${s}">${LONG_SCENARIOS[s]}</option>`).join("");
		el("seaLongScenario").value = longScenario;
		el("seaLongRange").value = longRange;
		el("seaLongRange").disabled = longSource === "ipcc";
		el("seaLongYear").min = String(profile.years[0]);
		el("seaLongYear").max = String(profile.years.at(-1));
		el("seaLongYear").value = String(longYear);
		el("seaLongYear").disabled = profile.years.length === 1;
		el("seaLongYear").setAttribute("aria-valuetext", `${longYear}년 · ${profile.label}`);
		el("seaLongYearValue").textContent = `${longYear}년`;
		el("seaLongYearLabel").textContent = longSource === "ipcc" ? "IPCC 제공 기준연도" : "장기 연구 · 5년 간격";
		el("seaLong200").disabled = !profile.years.includes(2225);
		el("seaLong300").disabled = !profile.years.includes(2325);
		el("seaLongEnd").textContent = `${profile.years.at(-1)}년`;
		el("seaLongEnd").disabled = longYear === profile.years.at(-1);
		const quantiles = longRange === "wide" ? [5, 95] : [17, 83];
		el("seaLongSummary").textContent = `${signed(longProjection.lower)}–${signed(longProjection.upper)}m · ${profile.baseline}년 기준`;
		el("seaLongSelection").textContent = `${longSource === "ipcc" ? "IPCC" : "Turner 등"} · ${LONG_SCENARIOS[longScenario]} · ${quantiles.join("–")}백분위`;
		el("seaLongExplanation").textContent = longSource === "ipcc" ? "2300년 전 지구 평가 · 낮은 신뢰도. 중간값·중간 연도는 제공하지 않습니다." : "장기 연구의 예시 전망 · 2300년 이후는 저자의 외삽 가정 포함. 5년 간격은 시점을 정밀하게 예측한다는 뜻이 아닙니다.";
		el("seaLevelMode").textContent = `장기 참고: ${longYear}년 · ${LONG_SCENARIOS[longScenario]}`;
		el("seaLevelMedianLabel").textContent = `범위 하단 · ${quantiles[0]}백분위`;
		el("seaLevelUpperLabel").textContent = `범위 상단 · ${quantiles[1]}백분위`;
		el("seaLevelMedian").textContent = `${signed(longProjection.lower)}m`;
		el("seaLevelUpper").textContent = `${signed(longProjection.upper)}m`;
		el("seaLevelBasis").textContent = `${profile.baseline} 평균 대비 전 지구 변화량. 범위의 하단·상단을 각각 비교하며 중간값을 임의로 만들지 않습니다. 다른 기준기간의 자료와 합산하지 않습니다.`;
		for (const id of [
			"seaLevelYearControls",
			"seaLevelYearRange",
			"seaLevelComparison",
			"seaLevelBack",
			"seaLevelBandLegend",
			"seaLevelChangeCaution",
			"seaLevelFocusChange"
		]) el(id).hidden = true;
		for (const id of [
			"seaLevelDarkKey",
			"seaLevelUpperLegend",
			"seaLevelUpperMetric"
		]) el(id).hidden = false;
		section.classList.toggle("seaChangesOnly", false);
		section.classList.toggle("seaExpansionComparison", false);
		stepChangeText = "장기 범위 비교";
		paintLongLabels(Math.round(map.getZoom()) < 10);
		resetDrawing();
	}
	function updateSelection() {
		el("seaLongControls").hidden = !longView;
		el("seaWarmingControls").hidden = !warmingView;
		el("seaHorizonNear").setAttribute("aria-pressed", String(!referenceView()));
		el("seaHorizonLong").setAttribute("aria-pressed", String(longView));
		el("seaHorizonWarming").setAttribute("aria-pressed", String(warmingView));
		for (const id of [
			"seaLevelWaterDetails",
			"seaLevelIceDetails",
			"seaLevelReadingDetails",
			"seaLevelScenarioControls"
		]) el(id).hidden = referenceView();
		if (longView) {
			updateLongSelection();
			return;
		}
		if (warmingView) {
			updateWarmingSelection();
			return;
		}
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
		if (extraWater) {
			changesOnly = false;
			expansionOnly = false;
			intervalColors = false;
			compareBaseline = false;
		}
		if (!increasing) {
			changesOnly = false;
			expansionOnly = false;
			intervalColors = false;
		}
		if (year === yearRange.min || experiment || compareBaseline) {
			changesOnly = false;
			expansionOnly = false;
		}
		el("seaLevelChangesOnly").disabled = year === yearRange.min || !increasing || Boolean(extraWater);
		el("seaLevelChangesOnly").setAttribute("aria-pressed", String(changesOnly));
		el("seaLevelExpansionOnly").disabled = year === yearRange.min || !increasing || Boolean(extraWater);
		el("seaLevelHighlight").disabled = !increasing || Boolean(extraWater);
		el("seaLevelExpansionOnly").setAttribute("aria-pressed", String(expansionOnly));
		el("seaLevelExpansionOnly").textContent = expansionOnly ? "전체 영역 보기" : "추가 영역만";
		section.classList.toggle("seaChangesOnly", enabled && (changesOnly || expansionOnly));
		el("seaLevelYearRange").textContent = `NASA/IPCC 자료 · ${yearRange.min}~${yearRange.max}년. +버튼은 선택한 연도에서 이동합니다. 범위를 넘는 버튼은 비활성화됩니다.`;
		panel.querySelectorAll("[data-sea-scenario]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaScenario === scenario)));
		panel.querySelectorAll("[data-sea-experiment]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.seaExperiment === experiment)));
		el("seaLevelScenarioControls").disabled = Boolean(experiment);
		el("seaLevelYearControls").hidden = referenceView() || Boolean(experiment) || compareBaseline;
		el("seaLevelYearRange").hidden = Boolean(experiment) || compareBaseline;
		el("seaLevelBack").hidden = !experiment && !compareBaseline;
		el("seaLevelBack").textContent = compareBaseline ? `${year}년 지도로 돌아가기` : "연도별 시나리오로 돌아가기";
		const showBands = intervalColors && !extraWater && !experiment && !compareBaseline;
		el("seaLevelBandLegend").hidden = !showBands;
		el("seaLevelDarkKey").hidden = showBands;
		const showExpansion = increasing && year > yearRange.min && !extraWater && !experiment && !compareBaseline && !changesOnly && !showBands;
		section.classList.toggle("seaExpansionComparison", enabled && showExpansion);
		el("seaLevelUpperLegend").hidden = Boolean(experiment) || changesOnly || showBands || showExpansion;
		el("seaLevelComparison").hidden = Boolean(experiment) || Boolean(extraWater) || compareBaseline;
		el("seaLevelCompare").setAttribute("aria-pressed", String(compareBaseline));
		el("seaLevelCompare").textContent = "2030 비교";
		el("seaLevelCompare").disabled = year === yearRange.min || Boolean(extraWater);
		el("seaLevelHighlight").setAttribute("aria-pressed", String(intervalColors));
		el("seaLevelHighlight").textContent = intervalColors ? "5년 구간 색상 켜짐" : "5년 구간 색상 보기";
		if (!data) return;
		const mapYear = compareBaseline && !experiment ? 2030 : year;
		levels = additionalWaterLevels(selectedLevels(data, scenario, mapYear, experiment), extraWater);
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
		if (extraWater) stepChangeText = `가정 +${extraWater}m · 실제 만조 아님`;
		if (showBands) {
			const bands = levels.bands, current = bands.at(-1);
			const swatch = (band) => `<i class="seaLevelSwatch" style="background:rgb(${band.color.slice(0, 3).join(",")})" aria-hidden="true"></i>`;
			const label = (band) => band.year === yearRange.min ? `${band.year}년 기준` : `${band.year - 5}–${band.year}년 추가`;
			el("seaLevelBandCurrent").innerHTML = `${swatch(current)}<span>${label(current)}${changesOnly ? "만 표시 중" : ""}</span>`;
			el("seaLevelBandList").innerHTML = bands.map((band) => `<button type="button" data-sea-band-year="${band.year}" aria-label="${label(band)}만 보기" aria-pressed="${changesOnly && band.year === year}">${swatch(band)}<span>${label(band)}</span></button>`).join("");
		}
		el("seaLevelUpperLegendText").textContent = "주황: 예상 범위 상단에서 바다와 연결되는 후보";
		el("seaLevelMedian").textContent = `${levels.median < 0 ? "" : "+"}${number(levels.median)}m`;
		el("seaLevelUpper").textContent = `${levels.upper < 0 ? "" : "+"}${number(levels.upper)}m`;
		el("seaLevelUpperMetric").hidden = Boolean(experiment);
		el("seaLevelMedianLabel").textContent = experiment ? "가상 수위" : compareBaseline ? "2030년 중간값 · 50백분위" : "중간값 · 50백분위";
		el("seaLevelMode").textContent = experiment ? `가상실험 · ${EXPERIMENTS[experiment].label}` : compareBaseline ? `지금 지도: 2030년 비교 기준 · ${SCENARIOS[scenario]}` : changesOnly ? `${year - 5}→${year}년 추가 · ${SCENARIOS[scenario].split(" · ")[0]}` : expansionOnly ? `2030→${year}년 추가 · ${SCENARIOS[scenario].split(" · ")[0]}` : `지금 지도: ${year}년 · ${SCENARIOS[scenario]}`;
		el("seaLevelColorMeaning").textContent = showExpansion ? expansionOnly ? "주황:2030년 이후 추가 후보" : "빨강:2030 · 주황:이후 추가" : changesOnly ? "색칠:직전 5년 추가 후보" : "색칠 = 물에 잠길 후보 육지 · 새 땅이 아닙니다";
		el("seaLevelRegion").textContent = regionLoading ? "현재 지역 자료 확인 중 · 이전 지역의 색칠은 숨겼습니다." : experiment ? "가상 수위 실험 · 지역별 예측과 별개" : data.scope === "regional" ? `NASA 지역 자료 적용 · 지도 중심 격자 ${data.grid.lat}°, ${data.grid.lon}°` : regionError ? "이 지역의 수위 자료를 받지 못해 전 지구 평균을 사용 중입니다." : "전 지구 평균 자료 사용 중";
		el("seaLevelBasis").textContent = experiment ? "발생 연도·발생 가능성을 정하지 않은 독립 실험입니다. 연도별 시나리오에 더하지 않으며, 빙하 실험끼리도 합산하지 않습니다." : `1995–2014 평균 대비 ${data.scope === "regional" ? "지도 중심 1° 격자의 지역별 상대" : "전 지구 평균"} 해수면 변화량. ${levels.interpolated ? `${levels.anchors[0]}·${levels.anchors[1]}년 IPCC 기준값 사이를 선형 보간한 추정치입니다.` : "이 연도는 NASA가 제공하는 IPCC 기준값입니다. 5년 사이 값은 기준연도 사이를 보간합니다."}${!increasing ? " 해수면이 낮아지는 구간이 있어 추가 영역·5년 색상 기능은 끕니다." : ""}`;
		el("seaLevelDarkLegend").textContent = experiment ? "빨강: 가상 수위 이하의 잠재 침수 지역" : changesOnly ? "주황: 지난 5년 새로 추가된 영역 · 예상 범위 상단 포함" : expansionOnly ? "주황: 2030년 이후 추가된 후보 육지 · 예상 범위 상단 포함" : showExpansion ? "빨강: 2030년 후보 육지 · 주황: 선택 연도까지 추가 · 모두 예상 범위 상단 포함" : "빨강: 중간값 기준 잠재 침수 지역";
		panel.querySelectorAll("[data-sea-extra]").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.seaExtra) === extraWater)));
		const overlay = el("seaLevelRiskOverlay");
		if (overlay) overlay.textContent = experiment ? "빙하 가상실험 · 실제 예측 아님" : extraWater ? `가정 +${extraWater}m · 실제 만조 아님` : "만조·파도 미반영";
		el("seaLevelExtraNote").textContent = extraWater ? `가정 +${number(extraWater)}m 적용 중 · 실제 조석·해일 예측이 아닙니다.` : "추가 수위 없음 · 실제 조석을 계산하지 않습니다.";
		el("seaLevelUpperLabel").textContent = extraWater ? "가정 합산 상단 · 83백분위 + 추가 수위" : "예상 범위 상단 · 83백분위";
		if (extraWater) {
			el("seaLevelMedianLabel").textContent = "가정 합산 중간값";
			el("seaLevelMode").textContent = `${year}년 + ${number(extraWater)}m 수위 가정`;
			el("seaLevelColorMeaning").textContent = "가정 수위에서의 후보 육지 · 실제 만조·해일 예측 아님";
			el("seaLevelDarkLegend").textContent = "빨강: 중간값에 가정 수위를 더한 후보";
			el("seaLevelBasis").textContent = `${year}년 ${data.scope === "regional" ? "지역별 상대" : "전 지구 평균"} 해수면 변화량에 +${number(extraWater)}m를 더한 민감도 실험입니다. 실제 간조·만조 높이·시각·발생 확률을 뜻하지 않습니다. 현지 높이 기준 보정, 파도·해일의 흐름, 제방과 배수는 계산하지 않습니다.`;
		}
		revision++;
		for (const set of records.values()) for (const r of set) {
			r.error = false;
			r.canvas.getContext("2d").clearRect(0, 0, 256, 256);
		}
		syncOverview();
		schedule();
		updateStatus();
	}
	async function refreshRegion(force = false) {
		if (!enabled || !globalData || referenceView()) return;
		const center = map.getCenter(), cell = Math.round(map.getZoom()) >= 10 ? regionalCell(center.lat, center.lng) : null;
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
			syncOverview();
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
				syncTerrainResolution();
				updateSelection();
				if (drawingEnabled()) {
					ensureWorker();
					if (!map.hasLayer(layer)) map.addLayer(layer);
				}
			} catch (error) {
				el("seaLevelStatus").textContent = error.message || "자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.";
				el("seaLevelRetry").hidden = false;
			}
		}
		requestAnimationFrame(() => map.invalidateSize({ pan: false }));
	}
	function selectHorizon(next) {
		if (next === "long" && longView || next === "warming" && warmingView || next === "near" && !referenceView()) return;
		longView = next === "long";
		warmingView = next === "warming";
		warmingMap = false;
		regionRevision++;
		regionKey = "";
		regionLoading = false;
		regionError = false;
		data = globalData;
		experiment = "";
		extraWater = 0;
		compareBaseline = false;
		intervalColors = false;
		changesOnly = false;
		expansionOnly = false;
		updateSelection();
		if (drawingEnabled() && (globalData || referenceView())) try {
			syncTerrainResolution();
			ensureWorker();
			if (!map.hasLayer(layer)) map.addLayer(layer);
		} catch (error) {
			el("seaLevelStatus").textContent = error.message;
			el("seaLevelRetry").hidden = false;
		}
		if (!referenceView()) refreshRegion();
		panel.scrollTop = 0;
	}
	el("seaHorizonNear").addEventListener("click", () => selectHorizon("near"));
	el("seaHorizonLong").addEventListener("click", () => selectHorizon("long"));
	el("seaHorizonWarming").addEventListener("click", () => selectHorizon("warming"));
	el("seaWarmingTemperature").addEventListener("change", (e) => {
		const next = Number(e.target.value);
		if (!warmingView || !WARMING_TEMPERATURES.includes(next)) return;
		warmingTemperature = next;
		updateSelection();
	});
	el("seaWarmingHorizon").addEventListener("change", (e) => {
		if (!warmingView || !Object.hasOwn(WARMING_HORIZONS, e.target.value)) return;
		warmingHorizon = e.target.value;
		updateSelection();
	});
	el("seaWarmingMap").addEventListener("click", () => {
		if (!warmingView) return;
		warmingMap = !warmingMap;
		updateSelection();
		if (warmingMap && enabled) try {
			syncTerrainResolution();
			ensureWorker();
			if (!map.hasLayer(layer)) map.addLayer(layer);
		} catch (error) {
			el("seaLevelStatus").textContent = error.message;
			el("seaLevelRetry").hidden = false;
		}
	});
	function selectLongYear(next) {
		if (!longView || !LONG_SOURCES[longSource].years.includes(next)) return;
		longYear = next;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	}
	el("seaLongYear").addEventListener("input", (e) => selectLongYear(Number(e.target.value)));
	el("seaLong200").addEventListener("click", () => selectLongYear(2225));
	el("seaLong300").addEventListener("click", () => selectLongYear(2325));
	el("seaLongEnd").addEventListener("click", () => selectLongYear(LONG_SOURCES[longSource].years.at(-1)));
	el("seaLongSource").addEventListener("change", (e) => {
		const next = e.target.value;
		if (!LONG_SOURCES[next]) return;
		longSource = next;
		const profile = LONG_SOURCES[next];
		if (!profile.scenarios.includes(longScenario)) longScenario = profile.scenarios[0];
		if (!profile.years.includes(longYear)) longYear = 2300;
		if (next === "ipcc") longRange = "central";
		updateSelection();
	});
	el("seaLongScenario").addEventListener("change", (e) => {
		if (!LONG_SOURCES[longSource].scenarios.includes(e.target.value)) return;
		longScenario = e.target.value;
		updateSelection();
	});
	el("seaLongRange").addEventListener("change", (e) => {
		if (!["central", "wide"].includes(e.target.value) || longSource === "ipcc") return;
		longRange = e.target.value;
		updateSelection();
	});
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
		if (extraWater || year === yearRange.min) return;
		changesOnly = !changesOnly;
		expansionOnly = false;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	});
	el("seaLevelExpansionOnly").addEventListener("click", () => {
		if (extraWater || year === yearRange.min) return;
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
		if (extraWater) return;
		compareBaseline = !compareBaseline;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
		if (compareBaseline) el("seaLevelBack").focus({ preventScroll: true });
	});
	el("seaLevelHighlight").addEventListener("click", () => {
		if (extraWater) return;
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
		extraWater = 0;
		experiment = experiment === b.dataset.seaExperiment ? "" : b.dataset.seaExperiment;
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
	}));
	panel.querySelectorAll("[data-sea-extra]").forEach((b) => b.addEventListener("click", () => {
		const next = Number(b.dataset.seaExtra);
		if (![
			0,
			.5,
			1,
			2
		].includes(next)) return;
		extraWater = next;
		experiment = "";
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	}));
	el("seaLevelBack").addEventListener("click", () => {
		experiment = "";
		compareBaseline = false;
		updateSelection();
		panel.scrollTop = 0;
		section.scrollIntoView({ block: "start" });
	});
	el("seaLevelRetry").addEventListener("click", () => {
		if (Math.round(map.getZoom()) < 10 && data) {
			overview.retry();
			return;
		}
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
		extraWater = 0;
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
		el("seaLevelLocationNote").textContent = place.name ? `살펴보는 지역: ${place.name} · 축소하면 해안 저지대 위치 개요, 확대하면 지형별 상세 후보를 표시합니다.` : "";
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
		if (enabled && Math.round(map.getZoom()) < 10 && e.latlng) focusPlace({
			lat: e.latlng.lat,
			lng: e.latlng.lng
		});
	});
	map.on("zoomend moveend", () => {
		if (enabled) {
			syncTerrainResolution();
			refreshRegion();
			syncOverview();
			schedule();
			updateSelection();
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

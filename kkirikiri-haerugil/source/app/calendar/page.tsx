"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useConditions, useKstToday } from "../../lib/use-conditions";
import { getMulTtae } from "../../lib/tide-calendar";
import { tidePointFor } from "../../lib/tide-points";
import { explainRain, explainWave, explainWind } from "../../lib/weather-feel";

type Tide = { time: string; height: number; type: "high" | "low" };
type Conditions = { tidePreview?: boolean; tideRetrievedAt?: string; weatherPreview?: boolean; sourceStatus: { tide: boolean; weather: boolean }; weather: { forecastTimes?: string[]; representativeTime?: string; rainUsesCategoryBounds?: boolean; temperature: number; wind: number; rain: number; rainProbability: number; sky: string; waveHeight: number | null; humidity: number; basis?: "OUTING_WINDOWS" | "DAY"; kind?: "forecast" | "observation" }; tides: Tide[]; location: string; referencePort: string; tideMethod?: "direct" | "coordinate" | "nearby" | "unsupported"; tideSource?: { provider: string; stationName: string; stationCode: string; correctionLocation: string; correctionMethod: string }; harborCorrected: boolean; confidence?: { tideBasis: string } };

const CALENDAR_PLACES = [
  ["gujina","꾸지나무골 해수욕장","만대항"],["sinduri","신두리 해수욕장","신두리항"],["hakampo","학암포 해수욕장","학암포항"],["iwon_dike","이원방조제","이원방조제"],["mallipo","만리포·천리포","모항항"],
  ["mongsanpo","몽산포 해수욕장","몽산포항"],["dangampo","당암포구","당암포구"],["jinsanri","진산리 갯벌체험장","진산리어촌계"],["cheongpodae","청포대 해수욕장","몽산포항"],["dalsanpo","달산포 해수욕장","몽산포항"],["kkotji","꽃지·방포 해변","방포항"],
  ["gomsom","곰섬해수욕장","마검포항"],["mageompo","마검포항·마검포해수욕장","마검포항"],["deuruni","드르니항","드르니항"],["sinjindo","신진도항","신진도항"],["baramarae","바람아래 해수욕장","영목항"],["yeonyukgyo","태안 연육교","안면대교"],["hwangdo","황도·황도항","황도항"],
  ["ganwoldo","간월도","간월도항"],["jungri","중리어촌체험마을","중리항"],["garorim","가로림만","구도항"],["beolcheonpo","벌천포해수욕장","벌천포"],["samgilpo","삼길포항","삼길포항"],["muchangpo","무창포 해수욕장","무창포항"],["doksan","보령 독산 해수욕장","무창포항"],
  ["daecheon","대천 해수욕장","대천항"],["chunjangdae","서천 춘장대 해수욕장","홍원항"],["biin","비인해변","비인해변"],["waemok","왜목마을","왜목항"],["janggohang","장고항","장고항"],["seokmun_dike","석문방조제","석문방조제"],["dobido","도비도","도비도항"],["haengdamdo","행담도","행담도"],["jebudo","제부도","제부항"],
  ["daebudo","대부도","방아머리항"],["dongmak","강화 동막해변","분오리항"],["janggyeongri","장경리 해수욕장","영흥도항"],["seonjaedo","선재도 측도","선재도항"],
  ["muui_hanagae","무의도 하나개 해수욕장","하나개항"],["masian","마시안 해변","용유항"],["byeonsan","변산해수욕장","변산해수욕장"],["seonyudo","군산 선유도","선유도항"],["mokpo","목포 갯벌","목포"],["muan","무안 도리포 갯벌","도리포항"],
] as const;


function isoDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function addDays(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00+09:00`);
  next.setDate(next.getDate() + amount);
  return isoDate(next);
}

export default function CalendarPage() {
  const today = useKstToday();
  const [initialPlace] = useState(() => {
    if (typeof window === "undefined") return { location: "gujina", name: "꾸지나무골 해수욕장" };
    const params = new URLSearchParams(window.location.search);
    let saved = "gujina";
    try { saved = localStorage.getItem("kkirikiri-last-spot") || "gujina"; } catch {}
    const requestedLocation = params.get("location") || saved;
    const location = tidePointFor(requestedLocation) || requestedLocation === "ueumdo" ? requestedLocation : "gujina";
    const knownPlace = CALENDAR_PLACES.find(item => item[0] === location);
    return { location, name: knownPlace?.[1] || "꾸지나무골 해수욕장" };
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [month, setMonth] = useState(Number(today.slice(5, 7)) - 1);
  const [location, setLocation] = useState(initialPlace.location);
  const [placeName, setPlaceName] = useState(initialPlace.name);
  const lastSupportedDate = useMemo(() => addDays(today, 365), [today]);

  const cells = useMemo(() => {
    const blanks = new Date(year, month, 1).getDay();
    const last = new Date(year, month + 1, 0).getDate();
    return [...Array.from({ length: blanks }, () => null), ...Array.from({ length: last }, (_, index) => {
      const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
      return { day: index + 1, date, mul: getMulTtae(date), beyond: date > lastSupportedDate };
    })];
  }, [year, month, lastSupportedDate]);

  const isBeyondTideRange = selectedDate > lastSupportedDate;
  const { data: conditions, loading, savedTide } = useConditions<Conditions>(location, selectedDate, !isBeyondTideRange);
  const tideData = conditions?.sourceStatus.tide ? conditions : savedTide;
  const showingSavedTide = Boolean(tideData && !conditions?.sourceStatus.tide);
  const weatherFeel = conditions?.sourceStatus.weather ? {
    wave: explainWave(conditions.weather.waveHeight, conditions.weather.kind ?? "forecast"),
    rain: explainRain(conditions.weather.rain, conditions.weather.kind ?? "forecast", conditions.weather.rainProbability ?? 0),
    wind: explainWind(conditions.weather.wind),
  } : null;
  const displayedTideBasis = tideData?.referencePort ?? tidePointFor(location)?.reference ?? "확인 중";


  function moveMonth(direction: number) {
    const next = new Date(year, month + direction, 1);
    setYear(next.getFullYear()); setMonth(next.getMonth());
    setSelectedDate(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-01`);
  }

  function goToday() {
    setYear(Number(today.slice(0, 4))); setMonth(Number(today.slice(5, 7)) - 1); setSelectedDate(today);
  }

  function changePlace(nextLocation: string) {
    const nextPlace = CALENDAR_PLACES.find(item => item[0] === nextLocation);
    setLocation(nextLocation); setPlaceName(nextPlace?.[1] ?? nextLocation);
    try { localStorage.setItem("kkirikiri-last-spot", nextLocation); } catch {}
    history.replaceState(null, "", `/calendar?location=${encodeURIComponent(nextLocation)}&name=${encodeURIComponent(nextPlace?.[1] ?? nextLocation)}`);
  }

  return <main className="calendar-page-shell">
    <header className="calendar-page-top"><Link href={`/?location=${encodeURIComponent(location)}`} aria-label="기본 화면으로 돌아가기">←</Link><img src="/kkirikiri-icon-safe-v2-192.png" width="48" height="48" alt="끼리끼리" /><div><strong>1년 물때 달력</strong><span>{placeName}</span></div></header>
    <label className="calendar-place-select"><span>📍 물때 장소</span><select value={location} onChange={event => changePlace(event.target.value)}>{!CALENDAR_PLACES.some(item => item[0] === location) && <option value={location}>{placeName} · 가까운 항구 확인 중</option>}{CALENDAR_PLACES.map(item => <option value={item[0]} key={item[0]}>{item[1]} · 가까운 항구 {item[2]}</option>)}</select></label>
    <section className="calendar-page-card">
      <button className="calendar-today-button" onClick={goToday}>오늘로 이동</button>
      <div className="calendar-month-heading"><button aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</button><strong>{year}년 {month + 1}월</strong><button aria-label="다음 달" onClick={() => moveMonth(1)}>›</button></div>
      <div className="calendar-weekdays"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span></div>
      <div className="calendar-grid">{cells.map((cell, index) => cell ? <button key={cell.date} className={`${cell.date === selectedDate ? "selected" : ""} ${cell.date === today ? "today" : ""} ${cell.beyond ? "beyond" : ""}`} onClick={() => setSelectedDate(cell.date)}><b>{cell.day}</b><small>{cell.mul}</small></button> : <span key={index} />)}</div>
      <p className="calendar-range-note">조석예보 조회 요청 · 제공 범위는 기준점에 따라 다름 · 오늘 ~ {lastSupportedDate}</p>
    </section>
    <section className={`calendar-detail-card ${loading && !conditions?.sourceStatus.weather && !tideData ? "loading" : ""}`}>
      {loading && !conditions?.sourceStatus.weather && !tideData && <div className="calendar-loading-overlay">새 날짜 불러오는 중…</div>}
      <div className="calendar-detail-title"><div><small>{placeName}</small><h2>{selectedDate} · {getMulTtae(selectedDate)}</h2></div>{loading && <span>불러오는 중…</span>}</div>
      {isBeyondTideRange ? <div className="future-limit"><b>물때·물높이는 오늘부터 1년까지 볼 수 있어요.</b><p>1년보다 먼 날짜는 음력 기준 물때만 달력에 표시됩니다.</p></div> : <>
        <h3>기준점 조석예보</h3>{showingSavedTide && <p className="accuracy-note">저장된 물때 · {loading ? "최신 자료 확인 중" : "최신 확인 실패"}</p>}{conditions?.tidePreview && <p className="accuracy-note">인근 기준항 물때 먼저 표시 · 선택지점 좌표형 자료 확인 중입니다. 확인되면 시각·높이가 갱신될 수 있어요.</p>}{tideData?.tideRetrievedAt && <p className="accuracy-note">물때 원자료 조회 {new Date(tideData.tideRetrievedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} (한국시간)</p>}{tideData?.tideMethod === "nearby" && <p className="accuracy-note">인근 기준점 예보입니다. 선택 해변의 간조 시각·높이와 차이가 있을 수 있어요.</p>}
        <div className="calendar-tide-source"><span>⚓</span><div><b>적용 물때 · {displayedTideBasis}</b><small>{tideData?.tideSource ? `자료 기준 ${tideData.tideSource.stationName} · ${tideData.tideSource.provider} · ${tideData.tideSource.stationCode} · ${tideData.tideSource.correctionMethod}` : "정확한 공식 예보지점을 불러오는 중이에요."}</small></div></div>
        {tideData ? <div className="calendar-tides">{tideData.tides.map((tide, index) => <article key={`${tide.time}-${index}`}><span>{tide.type === "high" ? "고" : "저"}</span><b>{tide.time}</b><small>{tide.height}cm</small></article>)}</div> : <p className="calendar-empty">{loading ? "공식 물높이를 확인하는 중이에요." : "이 날짜의 공식 물높이 자료가 없어요."}</p>}
        {conditions?.weather.rainUsesCategoryBounds && <p className="accuracy-note">강수 구간값은 상한으로 표시합니다. 예: 1mm 미만 → 상한 1mm.</p>}<h3>{conditions?.weather.kind === "observation" ? "과거 실제 관측 날씨" : conditions?.weatherPreview ? "선택 날짜 예보 · 물때 확인 중" : conditions?.weather.basis === "DAY" ? "선택 날짜 제공 예보" : "확인된 시간대 날씨"}</h3>{conditions?.sourceStatus.weather ? <><div className={`calendar-history-note ${conditions.weather.kind === "observation" ? "observed" : ""}`}>{conditions.weather.kind === "observation" ? "당시 저장 예보가 아니라 실제 관측 결과로 시야를 다시 계산합니다." : `예보 시각 ${(conditions.weather.forecastTimes ?? []).join(" · ") || "미확인"} (한국시간) · 기온 ${conditions.weather.representativeTime ?? "시각 미확인"} 기준 · 나머지는 표시 시간 중 최대`}</div><div className="calendar-weather"><article><span>🌡️</span><b>{conditions.weather.temperature}℃</b><small>{conditions.weather.kind === "observation" ? "평균 기온" : "기온"}</small></article><article><span>💨</span><b>{conditions.weather.wind}m/s</b><small>최대 풍속</small></article><article><span>🌧️</span><b>{conditions.weather.rain}mm</b><small>{conditions.weather.kind === "observation" ? "하루 강수" : "시간당 강수"}</small></article><article><span>🌊</span><b>{conditions.weather.waveHeight !== null ? `${conditions.weather.waveHeight}m` : "미제공"}</b><small>파고</small></article></div>{weatherFeel && <div className="weather-feel-guide compact"><div className="weather-feel-heading"><b>실제로는 이렇게 느껴져요</b><span>이 날짜 체감 설명</span></div><article className={`feel-${weatherFeel.wave.level}`}><b>〰️ 파고 {conditions.weather.waveHeight !== null ? `${conditions.weather.waveHeight}m` : "미제공"}</b><strong>{weatherFeel.wave.label}</strong><p>{weatherFeel.wave.detail}</p></article><article className={`feel-${weatherFeel.rain.level}`}><b>🌧 {conditions.weather.kind === "observation" ? "하루 누적" : "시간당"} {conditions.weather.rain}mm</b><strong>{weatherFeel.rain.label}</strong><p>{weatherFeel.rain.detail}</p></article><article className={`feel-${weatherFeel.wind.level}`}><b>💨 풍속 {conditions.weather.wind}m/s</b><strong>{weatherFeel.wind.label}</strong><p>{weatherFeel.wind.detail}</p></article><small>파고 수치가 표시된 경우에도 해상 예보의 대표값이라 해변에서는 지형·너울·바람 때문에 더 높고 세게 느껴질 수 있어요. 특보와 현장 통제가 가장 우선입니다.</small></div>}</> : <div className="future-limit weather-limit"><b>공식 날씨 자료가 없어요.</b><p>과거는 관측자료, 오늘 이후는 단기예보가 제공되면 자동으로 표시됩니다.</p></div>}
      </>}
    </section>
    <Link className="calendar-home-button" href={`/?location=${encodeURIComponent(location)}`}>기본 화면으로 돌아가기</Link>
  </main>;
}

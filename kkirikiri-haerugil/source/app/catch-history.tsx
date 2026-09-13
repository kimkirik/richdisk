"use client";

import { useState } from "react";
import { CATCH_REPORTS, CATCH_CHECKED_ON, filterCatchReports, monthlyEvidence, regionalEvidence, catchReportsCsv } from "../lib/catch-evidence";

const regions = [...new Set(CATCH_REPORTS.map(report => report.region))].sort((a,b) => a.localeCompare(b,"ko"));
const speciesOptions = [...new Set(CATCH_REPORTS.flatMap(report => report.catches.map(item => item.species)))].sort((a,b) => a.localeCompare(b,"ko"));
const years = [...new Set(CATCH_REPORTS.flatMap(report => report.caughtOn ? [report.caughtOn.slice(0,4)] : []))].sort().reverse();

export function CatchHistory({ spotId, spotName }: { spotId: string; spotName: string }) {
  const [region, setRegion] = useState("");
  const [species, setSpecies] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState(0);
  const [onlySpot, setOnlySpot] = useState(false);
  const filter = {region, species, year, month, spotId: onlySpot ? spotId : undefined};
  const reports = filterCatchReports(CATCH_REPORTS, filter);
  const months = monthlyEvidence(CATCH_REPORTS, filter);
  const comparisons = regionalEvidence(reports, species);
  const dated = reports.filter(report => report.caughtOn);
  const undated = reports.filter(report => !report.caughtOn);
  const authorCount = new Set(reports.map(report => report.author)).size;
  const clear = () => { setRegion(""); setSpecies(""); setYear(""); setMonth(0); setOnlySpot(false); };
  function download() {
    const url = URL.createObjectURL(new Blob([catchReportsCsv(reports)], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a"); link.href = url; link.download = "끼리끼리-조과기록.csv"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="content-stack catch-history">
    <section className="section-card catch-controls">
      <div className="section-title-row"><h2>지역별 조과 기록</h2><span>원문 확인 {CATCH_CHECKED_ON}</span></div>
      <p className="catch-intro">어디서, 몇 월에, 무엇을 잡았는지 공개 후기로 확인하세요.</p>
      <div className="catch-filters">
        <label>지역<select value={region} onChange={event => {setRegion(event.target.value); setOnlySpot(false);}}><option value="">전체 지역</option>{regions.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>어종<select value={species} onChange={event => setSpecies(event.target.value)}><option value="">전체 어종</option>{speciesOptions.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>출조 연도<select value={year} onChange={event => setYear(event.target.value)}><option value="">전체 연도</option>{years.map(item => <option key={item} value={item}>{item}년</option>)}</select></label>
      </div>
      <div className="catch-actions"><button type="button" aria-pressed={onlySpot} onClick={() => {setOnlySpot(!onlySpot); setRegion("");}}>선택 장소: {spotName}</button><button type="button" onClick={clear}>전체 기록 보기</button></div>
      <div className="catch-month-heading"><b>출조한 달</b><button type="button" aria-pressed={month === 0} onClick={() => setMonth(0)}>전체 시기</button></div>
      <div className="catch-months" aria-label="출조 월 선택">{months.map(item => <button type="button" key={item.month} aria-pressed={month === item.month} onClick={() => setMonth(month === item.month ? 0 : item.month)}><b>{item.month}월</b><span>{item.reports ? `${item.reports}건` : "미수집"}</span></button>)}</div>
      <p className="catch-help">숫자는 잡은 마릿수가 아닌 원문 기록 수입니다. 출조한 달이 불명확한 글은 월별 집계에서 제외합니다.</p>
    </section>

    <section className="section-card catch-results" aria-live="polite">
      <div className="section-title-row"><h2>{month ? `${month}월` : "전체 시기"} 확인 결과</h2><button type="button" className="catch-download" onClick={download} disabled={!reports.length}>표 내려받기</button></div>
      <div className="catch-stats"><div><strong>{reports.length}</strong><span>원문 기록</span></div><div><strong>{authorCount}</strong><span>작성자</span></div><div><strong>{dated.length}</strong><span>출조 월 확인</span></div></div>
      <p className="catch-evidence-note">개인이 올린 과거 조과입니다. 출조 인원·시간과 빈손 기록이 충분하지 않아 성공률이나 ‘잘 잡히는 달’을 확정할 수 없습니다.</p>
      {!reports.length && <div className="catch-empty"><b>이 조건의 확인된 기록이 아직 없습니다.</b><p>기록 없음은 안 잡힌다는 뜻이 아닙니다. 다른 달이나 전체 지역도 확인해 보세요.</p><button type="button" onClick={clear}>전체 기록 보기</button></div>}
      {comparisons.length > 0 && <div className="catch-summary-list" aria-label="지역과 월별 어종 요약">{comparisons.map(row => <article key={`${row.region}/${row.place}/${row.month}/${row.species}`}><div><b>{row.month}월 · {row.place}</b><span>{row.region} · {[...row.years].sort().join("·")}년</span></div><strong>{row.species}</strong><p>{[row.caught.size ? `잡음 ${row.caught.size}건` : "", row.poor.size ? `적은 조과 ${row.poor.size}건` : "", row.none.size ? `못 잡음 ${row.none.size}건` : "", row.observed.size ? `관찰·방생 ${row.observed.size}건` : ""].filter(Boolean).join(" · ")}</p><small>작성자 {row.authors.size}명 · 계절 판단 자료 부족</small></article>)}</div>}
      {undated.length > 0 && <p className="catch-help">출조 월 미확인 {undated.length}건은 아래 원문 목록에서만 볼 수 있습니다.</p>}
    </section>

    {reports.length > 0 && <section className="section-card catch-source-list"><h2>근거 원문 {reports.length}건</h2>{reports.map(report => <details key={report.id} className="catch-source">
      <summary><span><b>{report.place}</b><span>{report.caughtLabel}</span><small>{report.catches.filter(item => !species || item.species === species).map(item => `${item.species} ${item.result}`).join(" · ")}</small></span><span className={`catch-date-badge ${report.caughtOn ? "" : "undated"}`}>{report.caughtOn ? "출조 월 확인" : "시기 미확인"}</span></summary>
      <div className="catch-source-body"><p>{report.summary}</p><dl><div><dt>지역·방식</dt><dd>{report.region} · {report.method}</dd></div><div><dt>수량</dt><dd>{report.catches.filter(item => !species || item.species === species).map(item => <span key={item.species}>{item.species}: {item.quantity} ({item.result})</span>)}</dd></div><div><dt>날짜 근거</dt><dd>{report.dateEvidence}</dd></div>{report.conditions && <div><dt>현장 조건</dt><dd>{report.conditions}</dd></div>}<div><dt>해석 범위</dt><dd>{report.limitation}</dd></div></dl><p className="catch-byline">{report.platform} · {report.author}<br/>{report.postedLabel ?? "게시일"} {report.postedOn}</p><a href={report.url} target="_blank" rel="noopener noreferrer">{report.title} · 원문 보기 ↗</a></div>
    </details>)}</section>}

    <section className="section-card catch-method"><details><summary>어떤 자료를 집계하나요?</summary><ul><li>공개 원문에서 장소·조과·출조 시기를 확인합니다. 게시일을 출조일로 바꾸지 않습니다.</li><li>같은 글과 동행인의 조과는 중복 집계하지 않습니다. 유료 체험, 낚시·통발, 관찰·방생을 구분합니다.</li><li>마릿수는 글에 적힌 수만 옮깁니다. 사진만 보고 수량이나 정확한 종을 추정하지 않습니다.</li><li>일반 제철 설명과 광고성 포인트 안내는 실제 조과 건수에 넣지 않습니다. 현재 자료는 종합점수 가산에 사용하지 않습니다.</li><li>당근·카페 기록은 원문과 공개 공유 범위를 확인한 뒤 추가합니다. 현재는 직접 확인 가능한 공개 블로그 기록을 수록했습니다.</li></ul><p>후기 속 과거 장소·행동은 현재 출입·채취 허용을 뜻하지 않습니다.</p><p className="catch-help">카페 기록에 함께 남길 항목: 출조 날짜 / 지역·장소 / 어종 / 수량·단위(0 포함) / 인원·시간 / 채집 방식 / 물색·물때 / 원문 링크 / 공개 공유 가능 여부</p></details></section>
  </div>;
}

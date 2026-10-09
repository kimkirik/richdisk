import {LONG_TERM_DATA} from './long-term-data.mjs';

export const LONG_SOURCES = {
  turner: {label:'Turner 등 · 2150–2500년', baseline:'2020', scenarios:['ssp126','ssp245'], years:Array.from({length:71},(_,i)=>2150+i*5)},
  ipcc: {label:'IPCC AR6 · 2300년', baseline:'1995–2014', scenarios:['ssp126','ssp585'], years:[2300]}
};
export const LONG_SCENARIOS = {ssp126:'저배출 · SSP1-2.6',ssp245:'중간 · SSP2-4.5',ssp585:'매우 높은 배출 · SSP5-8.5'};

// Use only sampled source years. Never extend NASA's regional series, combine
// reference periods, or fabricate a median for an uncertainty envelope.
export function longTermProjection(source, scenario, year, range='central') {
  const profile=LONG_SOURCES[source];
  if(!profile || !profile.scenarios.includes(scenario) || !profile.years.includes(year) || !['central','wide'].includes(range) || source==='ipcc'&&range!=='central') throw Error('제공되지 않는 장기 전망 조합입니다.');
  const row=LONG_TERM_DATA[source][scenario][year];
  const lower=row[range==='wide'?0:1],upper=row[range==='wide'?3:2];
  if(!Number.isFinite(lower)||!Number.isFinite(upper)||lower>upper)throw Error('장기 전망 수치를 확인할 수 없습니다.');
  return {lower,upper,year,source,scenario,baseline:profile.baseline,range,scope:'global',median:null};
}

export function longTermTerrainLevels(projection) {
  // The existing painter calls its red threshold "median". Here it explicitly
  // represents the published LOWER bound; no statistical median is estimated.
  return {median:projection.lower,upper:projection.upper,longTerm:true};
}

export function knmiComparisonRows() {return LONG_TERM_DATA.knmi;}

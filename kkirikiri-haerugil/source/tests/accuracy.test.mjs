import test from 'node:test';
import assert from 'node:assert/strict';
import {finiteNumber, parseForecastNumber, summarizeForecast, toKmaGrid} from '../lib/conditions-accuracy.ts';
const fields={TMP:'21',WSD:'3.2',PCP:'강수없음',POP:'20',REH:'75',SKY:'1',PTY:'0',WAV:'0.5'};
const rows=(hours,override={})=>hours.flatMap(hour=>Object.entries({...fields,...override}).map(([category,fcstValue])=>({category,fcstValue,fcstTime:String(hour).padStart(2,'0')+'00',baseDate:'20260906',baseTime:'0200'})));
const low=time=>({time,type:'low',height:120});
test('null, blank and invalid numbers are missing; measured zero survives',()=>{
 for(const value of [null,undefined,'',' ',NaN,'missing']) assert.equal(finiteNumber(value),null);
 assert.equal(finiteNumber('0'),0);assert.equal(parseForecastNumber('-'),null);
 assert.equal(parseForecastNumber('강수없음'),0);assert.equal(parseForecastNumber('-999'),null);
 assert.equal(parseForecastNumber('1.0mm 미만'),1);assert.equal(parseForecastNumber('30~50mm'),50);
 assert.equal(parseForecastNumber('50mm 이상'),null);
});
test('official Taean beach coordinate resolves to the proper KMA weather grid',()=>{
 assert.deepEqual(toKmaGrid(36.9353909,126.2843977),{nx:48,ny:113});
 assert.deepEqual(toKmaGrid(37.5665,126.978),{nx:60,ny:127});
});
test('missing wind cannot silently become 2.5 m/s',()=>{
 assert.throws(()=>summarizeForecast(rows([9,10]).filter(row=>row.category!=='WSD'),[low('10:00')]),/WSD/);
 assert.throws(()=>summarizeForecast(rows([9,10],{TMP:null}),[low('10:00')]),/TMP/);
});
test('evening forecast cannot stand in for an expired morning outing',()=>{
 assert.throws(()=>summarizeForecast(rows([20,21]),[low('05:08')]),/간조 시간대/);
});
test('missing morning forecast is not labelled as morning weather; daily total remains missing',()=>{
 const weather=summarizeForecast(rows([16,17]),[low('05:08'),low('17:19')]);
 assert.deepEqual(weather.focusTimes,['17:19']);assert.deepEqual(weather.missingWindowTimes,['05:08']);
 assert.deepEqual(weather.forecastTimes,['16:00','17:00']);assert.equal(weather.representativeTime,'17:00');
 assert.equal(weather.rainDayTotal,null);assert.equal(weather.issuedAt,'20260906 0200');
});
test('midnight windows do not wrap same-day late evening into the previous day',()=>{
 assert.throws(()=>summarizeForecast(rows([23]),[low('00:30')]),/간조 시간대/);
});
test('rain daily total needs 24 hours; rainfall bounds are disclosed',()=>{
 const day=Array.from({length:24},(_,i)=>i);
 const weather=summarizeForecast(rows(day,{PCP:'1.0mm 미만'}),[low('10:00')]);
 assert.equal(weather.rain,1);assert.equal(weather.rainDayTotal,24);assert.equal(weather.rainUsesCategoryBounds,true);
 const partial=summarizeForecast(rows(day.slice(1)),[low('10:00')]);assert.equal(partial.rainDayTotal,null);
});
test('different valid hours cannot be mixed to conceal absent hourly categories',()=>{
 assert.throws(()=>summarizeForecast(rows([9,10]).filter(row=>!(row.category==='WSD'&&row.fcstTime==='1000')),[low('10:00')]),/불완전/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {readSavedTide,saveTide} from '../lib/tide-startup-cache.ts';
const now=Date.now(),date='2026-09-08';
const sample=()=>({locationId:'gujina',date,sourceStatus:{tide:true,weather:true},weather:{wind:8},score:90,tideMethod:'nearby',referencePort:'태안',tideRetrievedAt:new Date(now).toISOString(),tideSource:{provider:'국립해양조사원',stationName:'태안',stationCode:'DT_0050',correctionLocation:'꾸지나무골',correctionMethod:'인근 기준점'},tides:['04:00','10:00','16:00','22:00'].map((time,i)=>({time,height:i%2?70:620,type:i%2?'low':'high'}))});
const storage=()=>{const m=new Map();return {getItem:key=>m.get(key)??null,setItem:(key,value)=>m.set(key,value)};};
test('startup restores only the selected dated tides, never old weather or scores',()=>{
 const store=storage();saveTide(store,sample(),'gujina',date,now);const restored=readSavedTide(store,'gujina',date,now+1000);assert.equal(restored.tides[1].height,70);assert.equal(restored.weather,undefined);assert.equal(restored.score,undefined);assert.equal(restored.tideRetrievedAt,sample().tideRetrievedAt);
 assert.equal(readSavedTide(store,'sinduri',date,now),null);assert.equal(readSavedTide(store,'gujina','2026-09-09',now),null);assert.equal(readSavedTide(store,'gujina',date,now+6*3600000),null);
});
test('incomplete, provisional, wrong-date, future and malformed tide values are not saved',()=>{
 for(const value of [{...sample(),tidePreview:true},{...sample(),tides:[]},{...sample(),date:'wrong'},{...sample(),tideRetrievedAt:new Date(now+61000).toISOString()},{...sample(),tides:sample().tides.map(t=>({...t,height:null}))},{...sample(),tides:sample().tides.map(t=>({...t,time:'25:00'}))},{...sample(),tides:sample().tides.map(t=>({...t,type:'low'}))}]){
 const store=storage();assert.equal(saveTide(store,value,'gujina',date,now),null);assert.equal(readSavedTide(store,'gujina',date,now),null);
 }
});
test('blocked or corrupted browser storage cannot stop a fresh API lookup',()=>{
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 assert.equal(readSavedTide(blocked,'gujina',date,now),null);assert.equal(saveTide(blocked,sample(),'gujina',date,now),null);
 const broken={getItem:()=>'{invalid',setItem(){}};assert.equal(readSavedTide(broken,'gujina',date,now),null);
});

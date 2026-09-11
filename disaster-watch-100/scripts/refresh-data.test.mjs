import assert from 'node:assert/strict';
import test from 'node:test';
import {searchCategory,selectPool,videoTime,youtubeFilter} from './refresh-data.mjs';

const now=Date.now();
const video=(id,age,views=1)=>({youtubeId:String(id).padStart(11,'0'),category:'지진·쓰나미',publishedAt:new Date(now-age).toISOString(),originalTitle:`Earthquake ${id}`,titleKo:'지진 소식',viewCount:views,rank:Number(id)||1});

test('today filling the quota never skips the week search; newer low-view videos survive',async()=>{
  const calls=[];
  const search=async(q,c,options)=>{
    calls.push(options);
    if(options.date==='today')return Array.from({length:160},(_,i)=>video(i+1,20*36e5,999));
    if(options.date==='week')return [video(9999,5*6e4)];
    return [];
  };
  const result=await searchCategory('지진·쓰나미',['earthquake'],[],search);
  assert.deepEqual(calls.map(o=>o.date),['today','week','']);
  assert(result.videos.some(v=>v.youtubeId==='00000009999'));
  assert.equal(new Set(result.videos.map(v=>v.youtubeId)).size,result.videos.length);
});

test('ignored date filters widen to month and cached records survive partial failure',async()=>{
  const calls=[];const cached=Array.from({length:120},(_,i)=>video(i+1,365*864e5));
  const result=await searchCategory('지진·쓰나미',['earthquake'],cached,async(q,c,o)=>{
    calls.push(o.date);
    if(o.date==='month'&&o.page===1)return [video(9999,20*864e5)];
    return cached;
  });
  assert(calls.includes('month'));
  assert(result.videos.length>=120);
  assert(result.videos.some(v=>v.youtubeId==='00000009999'));
});

test('known dates and cached translations are retained; invalid/future dates are unknown',()=>{
  const previous=video(1,864e5);
  const merged=selectPool([{...previous,publishedAt:null,titleKo:'',viewCount:99}],[previous]);
  assert.equal(merged[0].publishedAt,previous.publishedAt);
  assert.equal(merged[0].titleKo,previous.titleKo);
  assert.equal(videoTime({...previous,publishedAt:'wrong'}),0);
  assert.equal(videoTime({...previous,publishedAt:new Date(now+864e5).toISOString()}),0);
  assert.equal(videoTime({...previous,publishedAt:null}),0);
});

test('public YouTube filters encode today/week/month and views, with no unsupported date sort',()=>{
  assert.deepEqual([...Buffer.from(youtubeFilter('today'),'base64')],[18,4,8,2,16,1]);
  assert.deepEqual([...Buffer.from(youtubeFilter('week'),'base64')],[18,4,8,3,16,1]);
  assert.deepEqual([...Buffer.from(youtubeFilter('month','relevance',2),'base64')],[18,4,8,4,16,1,72,20]);
  assert.deepEqual([...Buffer.from(youtubeFilter('','views'),'base64')],[8,3,18,2,16,1]);
});

test('failed searches keep a full category without claiming it was refreshed',async()=>{
  const cached=Array.from({length:120},(_,i)=>video(i+1,864e5));
  const result=await searchCategory('지진·쓰나미',['earthquake'],cached,async()=>{throw Error('unavailable')});
  assert.equal(result.videos.length,120);
  assert.equal(result.candidateCount,0);
  assert.equal(result.checkedAt,null);
});

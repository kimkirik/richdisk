import test from 'node:test';
import assert from 'node:assert/strict';
import { createAsyncCache } from '../lib/async-cache.ts';
import { validateConditions, createComparisonCache, mapConcurrent } from '../lib/conditions-client.ts';

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const value = (location = 'gujina', date = '2026-09-06') => ({locationId: location, date, updatedAt:new Date().toISOString(), tides:[], weather:{}, sourceStatus:{tide:true,weather:true}});

test('twenty simultaneous requests share one load and preserve the original observation timestamp', async () => {
  const cache=createAsyncCache(3), gate=deferred();let calls=0;
  const load=async()=>{calls++;await gate.promise;return value();};
  const requests=Array.from({length:20},()=>cache.get('point:date:issue',load,()=>1000));
  gate.resolve();const results=await Promise.all(requests);
  assert.equal(calls,1);assert.equal(results.filter(r=>r.status==='COALESCED').length,19);
  const hit=await cache.get('point:date:issue',load,()=>1000);
  assert.equal(hit.status,'HIT');assert.deepEqual(hit.value,results[0].value);assert.equal(calls,1);
});
test('expired values reload, issue/point/date keys stay distinct, and old entries are bounded', async () => {
  let now=0,calls=0;const cache=createAsyncCache(2,()=>now),load=async()=>++calls;
  await cache.get('a:today:0200',load,()=>10);await cache.get('b:today:0200',load,()=>10);
  assert.equal((await cache.get('a:tomorrow:0200',load,()=>10)).value,3);
  assert.equal((await cache.get('a:today:0200',load,()=>10)).status,'MISS');
  assert.equal((await cache.get('a:today:0500',load,()=>10)).status,'MISS');
  now=10;assert.equal((await cache.get('a:today:0500',load,()=>10)).status,'MISS');
});
test('failed shared requests are evicted and recover on the next attempt', async () => {
  const cache=createAsyncCache(3);let calls=0;
  const fail=async()=>{calls++;throw Error('upstream');};
  const failures=await Promise.allSettled(Array.from({length:4},()=>cache.get('x',fail,()=>1000)));
  assert.equal(calls,1);assert.ok(failures.every(r=>r.status==='rejected'));
  assert.equal((await cache.get('x',async()=>42,()=>1000)).value,42);
});
test('comparison batches keep order, limit concurrency to four and cancel queued work', async () => {
  const gate=deferred(),controller=new AbortController();let running=0,peak=0,started=0;
  const promise=mapConcurrent(Array.from({length:12},(_,i)=>i),4,controller.signal,async i=>{
    started++;running++;peak=Math.max(peak,running);await gate.promise;running--;return i*2;
  });
  assert.equal(started,4);gate.resolve();assert.deepEqual(await promise,Array.from({length:12},(_,i)=>i*2));assert.equal(peak,4);
  const stop=new AbortController(),paused=deferred();let cancelledStarts=0;
  const cancel=mapConcurrent(Array.from({length:12},(_,i)=>i),4,stop.signal,async i=>{cancelledStarts++;await paused.promise;return i;});
  stop.abort();paused.resolve();await assert.rejects(cancel,{name:'AbortError'});assert.equal(cancelledStarts,4);
});
test('selected weather and rankings reject wrong dates, wrong points and stale timestamps', () => {
  const sample=value();validateConditions(sample,'gujina','2026-09-06');
  for(const bad of [{...sample,date:'2026-09-07'},{...sample,locationId:'sinduri'},{...sample,locationId:undefined},{...sample,updatedAt:new Date(Date.now()-601000).toISOString()},null]) {
    assert.throws(()=>validateConditions(bad,'gujina','2026-09-06'));
  }
});
test('comparison cache reuses fresh data but never stores mismatched or failed results', async () => {
  const previous=globalThis.fetch;let calls=0;const read=createComparisonCache(),signal=new AbortController().signal;
  globalThis.fetch=async input=>{calls++;const url=new URL(String(input),'http://localhost');return new Response(JSON.stringify(value(url.searchParams.get('location'),url.searchParams.get('date'))));};
  try {
    await read('gujina','2026-09-06',signal);await read('gujina','2026-09-06',signal);assert.equal(calls,1);
    await read('sinduri','2026-09-06',signal);assert.equal(calls,2);
    globalThis.fetch=async()=>{calls++;return new Response(JSON.stringify(value('wrong')));};
    await assert.rejects(read('gujina','2026-09-07',signal));await assert.rejects(read('gujina','2026-09-07',signal));assert.equal(calls,4);
  } finally {globalThis.fetch=previous;}
});

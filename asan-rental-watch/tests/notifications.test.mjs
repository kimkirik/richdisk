import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const code=await readFile(new URL('../source/public/sw.js',import.meta.url),'utf8');
function worker() {
  const sent=[], requests=[], listeners={};
  const self={registration:{scope:'https://example.com/richdisk/asan-rental-watch/',showNotification:async(title,options)=>{sent.push({title,...options});}},addEventListener:(type,fn)=>{listeners[type]=fn}};
  const context=vm.createContext({self,caches:{},URL,Response,AbortSignal,fetch:async(...args)=>{requests.push(args);return new Response('{}');},Date,console});
  vm.runInContext(code,context);
  const push=async data=>{let pending;listeners.push({data:{json:()=>data},waitUntil:p=>{pending=p;}});await pending;};
  return {context,push,sent,self,requests,listeners};
}
const payload={eventId:'notice:a:v1',title:'아산 신규 공고',body:'권곡동 공고',deviceId:'device',receiptToken:'test'};
test('background push displays app notification then acknowledges receipt',async()=>{
  const w=worker();await w.push(payload);
  assert.equal(w.sent.length,1);assert.equal(w.sent[0].title,payload.title);
  assert.equal(w.sent[0].data.url,'https://example.com/richdisk/asan-rental-watch/');
  assert.equal(w.requests.length,1);assert.match(w.requests[0][0],/\/api\/receipt$/);
  assert.equal(JSON.parse(w.requests[0][1].body).eventId,payload.eventId);
});
test('retries share the Android notification tag without another sound',async()=>{
  const w=worker();await w.push(payload);await w.push(payload);
  assert.equal(w.sent[0].tag,w.sent[1].tag);assert.equal(w.sent[1].renotify,false);
});
test('failed OS display never produces a success receipt',async()=>{
  const w=worker();w.self.registration.showNotification=async()=>{throw new Error('OS refused');};
  await assert.rejects(w.push(payload));assert.equal(w.requests.length,0);
});
test('malformed push still displays a useful fallback; URLs cannot redirect away',async()=>{
  const w=worker();await w.push(null);assert.equal(w.sent[0].title,'아산집 알리미');assert.equal(w.requests.length,0);
  await w.push({...payload,url:'https://evil.test'});assert.equal(w.sent[1].data.url,'https://example.com/richdisk/asan-rental-watch/');
});
test('foreground and legacy background polling cannot duplicate server push',()=>{
  const w=worker();assert.equal(w.listeners.message,undefined);assert.equal(w.listeners.periodicsync,undefined);
});

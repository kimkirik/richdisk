import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('../sw.js',import.meta.url),'utf8');
function worker() {
 const handlers={}, deleted=[], opened=[], cached=[];
 const cache={addAll:async paths=>cached.push(...paths),match:async()=>new Response('offline manual')};
 const env={URL,Response,Promise,Error,fetch:async()=>{throw new Error('offline')},caches:{open:async()=>cache,keys:async()=>['other-app-cache','canary-signal:/richdisk/canary-signal/:v1','canary-signal:/another/:v1'],delete:async key=>deleted.push(key)},self:{location:{href:'https://example.com/richdisk/canary-signal/sw.js'},skipWaiting:async()=>{},addEventListener:(name,fn)=>handlers[name]=fn,clients:{claim:async()=>{},matchAll:async()=>[{url:'https://example.com/richdisk/another/',focus:()=>{throw new Error('wrong app')}},{url:'https://example.com/richdisk/canary-signal/',focus:async()=>opened.push('canary')}],openWindow:async url=>opened.push(url)}}};
 vm.runInNewContext(code,env);return {handlers,deleted,opened,cached};
}
test('precache and cleanup are confined to this app scope',async()=>{const w=worker();let task;w.handlers.install({waitUntil:p=>task=p});await task;assert.ok(w.cached.every(url=>url.startsWith('https://example.com/richdisk/canary-signal/')));assert.ok(w.cached.some(url=>url.includes('data.js')));w.handlers.activate({waitUntil:p=>task=p});await task;assert.deepEqual(w.deleted,['canary-signal:/richdisk/canary-signal/:v1'])});
test('worker does not intercept APIs, other apps, POST, or arbitrary files',()=>{const w=worker();for(const [url,method] of [['https://api.open-meteo.com/v1/forecast','GET'],['https://example.com/richdisk/another/','GET'],['https://example.com/richdisk/canary-signal/private','GET'],['https://example.com/richdisk/canary-signal/','POST']])w.handlers.fetch({request:{url,method,mode:'cors'},respondWith:()=>assert.fail('unexpected interception')})});
test('offline navigation resolves to cached manual shell',async()=>{const w=worker();let response;w.handlers.fetch({request:{url:'https://example.com/richdisk/canary-signal/?entry=home',method:'GET',mode:'navigate'},respondWith:p=>response=p});assert.equal(await(await response).text(),'offline manual')});
test('notification click focuses only this app',async()=>{const w=worker();let task;w.handlers.notificationclick({notification:{close(){}},waitUntil:p=>task=p});await task;assert.deepEqual(w.opened,['canary'])});

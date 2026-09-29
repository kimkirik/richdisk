import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const shared=readFileSync(new URL('../signal-alerts.js',import.meta.url),'utf8');
const worker=readFileSync(new URL('../gold-alert-sw.js',import.meta.url),'utf8');
function setup(){
  const scope='https://example.test/richdisk/global-shock-tracker/',records=new Map(),notices=[],listeners={},opened=[];let requests=0;
  const now=new Date(),date=now.toISOString().slice(0,10);
  const plan={entry:100,stop:90,target1:120,target2:130,fx:1300,fxAsOf:date,calculatedAt:now.toISOString()};
  const coin={level:'buy',label:'매수 후보',strength:80,summary:'test',asOf:date,tradePlan:plan};
  const payload={status:'ok',fetchedAt:now.toISOString(),cash:{level:'normal',asOf:date},btc:{...coin},sol:{...coin},eth:{...coin},xrp:{...coin},doge:{...coin},ranking:[{asset:'sol',rank:1,score:100,eligible:true},{asset:'eth',rank:2,score:75,eligible:true},{asset:'xrp',rank:3,score:55,eligible:true}]};
  const cache={match:async k=>records.has(k)?new Response(records.get(k)):undefined,put:async(k,v)=>records.set(k,await v.text()),delete:async k=>records.delete(k)};
  const context=vm.createContext({URL,Response,AbortController,setTimeout,clearTimeout,caches:{open:async()=>cache},fetch:async()=>{requests++;return new Response(JSON.stringify(payload));},self:{registration:{scope,showNotification:async(...args)=>notices.push(args)},addEventListener:(k,fn)=>listeners[k]=fn,clients:{matchAll:async()=>[],openWindow:async url=>opened.push(url)}},importScripts:()=>{}});
  vm.runInContext(shared,context);vm.runInContext(worker,context);
  return {scope,records,notices,listeners,opened,payload,context,enable:k=>records.set(scope+'__market_signal_alert_enabled__/'+k,'on'),check:k=>vm.runInContext(`checkMarketSignal(${JSON.stringify(k)})`,context),requests:()=>requests};
}
test('opt-in only, shared state deduplication and 14-day cooldown',async()=>{const s=setup();await s.check('btc');assert.equal(s.requests(),0);s.enable('btc');await s.check('btc');await s.check('btc');assert.equal(s.notices.length,1);s.records.delete(s.scope+'__market_signal_alert_state__/btc');await s.check('btc');assert.equal(s.notices.length,1);});
test('each coin notification includes entry, stop and two targets; coin cooldowns are independent',async()=>{const s=setup();for(const k of ['btc','xrp','sol','eth','doge']){s.enable(k);await s.check(k);}assert.equal(s.notices.length,5);for(const n of s.notices){assert.match(n[1].body,/매수 ₩130,000 \/ 손절 ₩117,000 \/ 매도1 ₩156,000 \/ 매도2 ₩169,000/);assert.match(n[1].data.url,/signal=/);assert.match(n[1].body,/1코인 원화 환산/);assert.match(n[1].body,/환율 1달러=1,300원/);}});
test('ranking contains sorted top 3 with prices and 24-hour change cooldown',async()=>{const s=setup();s.enable('recommendation');await s.check('recommendation');const body=s.notices[0][1].body;assert.match(body,/1\. 솔라나 SOL 100점/);assert.equal((body.match(/손절 ₩117,000/g)||[]).length,3);[s.payload.ranking[0].rank,s.payload.ranking[1].rank]=[2,1];await s.check('recommendation');assert.equal(s.notices.length,1);s.records.set(s.scope+'__market_signal_alert_cooldown__/recommendation',String(Date.now()-86400001));await s.check('recommendation');assert.equal(s.notices.length,2);assert.match(s.notices[1][1].body,/^1\. 이더리움 ETH/);});
test('stale data, missing prices and market risk suppress recommendations and coin alerts',async()=>{for(const mutate of [p=>p.fetchedAt='2000-01-01',p=>{for(const k of ['btc','sol','eth','xrp'])p[k].tradePlan=null;},p=>p.cash.level='high']){const s=setup();mutate(s.payload);s.enable('btc');s.enable('recommendation');await s.check('btc');await s.check('recommendation');assert.equal(s.notices.length,0);}});
test('invalid stop ordering never sends an alert',async()=>{const s=setup();s.payload.btc.tradePlan.stop=200;s.enable('btc');await s.check('btc');assert.equal(s.notices.length,0);});
test('notification click stays in app scope',async()=>{const s=setup();let pending;s.listeners.notificationclick({notification:{close(){},data:{url:'https://unrelated.test/'}},waitUntil:p=>pending=p});await pending;assert.deepEqual(s.opened,[s.scope+'#gold-signal']);});

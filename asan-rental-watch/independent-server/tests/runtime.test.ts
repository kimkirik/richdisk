import test from 'node:test';
import assert from 'node:assert/strict';
import { Miniflare } from 'miniflare';
import { build } from 'esbuild';
import { createECDH, randomBytes } from 'node:crypto';

test('real Worker SQLite, automatic alarms, outage preservation and authenticated push API', {timeout:45000}, async () => {
 const bundled=await build({entryPoints:['server/worker.ts'],bundle:true,write:false,format:'esm',platform:'browser',external:['cloudflare:workers'],target:'es2022'});
 const vapid=createECDH('prime256v1');vapid.generateKeys();
 const receiver=createECDH('prime256v1');receiver.generateKeys();
 const requestedHosts=new Set<string>();let pushCalls=0;
 const migrationToken=randomBytes(32).toString('hex');
 const mf=new Miniflare({modules:true,script:bundled.outputFiles[0].text,compatibilityDate:'2026-05-15',
  durableObjects:{WATCH:{className:'RentalWatch',useSQLite:true},SCANNERS:{className:'SourceScanner',useSQLite:true}},
  bindings:{MIGRATION_TOKEN:migrationToken,APP_URL:'https://asan-rental-push.kimkirik.chatgpt.site/',VAPID_PUBLIC_KEY:vapid.getPublicKey().toString('base64url'),VAPID_PRIVATE_KEY:vapid.getPrivateKey().toString('base64url')},
  outboundService:async (request: {url: string})=>{
   const host=new URL(request.url).hostname;requestedHosts.add(host);
   if(host==='fcm.googleapis.com'){pushCalls++;return new Response(null,{status:201});}
   return new Response('temporary upstream outage',{status:503});
  }
 });
 const base='https://worker.test';
 const json=async(path:string,init?:RequestInit)=>{const r=await mf.dispatchFetch(base+path,init as any);return {status:r.status,data:await r.json() as any};};
 try {
  assert.equal((await json('/api/migrate',{method:'POST',body:'{}'})).status,404);
  const migration={method:'POST',headers:{Authorization:'Bearer '+migrationToken},body:JSON.stringify({devices:[],events:[],deliveries:[]})};
  assert.equal((await json('/api/migrate',migration)).status,200);
  assert.equal((await json('/api/migrate',migration)).status,409);
  const original=await json('/api/notices');assert.equal(original.status,200);assert.equal(original.data.notices.length,5);
  const denied=await json('/api/device');assert.equal(denied.status,401);
  const token=randomBytes(32).toString('hex');
  const headers={Authorization:'Bearer '+token,'Content-Type':'application/json',Origin:'https://asan-rental-push.kimkirik.chatgpt.site'};
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/runtime-fixture',expirationTime:null,keys:{p256dh:receiver.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
  assert.equal((await json('/api/subscribe',{method:'POST',headers,body:JSON.stringify(subscription)})).status,200);
  assert.equal((await json('/api/test',{method:'POST',headers})).status,200);assert.equal(pushCalls,1);
  assert.equal((await json('/api/device',{headers})).data.receipts.length,1);
  let health:any;
  const until=Date.now()+30000;
  do {await new Promise(resolve=>setTimeout(resolve,500));health=(await json('/api/health')).data;} while(!health.collector?.finishedAt&&Date.now()<until);
  assert.equal(health.collector.status,'checked');assert.equal(health.collector.healthySourceCount,0);
  assert.ok(health.nextCheck>Date.now());
  const after=(await json('/api/notices')).data;
  assert.deepEqual(after.notices.map((n:any)=>n.id).sort(),original.data.notices.map((n:any)=>n.id).sort());
  assert.deepEqual(after.archived.map((n:any)=>n.id).sort(),original.data.archived.map((n:any)=>n.id).sort());
  assert.ok(requestedHosts.has('apply.lh.or.kr'));assert.ok(![...requestedHosts].some(h=>h.includes('github')));
  assert.equal((await json('/api/device',{method:'DELETE',headers})).status,200);
  assert.equal((await json('/api/device',{headers})).status,401);
  assert.equal((await json('/api/refresh',{method:'POST'})).status,202);
  const previousStart=health.collector.startedAt;
  await new Promise(resolve=>setTimeout(resolve,1600));
  assert.notEqual((await json('/api/health')).data.collector.startedAt,previousStart,'manual refresh must start a new source scan despite the 30-minute interval');
 } finally {await mf.dispose();}
});

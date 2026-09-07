import test from 'node:test';
import assert from 'node:assert/strict';
import {forwardIndependent} from '../lib/independent-api.ts';
test('same-address API forwards device credentials only to configured server and rejects redirects',async()=>{
 const oldFetch=globalThis.fetch;
 const req=()=>new Request('https://asan-rental-push.kimkirik.chatgpt.site/api/device',{headers:{Authorization:'Bearer test-device-token'}});
 try {
  assert.equal(await forwardIndependent(req()),null);
  globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://asan-fixture.example.workers.dev/api/device');assert.equal(new Headers(init?.headers).get('Authorization'),'Bearer test-device-token');assert.equal(init?.redirect,'manual');return Response.json({connected:true});};
  const response=await forwardIndependent(req(),'https://asan-fixture.example.workers.dev');assert.equal(response?.status,200);assert.equal(response?.headers.get('cache-control'),'no-store');
  globalThis.fetch=async()=>new Response(null,{status:307,headers:{Location:'https://untrusted.example'}});
  await assert.rejects(forwardIndependent(req(),'https://asan-fixture.example.workers.dev'),/redirect rejected/);
  await assert.rejects(forwardIndependent(req(),'https://untrusted.example'),/Invalid/);
 }finally{globalThis.fetch=oldFetch;}
});

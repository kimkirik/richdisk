import test from 'node:test';
import assert from 'node:assert/strict';
import { matchOnyang, watchAlertTitle, compareParents, validParentsProfile } from '../server/watch-target.ts';
import { buildAlerts } from '../server/alerts.ts';
import { parseAsanRows, inspectLhBatch } from '../server/collector.ts';

test('aliases normalize spacing, block forms and broad related possibilities without unrelated keyword alerts', () => {
 for (const title of ['아산온양 주복1BL 입주자 모집', '온양 주복 1블록 입주자 모집', '아산 온양 주상복합 제 1 블럭 모집', '온양 주복１ＢＬ 공동주택', '아산온양 주복1block 입주자 모집', '온천동 3145 통합공공임대', '온천동 360번지 공급', '옛 싸전부지 입주자 모집']) assert.equal(matchOnyang({title}).level,3,title);
 for (const title of ['온양 원도심 통합공공임대 입주자 모집', '아산시 통합공공임대주택 공급', '아산시 온천동 공공임대 입주자 모집', '쌀전 공공임대 입주자 모집']) assert.ok(matchOnyang({title}).level>0,title);
 for (const title of ['LH 통합공공임대 장애인 우선공급', '수원 주복1BL 입주자 모집', '부산 온천동 360번지 공고', '울산 온양 통합공공임대 모집', '천안 청수 고령자 임대주택']) assert.equal(matchOnyang({title}).level,0,title);
 assert.ok(matchOnyang({title:'충남 통합공공임대 입주자 모집',searchText:'공급주소: 아산시 온천동 3145'}).level);
 assert.match(watchAlertTitle({title:'온양 주복1BL 입주자 모집'})!,/^최우선/);
 assert.doesNotMatch(watchAlertTitle({title:'아산온양 주복1BL 건설공사 설계공모'})!,/최우선|모집공고$/);
 assert.match(watchAlertTitle({title:'아산 통합공공임대 입주자 모집'})!,/관련 가능성/);
});

test('target notice is first, keeps its deduplication key and receives changes once', () => {
 const now=Date.now(); const target={id:'target',title:'온양 주복 1블록 입주자 모집',alertKey:'target:v2'};
 const snapshot={checkedAt:new Date(now).toISOString(),notices:[{id:'ordinary',title:'아산 행복주택 입주자 모집'},target],healthySourceCount:5,sourceCount:5};
 const first=buildAlerts(snapshot,['target:v1'],now);
 assert.equal(first.alerts[0].id,'notice:target:v2'); assert.match(first.alerts[0].title,/최우선/);
 assert.equal(buildAlerts(snapshot,first.known,now).alerts.length,0);
});

test('collector retains renamed target and separates construction news', async () => {
 const row=(title:string)=>`<tr><td class="title alignLeft"><a href="?mgt_no=123">${title}</a></td><td>2026-09-14</td></tr>`;
 assert.equal(parseAsanRows(row('온양 주상복합 1블럭 예비입주자 모집')).length,1);
 assert.match(parseAsanRows(row('싸전부지 공동주택 건설공사 착공'))[0].status,/모집공고 아님/);
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<section><h3>신청자격</h3>만 65세 이상 고령자 및 장애인 주거약자</section>공고상태 공급위치: 온천동 3145');
 try {
  const result=await inspectLhBatch([{id:'fixture',title:'통합공공임대 예비입주자 모집',dates:['2026-09-14'],url:'https://apply.lh.or.kr/fixture',region:'충남',type:'통합공공임대',status:'공고중',upperType:'06'} as any]);
  assert.equal(result.notices.length,1);
  assert.equal(matchOnyang(result.notices[0]).level,3);
  assert.match(result.notices[0].eligibilityText!,/65세/);
 } finally {globalThis.fetch=oldFetch;}
});

test('family comparison indicates evidence or review, never automatic qualification', () => {
 const p={householdSize:2,recipient:true,senior:true,disabled:true}; assert.ok(validParentsProfile(p));
 assert.equal(validParentsProfile({...p,householdSize:0}),false); assert.equal(validParentsProfile({...p,name:'private'}),false);
 const absent=compareParents({title:'일반 임대주택'},p); assert.equal(absent.length,4); assert.ok(absent.every(r=>r.note.includes('확인 필요')));
 const evidence=compareParents({title:'아산 통합공공임대',eligibilityText:'장애인 주거약자용 고령자 생계급여'},p);
 assert.ok(evidence.every(r=>r.found && r.note.includes('공급표 확인')));
 assert.equal(compareParents({title:'아산 통합공공임대'},{...p,disabled:false,recipient:false,senior:false}).length,0);
});

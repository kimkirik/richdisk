import test from 'node:test';
import assert from 'node:assert/strict';
import { isClosed, splitNotices, filterNotices, noticeStatus } from '../source/lib/notices.ts';
import type { LiveNotice } from '../source/lib/notices.ts';
import { reconcileNotices, noticeAlertKey } from '../scripts/reconcile-notices.ts';
import { parseLhRows, parseLhDetails, parseAsanRows, parseKohomRows } from '../scripts/update-notices.ts';
const now = Date.parse('2026-09-07T12:00:00+09:00');
const base: LiveNotice = { id:'lh-one',title:'아산 국민임대',source:'LH청약플러스',type:'국민임대',status:'접수중',postedAt:'2026-08-01',closeAt:'2026-09-09',location:'아산시',url:'https://apply.lh.or.kr/' };

test('Korean date-only deadlines stay open through the day; confirmed time closes precisely', () => {
  assert.equal(isClosed(base, Date.parse('2026-09-09T23:59:59+09:00')), false);
  assert.equal(isClosed(base, Date.parse('2026-09-10T00:00:00+09:00')), true);
  const timed={...base,applicationEndAt:'2026-09-09T16:00:00+09:00'};
  assert.equal(isClosed(timed, Date.parse('2026-09-09T16:00:00+09:00')), false);
  assert.equal(isClosed(timed, Date.parse('2026-09-09T16:00:01+09:00')), true);
});
test('closed status takes precedence over missing date; upcoming start is not open', () => {
  assert.equal(noticeStatus({...base,status:'모집 취소',closeAt:''}, now).tone,'closed');
  assert.equal(noticeStatus({...base,applicationStartAt:'2026-09-08T10:00:00+09:00'},now).label,'접수 예정');
});
test('expiry archives even when the source is down', () => {
  const result=reconcileNotices({notices:[{...base,closeAt:'2026-09-06'}]},[{source:base.source,result:{healthy:false,notices:[]}}],now);
  assert.equal(result.notices.length,0); assert.equal(result.archived[0].id,base.id);
});
test('missing rolling recruitment is retained indefinitely and clearly flagged', () => {
  let previous={notices:[{...base,closeAt:''}],archived:[] as LiveNotice[]};
  for(let i=0;i<10;i++) previous=reconcileNotices(previous,[{source:base.source,result:{healthy:true,notices:[]}}],now);
  assert.equal(previous.notices.length,1); assert.equal(previous.notices[0].needsVerification,true); assert.equal(previous.archived.length,0);
});
test('fresh observation resets missing state and reopening removes archive copy', () => {
  const result=reconcileNotices({archived:[{...base,status:'마감',archivedAt:'2026-09-01'}]},[{source:base.source,result:{healthy:true,notices:[base]}}],now);
  assert.equal(result.archived.length,0); assert.equal(result.notices[0].missingChecks,0); assert.equal(result.notices[0].archivedAt,undefined);
});
test('all archive records are retained beyond the former 200-record cap', () => {
  const archived=Array.from({length:210},(_,i)=>({...base,id:'old-'+i,status:'마감',archivedAt:'2026-09-01'}));
  assert.equal(reconcileNotices({archived},[],now).archived.length,210);
});
test('transport metadata does not trigger changes; application time and attachment changes do', () => {
  assert.equal(noticeAlertKey(base),noticeAlertKey({...base,missingChecks:3,lastSeenAt:'2026-09-07',needsVerification:true}));
  assert.notEqual(noticeAlertKey(base),noticeAlertKey({...base,contentKey:'new-file'}));
  assert.notEqual(noticeAlertKey(base),noticeAlertKey({...base,applicationEndAt:'2026-09-09T15:00:00+09:00'}));
});
test('portal fallback preserves authoritative dates and change key during LH outage', () => {
  const portal={...base,source:'마이홈포털',title:'짧은 제목',closeAt:''};
  const result=reconcileNotices({notices:[base]},[{source:base.source,result:{healthy:false,notices:[]}},{source:portal.source,result:{healthy:true,notices:[portal]}}],now);
  assert.equal(result.notices[0].closeAt,base.closeAt); assert.equal(result.notices[0].alertKey,noticeAlertKey(base)); assert.equal(result.notices[0].needsVerification,true);
});
test('frontend closes stale active entries and respects actual filters and deadline order', () => {
  const second={...base,id:'lh-two',type:'행복주택',closeAt:'2026-10-01'};
  const closed={...base,id:'old',closeAt:'2026-09-06'};
  const data={notices:[second,base,closed],checkedAt:new Date(now).toISOString(),sourceCount:5,healthySourceCount:5};
  assert.deepEqual(splitNotices(data,now).live.map(n=>n.id),['lh-two','lh-one']);
  assert.equal(splitNotices(data,now).archived[0].id,'old');
  assert.deepEqual(filterNotices([second,base],'아산','전체','deadline').map(n=>n.id),['lh-one','lh-two']);
  assert.equal(filterNotices([second,base],'아산','행복주택','deadline')[0].id,'lh-two');
});
test('LH parser reads table date columns without mistaking dates in a title', () => {
  const html=`<tr><td>1</td><td class="mVw cate col1">국민임대</td><td><a data-id1="42" data-id2="03" data-id3="06" data-id4="07" class="wrtancInfoBtn"><span>아산 모집(2026.01.01)<em>NEW</em></span></a></td><td class="mVw cate col2">충청남도</td><td>2026.08.01</td><td>2026.09.09</td><td class="mVw stt ing">접수중</td></tr>`;
  const parsed=parseLhRows(html)[0]; assert.deepEqual(parsed.dates,['2026-08-01','2026-09-09']); assert.equal(parsed.title,'아산 모집(2026.01.01)');
});
test('LH details extract exact times and ignore changing applicant counters', () => {
  const html=`<section><h3 class="tit1">신청자격</h3>아산 무주택</section><a href="javascript:fileDownLoad('123');">PDF</a><script>var sbscAcpStDt = '2026.09.07'; var sbscAcpStHm = '10:00'; var sbscAcpClsgDt = '2026.09.09'; var sbscAcpClsgHm = '16:00';</script>`;
  const parsed=parseLhDetails(html); assert.equal(parsed.applicationEndAt,'2026-09-09T16:00:00+09:00');
  assert.equal(parsed.contentKey,parseLhDetails(html+'신청건수 101').contentKey);
  assert.notEqual(parsed.contentKey,parseLhDetails(html.replace("'123'","'124'")).contentKey);
});
test('Asan posting with only publication date is not mistaken for a past deadline', () => {
  const parsed=parseAsanRows(`<tr><td class="title alignLeft"><a href="?pds_no=1">아산 임대주택 입주자 모집</a></td><td>2026-01-01</td></tr>`);
  assert.equal(parsed.length,1); assert.equal(parsed[0].closeAt,'');
});
test('Kohom reads the status column in Korean, not the word 공고 in a title', () => {
  const row=(status:string)=>`<tr><td>1</td><td>충남</td><td><a onclick="fn_goView('42');return false;">아산 임대 모집공고</a></td><td>관리소</td><td>2026-09-01</td><td>${status}</td></tr>`;
  assert.equal(parseKohomRows(row('당첨자발표'))[0].status,'마감');
  assert.equal(parseKohomRows(row('접수중'))[0].status,'접수중');
});

test('CNDC parses structured rows and includes Asan among nationwide records', async () => {
  const {parseCndcRows}=await import('../scripts/update-notices.ts');
  const row={aptReqNoticeDesc:'아산 행복주택 예비입주자',regionName:'아산시',projectCd:'1',aptSeqNo:2,regionAptCd:'3',aptMainKind:'행복주택공급',aptReqNoticeDate:'2026-09-01',aptReqStartDate:'2026-09-11 10시',aptReqEndDate:'2026-09-15 17시',noticeStatus:'예정',aptName:'탕정',fileSn10:'doc1'};
  const parsed=parseCndcRows('var itemList = '+JSON.stringify([row,{...row,regionName:'천안시'}])+';');
  assert.equal(parsed.length,1);assert.equal(parsed[0].applicationEndAt,'2026-09-15T17:00:00+09:00');assert.match(parsed[0].url,/regionAptCd=3/);
  assert.throws(()=>parseCndcRows('<html>upstream error page</html>'));
});

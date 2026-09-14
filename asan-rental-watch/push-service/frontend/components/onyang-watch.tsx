import { useEffect, useState } from 'react';
import { BellRing, ChevronRight, ExternalLink, Heart, Star } from 'lucide-react';
import type { LiveNotice } from '@/lib/notices';
import { pushRequest } from '@/lib/push';
import { compareParents, isRecruitment, matchOnyang, WATCH_ALIASES, type ParentsProfile } from '@/lib/watch-target';

const guide = 'https://apply.lh.or.kr/lhapply/cm/cntnts/cntntsView.do?cntntsId=1201333&mi=1201585';
const design = 'https://www.lh.or.kr/board.es?act=view&bid=0034&list_no=648683&mid=a10601020000';
const preset: ParentsProfile = { householdSize: 2, recipient: true, senior: true, disabled: true };

export function ParentsComparison({ notice, profile }: { notice: LiveNotice; profile: ParentsProfile | null }) {
  if (!profile) return null;
  const rows = compareParents(notice, profile);
  return <section className="parents-comparison" aria-label="선택 공고 부모님 조건 비교">
    <h3><Heart size={17} /> 부모님 맞춤 · {profile.householdSize}인 가구</h3>
    <p>선택 공고의 제목·수집된 본문과 입력 조건을 비교했습니다. 신청 자격이 확정된 결과는 아닙니다.</p>
    <ul>{rows.map(row => <li key={row.key}><b>{row.label}</b><span>{row.note}</span></li>)}</ul>
    <p>무주택·소득·자산, 급여 종류, 신청 명의와 배점, 공급세대, 중복 신청 제한은 공고 원문에서 확인하세요. 51㎡·65㎡ 공급 여부와 {profile.householdSize}인 가구 신청 가능 면적, 주거약자용 배정을 함께 비교하세요.</p>
  </section>;
}

export function OnyangWatch({ notices, ready, monitoring, connected, onConnect, onSelect, profile, onProfile }: {
  notices: LiveNotice[]; ready: boolean; monitoring: boolean; connected: boolean; onConnect: () => void; onSelect: (notice: LiveNotice) => void;
  profile: ParentsProfile | null; onProfile: (profile: ParentsProfile | null) => void;
}) {
  const [draft, setDraft] = useState<ParentsProfile>(preset);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let current = true;
    onProfile(null);
    if (connected) void pushRequest<{profile: ParentsProfile | null}>('/profile').then(result => {
      if (current) { onProfile(result.profile); if (result.profile) setDraft(result.profile); }
    }).catch(() => { if (current) setMessage('저장한 조건을 불러오지 못했습니다. 잠시 후 앱을 다시 열어 주세요.'); });
    return () => { current = false; };
  }, [connected, onProfile]);
  async function save(remove = false) {
    if (!connected) { setMessage('먼저 이 기기의 앱 알림을 연결한 뒤 조건을 저장해 주세요.'); onConnect(); return; }
    setBusy(true); setMessage('');
    try {
      const result = await pushRequest<{profile: ParentsProfile | null}>('/profile', remove ? 'DELETE' : 'POST', remove ? undefined : draft);
      onProfile(result.profile); setMessage(remove ? '저장한 부모님 조건을 지웠습니다.' : '부모님 조건을 저장했습니다. 공고를 선택하면 자동으로 비교합니다.');
    } catch (e) { setMessage(e instanceof Error ? e.message : '저장하지 못했습니다. 입력한 조건을 유지합니다.'); }
    finally { setBusy(false); }
  }
  const matches = notices.map(notice => ({notice, match:matchOnyang(notice)})).filter(item => item.match.level > 0)
    .sort((a,b) => b.match.level - a.match.level);
  const recruitment = matches.filter(item => isRecruitment(item.notice.title));
  return <section className="onyang-watch" aria-labelledby="onyang-title">
    <div className="onyang-heading"><div><span className="watch-badge"><Star size={14} /> 관심 단지 · 최우선</span><h2 id="onyang-title">아산온양 주복1BL</h2><p>온천동 싸전부지 · 통합공공임대</p></div><button type="button" className="watch-button" onClick={onConnect}><BellRing size={17} /> {connected ? '알림 상태 확인' : '앱 알림 연결'}</button></div>
    <p className="watch-status">{!ready ? '공고 확인 중' : recruitment.length ? `관련 모집공고 ${recruitment.length}건 · 단지와 신청 조건을 확인하세요` : '현재 수집된 공고에서 입주자 모집 미확인'}<small>{monitoring ? '약 30분 간격 확인 · 감지하면 우선 발송' : '유사 명칭 감시 연결 확인 중'}</small></p>
    {matches.length > 0 && <div className="watch-matches">{matches.map(({notice,match}) => <button type="button" key={notice.id} onClick={() => onSelect(notice)}><span><b>{notice.title}</b><small>{isRecruitment(notice.title) ? '모집 관련' : '사업소식 · 모집 여부 확인'} · {match.reason}{notice.needsVerification ? ' · 현재 상태 재확인 필요' : ''}</small></span><ChevronRight size={18} /></button>)}</div>}
    <details className="watch-details"><summary>단지 정보 · 유사 명칭 · 희망 평형</summary>
      <dl className="watch-facts"><div><dt>위치</dt><dd>아산시 온천동 3145 일원 (옛 싸전부지)<small>제공된 위치 · 과거 자료의 온천동 360도 함께 감지</small></dd></div><div><dt>규모·사업주체</dt><dd>LH · 318세대 · 4개동 · 지하 2층~지상 20층<small>제공된 사업 개요 · 최종 모집공고로 재확인</small></dd></div><div><dt>일정</dt><dd>준공 2028년 12월경 · 입주 목표 2029년 4월경<small>제공된 예정 정보 · 확정된 모집·입주 일정이 아니며 변경 가능</small></dd></div><div><dt>주택형</dt><dd>31㎡ · 41㎡ · 51㎡<small>2023년 LH 설계자료 기준 · 최종 공급형은 공고 확인. 65㎡ 공급은 미확인.</small></dd></div></dl>
      <div className="preferred-areas"><div><b>51㎡ <span>약 15.4평</span></b><p>우선 검토 희망형</p></div><div><b>65㎡ <span>약 19.7평</span></b><p>공급 여부부터 확인</p></div></div>
      <p>두 면적 모두 2인 가구 신청 가능 여부와 장애인·주거약자용 세대 배정을 확인해야 합니다.</p>
      <h3>이름이 달라도 함께 확인</h3><ul className="watch-aliases">{WATCH_ALIASES.map(alias => <li key={alias}>{alias}</li>)}</ul>
      <p>띄어쓰기·기호·영문 대소문자·블록 표기를 통일해 제목과 수집 가능한 본문을 비교합니다. 넓은 지역·유형 일치는 ‘관련 가능성’으로 알립니다. ‘LH’나 ‘장애인’ 한 단어만으로 같은 단지로 판단하지 않습니다.</p>
      <p className="watch-sources"><a href={design} target="_blank" rel="noreferrer">LH 설계자료 <ExternalLink size={13} /></a><a href={guide} target="_blank" rel="noreferrer">LH 통합공공임대 자격 안내 <ExternalLink size={13} /></a></p>
    </details>
    <details className="watch-details" open={profile ? true : undefined}><summary><Heart size={16} /> 부모님 맞춤 {profile ? '· 조건 저장됨' : '설정'}</summary>
      {profile && <div className="parents-badges">{profile.recipient && <span>수급자 ✓</span>}{profile.senior && <span>고령자 ✓</span>}{profile.disabled && <span>등록장애인 ✓</span>}{(profile.senior || profile.disabled) && <span>주거약자 배정 확인</span>}</div>}
      <p>체크는 입력한 조건을 뜻합니다. 최종 자격·배점·유형별 세대수는 모집공고 기준입니다.</p>
      <div className="parents-form"><label>가구원 수 <select value={draft.householdSize} onChange={event => setDraft({...draft,householdSize:Number(event.target.value)})}>{Array.from({length:8},(_,i)=><option key={i+1} value={i+1}>{i+1}명</option>)}</select></label>{([['recipient','기초생활수급자'],['senior','만 65세 이상'],['disabled','등록장애인']] as const).map(([key,label]) => <label key={key}><input type="checkbox" checked={draft[key]} onChange={event => setDraft({...draft,[key]:event.target.checked})} />{label}</label>)}</div>
      <p>장애인 우선공급 · 주거약자용 · 수급자 우선공급 · 고령자 유형의 자격과 배점을 비교한 뒤, 허용된 유형으로 신청하세요.</p>
      <div className="watch-actions"><button type="button" className="watch-button" disabled={busy} onClick={() => save()}>{busy ? '저장 중…' : '부모님 조건 저장'}</button>{profile && <button type="button" className="watch-button secondary" disabled={busy} onClick={() => save(true)}>조건 삭제</button>}</div>
      <small>조건은 이 기기의 알림 연결에 저장됩니다. 다른 방문자에게 공개되지 않으며, 다른 기기에서는 별도로 설정해 주세요.</small>
      {message && <p role="status">{message}</p>}
    </details>
  </section>;
}

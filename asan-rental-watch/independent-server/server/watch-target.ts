export const WATCH_RULE_VERSION = 'onyang-2026-09-14';
export const WATCH_NAME = '아산온양 주복1BL';
export const WATCH_ALIASES = ['아산온양 주복1BL', '온양 주복 1블록 / 1블럭 / 1BLOCK', '아산온양 주상복합 1블록', '온천동 싸전부지 / 옛 싸전', '온천동 3145 / 구 지번 360', '온양 원도심 통합공공임대', '아산 통합공공임대'];
export type WatchNotice = { title: string; location?: string; type?: string; searchText?: string; eligibilityText?: string };
export function normalizeWatchText(text: string) {
  return text.normalize('NFKC').toLowerCase().replace(/주상복합/g, '주복').replace(/블록|블럭|block/g, 'bl').replace(/제\s*(\d)/g, '$1').replace(/[\s\p{P}\p{S}]/gu, '');
}
export function matchOnyang(notice: WatchNotice): { level: number; reason: string } {
  const t = normalizeWatchText([notice.title, notice.location, notice.searchText].filter(Boolean).join(' '));
  if (/울산|부산|대전|청주|대구|서울|충주/.test(t) && !/아산|충남|충청남도/.test(t)) return { level: 0, reason: '' };
  if (/(?:아산)?온양(?:지구)?주복0?1(?:bl|단지|구역|공동|입주|통합|$)/.test(t)) return { level: 3, reason: '온양 주복1 명칭 일치' };
  if (/온천동(?:3145|360)(?!\d)/.test(t)) return { level: 3, reason: '관심 부지 주소 일치 · 지번 원문 확인' };
  if (/싸전/.test(t) && /아산|온양|온천동|부지/.test(t)) return { level: 3, reason: '싸전부지 명칭 일치' };
  if (/온양/.test(t) && /주복|통합공공|공공임대|도시재생.*주택|원도심.*주택/.test(t)) return { level: 2, reason: '온양 지역·주택사업 표현 일치' };
  if (/아산/.test(t) && /통합공공임대|온천동.*임대|주복0?1(?:bl|단지|$)/.test(t)) return { level: 1, reason: '아산 지역 관련 가능성 · 동일 단지 확인 필요' };
  if (/쌀전|싸전/.test(t) && /임대|공동주택|입주자/.test(t)) return { level: 1, reason: '싸전 유사 명칭 · 위치 확인 필요' };
  return { level: 0, reason: '' };
}
export function isRecruitment(title: string) {
  const t = normalizeWatchText(title);
  if (/설계공모|건설공사|시공|감리|용역|사업자모집|상가|토지매각/.test(t)) return false;
  return /입주자|예비자|임차인|청약|잔여세대/.test(t) && /모집|공급|접수/.test(t);
}
export function watchAlertTitle(notice: WatchNotice) {
  const match = matchOnyang(notice);
  if (!match.level) return null;
  if (match.level === 3 && isRecruitment(notice.title)) return '최우선 · 아산온양 주복1BL 모집공고';
  return isRecruitment(notice.title) ? '관심 단지 관련 가능성 · 모집공고 확인' : '관심 단지 관련 소식 · 모집 여부 확인';
}

export type ParentsProfile = { householdSize: number; recipient: boolean; senior: boolean; disabled: boolean };
export function validParentsProfile(value: unknown): value is ParentsProfile {
  if (!value || typeof value !== 'object') return false;
  const p = value as ParentsProfile;
  return Object.keys(value).length === 4 && Number.isInteger(p.householdSize) && p.householdSize >= 1 && p.householdSize <= 8 &&
    [p.recipient, p.senior, p.disabled].every(v => typeof v === 'boolean');
}
export function compareParents(notice: WatchNotice, profile: ParentsProfile) {
  const text = normalizeWatchText([notice.title, notice.type, notice.eligibilityText].filter(Boolean).join(' '));
  const integrated = /통합공공/.test(text);
  return [
    { key: 'disabled', label: '장애인 우선공급', enabled: profile.disabled, found: /장애인/.test(text) },
    { key: 'accessible', label: '주거약자용 주택', enabled: profile.disabled || profile.senior, found: /주거약자|고령자복지주택|무장애/.test(text) },
    { key: 'recipient', label: '수급자 우선공급', enabled: profile.recipient, found: /수급|생계급여|의료급여|주거급여/.test(text) },
    { key: 'senior', label: '고령자 유형', enabled: profile.senior, found: /고령|65세|노인/.test(text) },
  ].filter(row => row.enabled).map(row => ({ ...row, note: row.found ? '관련 문구 발견 · 공급표 확인' : integrated && row.key !== 'accessible' ? '통합공공임대 가이드상 검토 대상' : '해당 유형 배정 여부 확인 필요' }));
}

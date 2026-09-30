import './signal-alerts-v3-777671f97e01.js';
import { fetchJson, validateSignals, safeStorage, formatChecked } from './data-v2-01fcbebef09c.mjs';
const A = globalThis.ShockAlerts;
const TABS = A.KINDS.filter(k => !['recommendation','daily'].includes(k));
const storage = safeStorage(() => window.localStorage);
const css = `
.crypto-center{margin-block:24px;padding:24px;border:1px solid #b8c9d2;border-radius:20px;background:#f8fbfd;color:#143043;min-width:0;scroll-margin-top:100px}
.crypto-center *{box-sizing:border-box}.crypto-center h2{font-size:25px;margin:4px 0 10px}.crypto-center h3{font-size:19px;margin:8px 0}.crypto-center p{line-height:1.6;margin:8px 0}.crypto-center small{font-size:12px;line-height:1.6;color:#405967}.crypto-center button{cursor:pointer;border:1px solid #b9cbd5;border-radius:10px;background:white;color:#193b4d;padding:10px 14px;font:inherit}.crypto-center button:focus-visible,.crypto-center input:focus-visible{outline:3px solid #1284a9;outline-offset:3px}.crypto-center button:disabled{opacity:.6;cursor:wait}.crypto-top{display:flex;justify-content:space-between;gap:16px;align-items:start}.crypto-eyebrow{font-weight:700;letter-spacing:.12em;color:#17647c;font-size:11px}.crypto-alerts{border:1px solid #cbd8df;border-radius:12px;padding:14px;margin:18px 0}.crypto-alerts legend{font-weight:700;padding:0 8px}.crypto-switches{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.crypto-switches label{display:flex;align-items:center;gap:9px;font-size:14px;padding:8px;background:#fff;border-radius:8px;cursor:pointer}.crypto-switches input{width:18px;height:18px;accent-color:#087687;flex-shrink:0}.crypto-status{font-size:13px;color:#405967;padding:12px 0}.crypto-error{padding:12px;border:1px solid #db9378;border-radius:10px;background:#fff4ed;color:#813c20}.crypto-tabs{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:7px;margin:14px 0}.crypto-tabs button{text-align:left;min-width:0;padding:10px}.crypto-tabs button[aria-pressed=true]{background:#173d50;color:#fff;border-color:#173d50}.crypto-tabs button small{display:block;color:inherit;font-size:11px;margin-top:5px;overflow-wrap:anywhere}.crypto-panel{border-radius:14px;background:#fff;padding:20px;border:1px solid #d7e2e8}.crypto-panel header{display:flex;gap:20px;align-items:center}.crypto-strength{min-width:76px;height:76px;display:grid;place-content:center;border:6px solid #d9e9ef;border-radius:50%;font-size:24px;font-weight:700;text-align:center}.crypto-strength small{font-size:11px;font-weight:400}.crypto-factors{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:16px}.crypto-factors article{padding:12px;background:#f0f5f8;border-radius:9px}.crypto-factors strong,.crypto-factors small{display:block}.crypto-plan{padding:16px 0 4px}.crypto-prices{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.crypto-prices div{background:#edf4f7;border-radius:9px;padding:10px}.crypto-prices dt{font-size:12px;color:#425e6c;margin-bottom:7px}.crypto-prices dd{margin:0;font-size:17px;font-weight:700;overflow-wrap:anywhere}.crypto-prices dd small{display:block;font-weight:400}.crypto-ranking{margin:24px 0;scroll-margin-top:100px}.crypto-ranking-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;padding:0;list-style:none;counter-reset:rank}.crypto-ranking-list>li{padding:16px;border:1px solid #c2d5df;border-radius:12px;background:#fff;min-width:0}.crypto-rank-header{display:flex;justify-content:space-between;gap:8px}.crypto-rank-header strong{font-size:18px}.crypto-rank-header b{color:#087687;white-space:nowrap}.crypto-ranking-list .crypto-prices{grid-template-columns:repeat(2,minmax(0,1fr))}.crypto-ranking-list .crypto-prices dd{font-size:15px}.crypto-ranking-list .crypto-plan{padding-top:3px}.crypto-ranking-list li p{font-size:13px}.crypto-badge{display:inline-block;font-size:12px;border-radius:5px;background:#e5f2ed;color:#256446;padding:3px 7px;margin:8px 0}.crypto-muted{background:#f2eee7;color:#715730}.crypto-method{border-top:1px solid #cbd8df;padding-top:15px;margin-top:20px;font-size:13px}.crypto-method summary{cursor:pointer;font-weight:700}.crypto-method a{color:#126b92;text-decoration:underline}.crypto-alert-preview{white-space:pre-line;font-size:13px;background:#eef4f7;padding:12px;border-radius:8px;overflow-wrap:anywhere}
@media(max-width:900px){.crypto-tabs{grid-template-columns:repeat(4,minmax(0,1fr))}.crypto-ranking-list{grid-template-columns:repeat(2,minmax(0,1fr))}.crypto-factors{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:620px){.crypto-center{padding:14px}.crypto-top{flex-wrap:wrap}.crypto-center h2{font-size:22px}.crypto-switches{grid-template-columns:repeat(2,minmax(0,1fr))}.crypto-tabs{grid-template-columns:repeat(2,minmax(0,1fr))}.crypto-ranking-list{grid-template-columns:1fr}.crypto-prices{grid-template-columns:repeat(2,minmax(0,1fr))}.crypto-panel{padding:14px}.crypto-panel header{align-items:start;gap:12px}.crypto-strength{min-width:62px;height:62px;font-size:20px}.crypto-alerts{padding:10px}.crypto-switches label{font-size:12px;padding:7px}.crypto-factors{grid-template-columns:1fr}.crypto-prices dd{font-size:16px}}
.crypto-notify-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.crypto-notify-actions .primary{background:#087687;color:white;border-color:#087687}.crypto-notify-status{padding:12px;background:#e9f3f7;border-radius:8px;font-size:14px;overflow-wrap:anywhere}.crypto-center .crypto-prices{grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))}.crypto-center .crypto-prices dd{white-space:nowrap;overflow-wrap:normal;font-variant-numeric:tabular-nums}
`;
export function createSignalCenter(React, { apiUrl, baseUrl }) {
  const h = React.createElement;
  const key = kind => `shock-tracker:${baseUrl().pathname}:alert:${kind}`;
  const assetUrl = path => new URL(path, baseUrl()).toString();
  async function registration() {
    if (!('serviceWorker' in navigator)) throw Error('이 브라우저는 알림 서비스를 지원하지 않습니다.');
    const reg = await navigator.serviceWorker.register(assetUrl('gold-alert-sw.js'), {scope:baseUrl().pathname, updateViaCache:'none'});
    if (!reg.active) await new Promise((resolve,reject) => {
      const worker = reg.installing || reg.waiting;
      if (!worker) return reject(Error('알림 서비스를 시작하지 못했습니다.'));
      const timer = setTimeout(() => reject(Error('알림 준비 시간이 초과됐습니다.')),10000);
      const check = () => { if(worker.state==='activated'){clearTimeout(timer);resolve();} else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('알림 서비스를 시작하지 못했습니다.'));} };
      worker.addEventListener('statechange',check); check();
    });
    return reg;
  }
  function Plan({signal, compact=false}) {
    const p = signal?.tradePlan;
    if (!A.validPlan(p)) return h('p',{className:'crypto-error'},'가격 계획 보류 · 최신 시세 또는 14일 고가·저가 자료가 부족하거나 지연됐습니다.');
    return h('div',{className:'crypto-plan'},
      !compact && h('h3',null,'매수·손절·매도 참고 가격'),
      h('dl',{className:'crypto-prices'},...[['참고 매수가','entry'],['손절 기준가','stop'],['1차 매도 목표','target1'],['2차 매도 목표','target2']].map(([label,id]) => h('div',{key:id},h('dt',null,label),h('dd',null,A.won(p[id],p.fx),h('small',null,A.price(p[id])))))),
      h('small',null,`1코인 원화 환산(KRW) · 손절폭 ${p.riskPct}% · 손익비 1:2 / 1:3 · 시세 ${p.asOf} UTC · ${A.fxNote(signal)}`),
      !compact && h('p',null,h('small',null,`계산 ${formatChecked(p.calculatedAt)} · 변동성 종가일 ${p.volatilityAsOf}. 매수는 최근 관측가, 손절은 매수가−2×14일 평균 실제변동폭, 목표는 위험폭의 2배·3배입니다. 수수료·슬리피지 미포함이며 실제 체결가가 아닙니다. 원화는 환산값으로 국내 거래소 가격과 다릅니다.`)));
  }
  return function SignalCenter() {
    const [data,setData] = React.useState(null), [error,setError] = React.useState(''), [loading,setLoading] = React.useState(true);
    const [enabled,setEnabled] = React.useState({}), [note,setNote] = React.useState(''), [busy,setBusy] = React.useState(null);
    const [push,setPush] = React.useState(null), [pushStatus,setPushStatus] = React.useState('휴대폰 알림 연결을 확인하는 중입니다.');
    const endpointRef = React.useRef(null);
    const [selected,setSelected] = React.useState('gold'), [preview,setPreview] = React.useState(false);
    const linked = React.useRef(false);
    const [,tick] = React.useState(0); const inFlight = React.useRef(false), alive = React.useRef(true);
    const refresh = React.useCallback(async () => {
      if(inFlight.current) return;
      inFlight.current=true; setLoading(true);
      try {
        const result=validateSignals(await fetchJson(apiUrl('/api/market-signals?signals=3')));
        if(!alive.current) return;
        setData(result);setError('');
        if(globalThis.Notification?.permission === 'granted' && A.KINDS.some(k => storage.getItem(key(k)) === 'on')) {
          try { const reg=await registration(); for(const kind of A.KINDS) await A.send(kind,result,reg,baseUrl().toString()); }
          catch {setNote('자료는 갱신했지만 시스템 알림을 전송하지 못했습니다. 브라우저 알림 설정을 확인해주세요.');}
        }
      } catch(e) {if(alive.current) setError(e.message || '자료를 불러오지 못했습니다.');}
      finally {inFlight.current=false;if(alive.current)setLoading(false);}
    },[]);
    React.useEffect(() => {
      alive.current=true;
      const requested=new URL(location.href).searchParams.get('signal');
      if(TABS.includes(requested)) setSelected(requested);
      async function sync() {
        try {
          const existing=await navigator.serviceWorker?.getRegistration(baseUrl().toString());
          const cache=await caches.open(A.CACHE);
          for(const kind of A.KINDS) {
            // Keep prior opt-ins only when this app owns the worker and permission remains granted.
            if(existing?.scope===baseUrl().toString() && globalThis.Notification?.permission==='granted' && storage.getItem(key(kind))===null && storage.getItem(`shock-tracker:alert:${kind}`)==='on') storage.setItem(key(kind),'on');
            const on=storage.getItem(key(kind))==='on' && globalThis.Notification?.permission==='granted';
            const url=assetUrl(`__market_signal_alert_enabled__/${kind}`);
            if(on) await cache.put(url,new Response('on')); else await cache.delete(url);
          }
          if(existing) await registration();
        } catch {}
        if(alive.current) setEnabled(Object.fromEntries(A.KINDS.map(k=>[k,storage.getItem(key(k))==='on' && globalThis.Notification?.permission==='granted'])));
        void inspectPush();
        await refresh();
      }
      void sync();
      const resume=()=>{if(!document.hidden)void refresh();};
      const timer=setInterval(resume,900000), clock=setInterval(()=>tick(n=>n+1),60000);
      window.addEventListener('online',resume);document.addEventListener('visibilitychange',resume);
      return ()=>{alive.current=false;clearInterval(timer);clearInterval(clock);window.removeEventListener('online',resume);document.removeEventListener('visibilitychange',resume);};
    },[refresh]);
    React.useEffect(() => {
      if (!data || linked.current) return;
      const requested = new URL(location.href).searchParams.get('signal');
      if (!A.KINDS.includes(requested)) return;
      const target = document.getElementById(requested === 'recommendation' ? 'crypto-ranking' : 'gold-signal');
      if (target) { linked.current = true; target.scrollIntoView({block:'start'}); }
    }, [data]);
    async function pushApi(path, body, method='POST') {
      if (!endpointRef.current) throw Error('휴대폰 알림 서버 연결이 아직 준비되지 않았습니다. 새로고침 후 다시 확인해주세요.');
      const response=await fetch(endpointRef.current+path,{method,headers:{'Content-Type':'application/json','Authorization':`Bearer ${storage.getItem(key('push-token')) || ''}`},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
      const result=await response.json();
      if(!response.ok) throw Error(result.error || '알림 서버와 연결하지 못했습니다.');
      return result;
    }
    async function inspectPush() {
      try {
        const config=await fetchJson(assetUrl('notification-config.json'));
        if(!config.endpoint) throw Error('서버 연결 준비 중 · 현재는 사이트가 열린 동안 신호를 확인합니다.');
        const endpoint=new URL(config.endpoint);
        if(endpoint.protocol!=='https:' || !endpoint.hostname.endsWith('.workers.dev')) throw Error('알림 서버 주소를 확인해주세요.');
        endpointRef.current=endpoint.origin;
        const service=await fetchJson(endpoint.origin+'/config');
        if(!service.ready) throw Error('알림 서버를 준비 중입니다.');
        setPush(service);
        const id=storage.getItem(key('push-id'));
        const reg=await navigator.serviceWorker?.getRegistration(baseUrl().toString());
        const subscription=await reg?.pushManager?.getSubscription();
        if(id && subscription && globalThis.Notification?.permission==='granted') {
          const status=await pushApi('/status',{id});
          const receipt=await (await caches.open(A.CACHE)).match(assetUrl('__market_signal_last_push__'));
          let received;try{received=await receipt?.json();}catch{}
          setPushStatus(`백그라운드 알림 연결됨 · ${status.enabled.length}종 수신${status.lastAccepted ? ` · 최근 전송 접수 ${formatChecked(status.lastAccepted)}` : ''}${received?.at ? ` · 이 기기 최근 수신 ${formatChecked(received.at)}` : ''}${status.lastError ? ` · ${status.lastError}` : ''}`);
          await (await caches.open(A.CACHE)).put(assetUrl('__market_signal_push_active__'),new Response('on'));
          // Server preferences are authoritative after a successful registration.
          for(const kind of A.KINDS) storage.setItem(key(kind),status.enabled.includes(kind)?'on':'off');
          setEnabled(Object.fromEntries(A.KINDS.map(k=>[k,status.enabled.includes(k)])));
        } else {
          setPushStatus('이 휴대폰의 백그라운드 알림이 연결되지 않았습니다. 아래에서 모두 알림 받기를 눌러주세요.');
          await (await caches.open(A.CACHE)).delete(assetUrl('__market_signal_push_active__'));
        }
      } catch(e) {setPushStatus(e.message || '알림 연결 상태 확인 실패');}
    }
    async function saveFlags(next) {
      const cache=await caches.open(A.CACHE);
      for(const kind of A.KINDS) {
        storage.setItem(key(kind),next[kind]?'on':'off');
        const flag=assetUrl(`__market_signal_alert_enabled__/${kind}`);
        if(next[kind])await cache.put(flag,new Response('on'));else await cache.delete(flag);
      }
      setEnabled(next);
    }
    async function connect(next, label) {
      setBusy(label);setNote('');
      try {
        if(!push?.publicKey) throw Error('휴대폰 알림 서버에 연결되지 않았습니다. 연결 상태 확인을 눌러주세요.');
        if(!('Notification' in window) || !('PushManager' in window)) throw Error('Chrome에서 이 주소를 열어주세요. 앱 안의 내장 브라우저는 휴대폰 알림을 지원하지 않을 수 있습니다.');
        if(await Notification.requestPermission()!=='granted') throw Error('Chrome의 사이트 설정에서 알림을 허용한 다음 다시 눌러주세요.');
        const reg=await registration();
        const bytes=Uint8Array.from(atob(push.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
        let token=storage.getItem(key('push-token'));
        if(!token) {token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');storage.setItem(key('push-token'),token);}
        if(storage.getItem(key('push-token'))!==token) throw Error('기기 설정을 저장하지 못했습니다. 시크릿 모드를 끄고 다시 열어주세요.');
        let sub=await reg.pushManager.getSubscription();
        if(sub?.options.applicationServerKey && Array.from(new Uint8Array(sub.options.applicationServerKey)).join(',')!==Array.from(bytes).join(',')){await sub.unsubscribe();sub=null;}
        sub=sub || await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});
        let result;
        try{result=await pushApi('/subscription',{subscription:sub.toJSON(),base:baseUrl().toString(),enabled:A.KINDS.filter(k=>next[k])},'PUT');}
        catch(e){if(!storage.getItem(key('push-id')))await sub.unsubscribe();throw e;}
        storage.setItem(key('push-id'),result.id);
        await (await caches.open(A.CACHE)).put(assetUrl('__market_signal_push_active__'),new Response('on'));
        await saveFlags(next);
        for(const kind of A.KINDS)try{await reg.periodicSync?.unregister(`market-signal-${kind}`);}catch{}
        setPushStatus(`백그라운드 알림 연결됨 · ${result.enabled.length}종 수신`);
        setNote('알림 설정을 저장했습니다. 사이트를 닫아도 서버에서 15분마다 신호 변화를 확인합니다. 테스트 알림으로 휴대폰 수신을 확인해주세요.');
      } catch(e) {setNote(e.message || '휴대폰 알림 등록에 실패했습니다.');}
      finally {setBusy(null);}
    }
    async function toggle(kind,on) {
      const next={...enabled,[kind]:on};
      if(on || storage.getItem(key('push-id'))) return connect(next,kind);
      await saveFlags(next);
    }
    async function disableAll() {
      setBusy('off');setNote('');
      try {
        const id=storage.getItem(key('push-id'));
        if(id) await pushApi('/subscription',{id},'DELETE');
        const reg=await navigator.serviceWorker?.getRegistration(baseUrl().toString());
        const sub=await reg?.pushManager?.getSubscription();await sub?.unsubscribe();
        await saveFlags({});
        await (await caches.open(A.CACHE)).delete(assetUrl('__market_signal_push_active__'));
        storage.removeItem(key('push-id'));storage.removeItem(key('push-token'));
        setPushStatus('모든 알림이 꺼져 있습니다.');
      }catch(e){setNote(e.message || '알림 해제에 실패했습니다.');}finally{setBusy(null);}
    }
    async function testPush() {
      setBusy('test');setNote('');
      try {await pushApi('/test',{id:storage.getItem(key('push-id'))});setNote('테스트 알림을 푸시 서비스에 접수했습니다. 휴대폰 알림창에 도착했는지 확인해주세요.');await inspectPush();}
      catch(e){setNote(e.message || '테스트 알림 전송 실패');}finally{setBusy(null);}
    }
    const signal=data?.[selected], rows=Array.isArray(data?.ranking)?data.ranking:[];
    const candidates=data?A.candidates(data):[];
    const stale=data && !A.fresh(data,'recommendation');
    return h('section',{id:'gold-signal',className:'crypto-center','aria-labelledby':'market-signal-title'},
      h('style',null,css),
      h('header',{className:'crypto-top'},h('div',null,h('div',{className:'crypto-eyebrow'},'GOLD · 5 COINS · CASH DEFENSE'),h('h2',{id:'market-signal-title'},'오늘의 투자 신호센터'),h('p',null,'코인별 신호와 상승 조건 순위, 매수·손절·매도 참고 가격을 함께 확인하세요.')),
        h('button',{type:'button',disabled:loading,onClick:refresh},loading?'갱신 중…':'새로고침')),
      h('fieldset',{className:'crypto-alerts'},h('legend',null,'휴대폰 알림 설정'),
        h('p',{className:'crypto-notify-status',role:'status'},pushStatus),
        h('div',{className:'crypto-notify-actions'},
          h('button',{type:'button',className:'primary',disabled:busy!==null,onClick:()=>void connect(Object.fromEntries(A.KINDS.map(k=>[k,true])),'all')},busy==='all'?'연결 중…':'모두 알림 받기'),
          h('button',{type:'button',disabled:busy!==null,onClick:()=>void testPush()},'테스트 알림 보내기'),
          h('button',{type:'button',disabled:busy!==null,onClick:()=>void inspectPush()},'연결 상태 확인'),
          h('button',{type:'button',disabled:busy!==null,onClick:()=>void disableAll()},'모두 끄기')),
        h('p',null,h('small',null,'안드로이드: Chrome에서 열고 모두 알림 받기 → 허용을 누르세요. Chrome 앱 알림과 이 사이트의 알림이 모두 켜져 있어야 합니다.')),
        h('div',{className:'crypto-switches'},...A.KINDS.map(kind=>h('label',{key:kind},h('input',{id:`signal-alert-${kind}`,type:'checkbox',role:'switch','aria-label':`${A.NAMES[kind]} 신호 알림`,checked:!!enabled[kind],disabled:busy!==null,onChange:e=>void toggle(kind,e.target.checked)}),A.NAMES[kind]))),
        h('p',null,h('small',null,'매일 오전 9시(한국시간) 요약 + 신호·추천 순위 변경 알림. 15분마다 확인하며, 24시간·14일 재알림 제한을 없앴습니다. 매수·손절·1차·2차 매도가는 원화 환산값으로 전송합니다. 추천 조건이 없으면 관망, 자료가 늦으면 지연 안내를 보냅니다.'))),
      note && h('p',{role:'status',className:'crypto-error'},note),
      error && h('p',{role:'alert',className:'crypto-error'},`${data?'갱신 실패 · 이전 자료 표시. ':''}${error}`),
      data && h('div',{className:'crypto-status',role:'status'},`${stale?'지연된 자료 · 현재 추천 알림 보류':'자료 연결됨'} · 서버 확인 ${formatChecked(data.fetchedAt)} · 15분마다 확인`,
        Object.keys(data.unavailable||{}).length>0 && h('p',null,`일부 자료 대기: ${Object.keys(data.unavailable).map(k=>A.NAMES[k]||k).join(', ')}`)),
      !data && h('p',{role:'status'},loading?'시장 자료를 불러오는 중입니다.':'새로고침으로 다시 시도할 수 있습니다.'),
      data && h(React.Fragment,null,
        h('div',{className:'crypto-tabs',role:'group','aria-label':'자산별 신호'},...TABS.map(kind=>h('button',{type:'button',key:kind,'aria-pressed':selected===kind,'aria-controls':'crypto-asset-panel',onClick:()=>setSelected(kind)},A.NAMES[kind],h('small',null,data[kind]?.label||'자료 대기')))),
        h('div',{className:'crypto-panel',id:'crypto-asset-panel','aria-label':`${A.NAMES[selected]} 분석`}, signal ? h(React.Fragment,null,
          h('header',null,h('div',{className:'crypto-strength'},signal.strength,h('small',null,'신호 점수')),h('div',null,h('small',null,`${A.NAMES[selected]} · ${signal.asOf} 기준`),h('h3',null,signal.label),h('p',null,signal.summary))),
          h('div',{className:'crypto-factors'},...signal.factors.map((factor,i)=>h('article',{key:factor.id||i},h('small',null,factor.label),h('strong',null,factor.value),h('small',null,factor.detail)))),
          selected!=='cash' && h('p',null,h('small',null,`기준 시세 ${A.won(signal.priceKrw)}${selected==='gold'?' / g':' / 1코인'} (원화 환산) · ${A.price(signal.priceUsd)}${selected==='gold'?' / oz':''}`)),
          A.COINS.includes(selected) && h(Plan,{signal})) : h('p',{className:'crypto-error'},data.unavailable?.[selected]||'이 코인의 자료가 아직 준비되지 않았습니다. 새로고침 후 확인해주세요.')),
        h('section',{className:'crypto-ranking',id:'crypto-ranking','aria-labelledby':'crypto-ranking-title'},
          h('h3',{id:'crypto-ranking-title'},'상승 조건 순위'),h('p',null,'주간 회복·장기 추세·7일 및 30일 흐름이 강한 순서입니다. 점수는 상승확률(%)이 아닙니다.'),
          !candidates.length && h('p',{className:'crypto-error'},'현재 추천 알림 보류 · 시장 위험, 점수 또는 자료 조건을 통과한 코인이 없습니다.'),
          h('ol',{className:'crypto-ranking-list'},...rows.map(row=>h('li',{key:row.asset},
            h('div',{className:'crypto-rank-header'},h('strong',null,`${row.rank}. ${A.NAMES[row.asset]}`),h('b',null,`${row.score}점`)),
            h('span',{className:`crypto-badge ${candidates.some(r=>r.asset===row.asset)?'':'crypto-muted'}`},candidates.some(r=>r.asset===row.asset)?'추천 순위 알림 대상':'상위 3위 밖 · 개별 신호는 별도'),
            h('p',null,row.reasons.join(' · ')),h(Plan,{signal:data[row.asset],compact:true})))),
          !rows.length && h('p',null,'코인 순위 자료를 준비 중입니다.'),
          h('button',{type:'button',onClick:()=>setPreview(v=>!v),'aria-expanded':preview},'추천 알림 내용 미리보기'),
          preview && h('p',{className:'crypto-alert-preview'},candidates.length?A.details('recommendation',data).body:'조건을 충족하는 후보가 없어 추천 알림을 보내지 않습니다.'))),
      h('details',{className:'crypto-method'},h('summary',null,'계산 기준과 알림 작동 범위'),
        h('p',null,data?.rankingMethod||'주간 2주 연속 상승 30점 · 200일 평균 위 25점 · 30일 상승 25점 · 7일 상승 20점. 55점 이상, 유효한 가격 계획, 시장 고위험 경보 없음이 추천 조건입니다.'),
        h('p',null,'매수·손절·목표가는 전략 참고값입니다. 최근 관측가를 매수 기준으로, 완료된 일봉 14개의 실제변동폭(TR) 단순평균의 2배를 손절폭으로 사용합니다. 1차와 2차 목표는 각각 위험폭의 2배와 3배입니다. ',h('a',{href:'https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr',target:'_blank',rel:'noreferrer'},'변동폭 지표 설명'),' · 배수와 점수 기준은 이 앱의 고정 규칙이며 검증된 승률이 아닙니다.'),
        h('p',null,'코인 분할매수 신호는 수집 이력 최고 종가 대비 −20%·−35%·−50%·−65% 조정과 완료된 UTC 주간 종가 2주 연속 상승을 함께 확인합니다. 상승 조건 순위와는 목적이 다른 신호입니다. 금은 200일선·252일 추세·20일 조정·DXY를 확인합니다. 현금방어는 BTC, 미국 주식·VIX, 달러·원화 위험이 3회 연속 지속되는지 확인합니다.'),
        h('p',null,'알림은 기기별 설정입니다. 모두 알림 받기로 등록하면 사이트를 닫아도 서버에서 전송합니다. 같은 신호는 매일 요약에서 다시 알려드리고, 신호 변화는 다음 확인 때 보냅니다. 전송 접수는 실제 화면 표시와 다르며, 휴대폰의 네트워크·절전·알림 설정에 따라 지연될 수 있습니다. iPhone은 홈 화면에 추가한 웹앱에서 등록해야 합니다. 가격 도달 알림이나 자동 주문 기능은 아니며, 정해진 가격의 체결·수익을 보장하지 않습니다. 알림이 잘리면 눌러서 전체 가격을 확인하세요.')));
  };
}

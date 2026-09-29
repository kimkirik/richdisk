/* Shared by the page and the service worker so each device uses one alert history. */
(function (root) {
  const COINS = ['btc', 'xrp', 'sol', 'eth', 'doge'];
  const NAMES = { gold: '금', btc: 'BTC', xrp: 'XRP', sol: '솔라나 SOL', eth: '이더리움 ETH', doge: '도지코인 DOGE', cash: '현금방어', recommendation: '추천 순위' };
  const KINDS = ['gold', ...COINS, 'cash', 'recommendation'];
  const CACHE = 'global-shock-tracker-market-alert-v3';
  function fresh(payload, kind, now = Date.now()) {
    const fetched = Date.parse(payload?.fetchedAt);
    if (payload?.status !== 'ok' || !Number.isFinite(fetched) || now - fetched > 30 * 60000 || fetched - now > 5 * 60000) return false;
    const signal = payload[kind === 'recommendation' ? 'cash' : kind];
    const date = signal?.asOf;
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const observed = Date.parse(date + 'T23:59:59Z');
    if (!Number.isFinite(observed) || new Date(date).toISOString().slice(0,10) !== date || date > new Date(now).toISOString().slice(0,10)) return false;
    if (COINS.includes(kind)) return now - observed <= 2 * 86400000;
    let businessDays=0; const day=new Date(date+'T00:00:00Z'); const today=new Date(now).toISOString().slice(0,10);
    while(day.toISOString().slice(0,10)<today) {day.setUTCDate(day.getUTCDate()+1);if(day.getUTCDay()!==0 && day.getUTCDay()!==6)businessDays++;if(businessDays>3)return false;}
    return true;
  }
  function validPlan(plan, now = Date.now()) {
    return !!plan && ['entry','stop','target1','target2','fx'].every(k => Number.isFinite(plan[k]) && plan[k] > 0) &&
      plan.stop < plan.entry && plan.entry < plan.target1 && plan.target1 < plan.target2 &&
      Number.isFinite(Date.parse(plan.calculatedAt)) && now - Date.parse(plan.calculatedAt) <= 30 * 60000 && Date.parse(plan.calculatedAt) <= now + 300000;
  }
  function price(value) { return '$' + Number(value).toLocaleString('en-US', {maximumFractionDigits: value < 10 ? 6 : 2}); }
  function prices(signal) {
    const p = signal?.tradePlan;
    return p ? `참고 매수 ${price(p.entry)} / 손절 ${price(p.stop)} / 매도1 ${price(p.target1)} / 매도2 ${price(p.target2)}` : '가격 계획 보류';
  }
  function candidates(payload, now = Date.now()) {
    if (!fresh(payload, 'recommendation', now) || ['high', 'cash-first'].includes(payload.cash.level)) return [];
    const seen = new Set();
    return (Array.isArray(payload.ranking) ? payload.ranking : []).filter(row => {
      if (!COINS.includes(row?.asset) || !row.eligible || (!Number.isFinite(row.score) || row.score < 55 || row.score > 100) || !fresh(payload, row.asset, now) || !validPlan(payload[row.asset]?.tradePlan, now) || seen.has(row.asset)) return false;
      seen.add(row.asset); return true;
    }).sort((a,b) => a.rank - b.rank).slice(0,3);
  }
  function details(kind, payload, now = Date.now()) {
    if (kind === 'recommendation') {
      const rows = candidates(payload, now);
      return { triggered: rows.length > 0, key: rows.map(row => row.asset).join('>'),
        title: '코인 상승 조건 · 추천 순위',
        body: rows.map((row, i) => `${i+1}. ${NAMES[row.asset]} ${row.score}점 — ${prices(payload[row.asset])}`).join('\n') + `\n시세 기준 ${payload[rows[0]?.asset]?.asOf ?? '—'} UTC · 1단위 USD · 손익비 1:2 / 1:3 · 확률 아님` };
    }
    const signal = payload?.[kind];
    return { triggered: !!signal && fresh(payload, kind, now) && (!COINS.includes(kind) || (validPlan(signal.tradePlan, now) && fresh(payload, 'cash', now) && !['high','cash-first'].includes(payload.cash?.level))) && (kind === 'cash' ? ['high','cash-first'] : ['buy','strong-buy']).includes(signal.level),
      key: signal?.level ?? '', title: `${NAMES[kind]} 신호 · ${signal?.label ?? '자료 대기'}`,
      body: kind === 'cash' ? signal?.summary ?? '' : COINS.includes(kind) ? `${prices(signal)}\n시세 기준 ${signal.asOf} UTC · 1단위 USD · 손익비 1:2 / 1:3 · 전략 참고값` : `${signal?.strength ?? '—'}점 — ${signal?.summary ?? ''}` };
  }
  function targetUrl(base, kind) {
    const url = new URL(base); url.searchParams.set('signal', kind);
    url.hash = kind === 'recommendation' ? 'crypto-ranking' : 'gold-signal'; return url.toString();
  }
  function cooldown(kind) { return kind === 'recommendation' ? 86400000 : COINS.includes(kind) ? 14 * 86400000 : 0; }
  async function send(kind, payload, registration, base) {
    if (!KINDS.includes(kind) || !fresh(payload, kind)) return false;
    const check = async () => {
      const cache = await caches.open(CACHE);
      const url = suffix => new URL(suffix, base).toString();
      const enabled = await cache.match(url(`__market_signal_alert_enabled__/${kind}`));
      if (!enabled || await enabled.text() !== 'on') return false;
      const data = details(kind, payload);
      const state = url(`__market_signal_alert_state__/${kind}`);
      if (!data.triggered) { await cache.delete(state); return false; }
      const prior = await cache.match(state);
      if (prior && await prior.text() === data.key) return false;
      const clock = url(`__market_signal_alert_cooldown__/${kind}`);
      const previous = await cache.match(clock);
      if (previous && Date.now() - Number(await previous.text()) < cooldown(kind)) return false;
      await registration.showNotification(data.title, { body: data.body,
        icon: url('shockwave-app-icon-192.png'), badge: url('shockwave-app-icon-192.png'),
        tag: `market-${kind}-signal`, data: { url: targetUrl(base, kind) } });
      await cache.put(state, new Response(data.key));
      await cache.put(clock, new Response(String(Date.now())));
      return true;
    };
    return root.navigator?.locks?.request ? root.navigator.locks.request(`shock-alert:${base}:${kind}`, check) : check();
  }
  root.ShockAlerts = { COINS, KINDS, NAMES, CACHE, fresh, validPlan, price, prices, candidates, details, targetUrl, send };
})(globalThis);

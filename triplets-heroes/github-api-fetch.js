/* Include this script before game bundles only on GitHub Pages. No credential storage in JS. */
(() => {
  if (location.origin !== 'https://kimkirik.github.io') return;
  const app = document.currentScript?.dataset.app;
  const origins = { flowers:'kirik-bloom-pair', rich1:'kirik-rich-wing', rich2:'kirik-rich-starlight', paw:'kirik-paw-rescue', bap:'kirik-bap-game', quake:'kirik-earthquake-web', triplets:'triplets-heroes', mahjong:'bloom-mahjong' };
  if (!origins[app]) throw new Error('Unknown application API bridge');
  const origin = `https://${origins[app]}.vercel.app`;
  const sharedApi = ['triplets','mahjong'].includes(app);
  const apiOrigin = sharedApi ? 'https://kirik-apps-api.vercel.app' : origin;
  const apiPrefix = sharedApi ? '/api/'+app : '/api';
  const needsCookies = ['rich1','paw','bap'].includes(app);
  const nativeFetch = window.fetch.bind(window);
  let probePromise;
  function unsupported() {
    const message = '이 브라우저에서 게임 저장 연결을 확인하지 못했어요. Vercel 주소로 열거나 쿠키 설정을 확인해 주세요.';
    if (!document.getElementById('kirik-api-session-error')) {
      const banner = document.createElement('aside'); banner.id='kirik-api-session-error'; banner.setAttribute('role','alert');
      banner.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:2147483647;background:#321619;color:#fff;padding:14px;font:14px/1.5 sans-serif';
      banner.append(document.createTextNode(message+' '));
      const link=document.createElement('a');link.href=origin+'/';link.textContent='Vercel에서 열기';link.style.color='#bce3ff';banner.append(link);
      (document.body || document.documentElement).append(banner);
    }
    throw new Error(message);
  }
  async function checkCookies() {
    try {
      const options = { credentials:'include', headers:{'X-Kirik-Bridge':'1'}, cache:'no-store' };
      for (let i=0;i<2;i++) {
        const response=await nativeFetch(origin+'/api/bridge-session',options);
        if (!response.ok) return unsupported();
        if ((await response.json()).cookieSupported) return;
      }
    } catch { return unsupported(); }
    return unsupported();
  }
  window.fetch = async (input, init) => {
    const request = new Request(input instanceof Request ? input : new URL(input, location.href), init);
    const url = new URL(request.url);
    if (![location.origin, origin].includes(url.origin) || !url.pathname.startsWith('/api/')) return nativeFetch(request);
    if (needsCookies) await (probePromise ||= checkCookies().catch(error => { probePromise=undefined; throw error; }));
    const target = new URL(apiPrefix+url.pathname.slice('/api'.length)+url.search,apiOrigin);
    const headers = new Headers(request.headers);
    if (needsCookies) headers.set('X-Kirik-Bridge','1');
    const options = { method:request.method, headers, credentials:'include', cache:request.cache, redirect:'error', signal:request.signal };
    if (!['GET','HEAD'].includes(request.method)) { options.body=await request.arrayBuffer(); }
    const response = await nativeFetch(target,options);
    if (needsCookies && response.status===409 && response.headers.get('x-bridge-limitation')==='partitioned-session-unavailable') return unsupported();
    return response;
  };
})();

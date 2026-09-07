// Keep the public app address stable while a user-owned server runs collection and push.
export async function forwardIndependent(request: Request, configuredUrl?: string) {
 if (!configuredUrl) return null;
 const destination = new URL(configuredUrl);
 if (destination.protocol !== 'https:' || !destination.hostname.endsWith('.workers.dev') || destination.username || destination.password) throw new Error('Invalid independent server configuration');
 const incoming = new URL(request.url);
 const path = incoming.pathname;
 if (!/^\/api\/(config|notices|device|subscribe|receipt|test|tick|health|refresh)$/.test(path)) return Response.json({error:'not-found'},{status:404});
 const headers = new Headers();
 for (const name of ['Authorization','Content-Type','Origin']) {
  const value = request.headers.get(name); if(value) headers.set(name,value);
 }
 const body = ['GET','HEAD'].includes(request.method) ? undefined : await request.text();
 if (body && body.length > 12000) return Response.json({error:'request-too-large'},{status:413});
 const result = await fetch(new URL(path + incoming.search,destination), {method:request.method,headers,body,redirect:'manual',signal:AbortSignal.timeout(25000)});
 if (result.status >= 300 && result.status < 400) throw new Error('Independent API redirect rejected');
 return new Response(result.body,{status:result.status,headers:{'Content-Type':result.headers.get('Content-Type')||'application/json','Cache-Control':'no-store'}});
}

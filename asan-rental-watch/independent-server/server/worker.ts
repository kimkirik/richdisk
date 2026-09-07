import { DurableObject } from 'cloudflare:workers';
import { importExisting } from './migration.ts';
import { buildAlerts } from './alerts.ts';
import { handle, OPTIONS } from './api.ts';
import { getState, setState, throttle, tick, deliverPending, putEvent, type Bindings } from './service.ts';
import { initialize, sqliteDatabase } from './storage.ts';
import { inspectLhBatch, scanSource, sourceNames, type LhCandidate } from './collector.ts';
import { reconcileNotices, type ScanResult } from './reconcile.ts';
import type { NoticeResponse } from './notices.ts';
import seed from './seed.json';

type Environment = {
  WATCH: DurableObjectNamespace<RentalWatch>;
  SCANNERS: DurableObjectNamespace<SourceScanner>;
  ASSETS: Fetcher;
  MIGRATION_TOKEN?: string;
  APP_URL: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
};
const interval = 10 * 60 * 1000;

export class SourceScanner extends DurableObject<Environment> {
  async scan(source: string): Promise<ScanResult> {
    // Independent invocations bound network subrequests, including the nationwide LH detail crawl.
    return scanSource(source, (items, offset) => this.env.SCANNERS.getByName('lh-details-' + offset).details(items));
  }
  async details(items: LhCandidate[]): Promise<ScanResult> { return inspectLhBatch(items); }
}

export class RentalWatch extends DurableObject<Environment> {
  constructor(ctx: DurableObjectState, env: Environment) {
    super(ctx, env);
    initialize(ctx.storage);
  }
  private bindings(appUrl: string): Bindings {
    return { DB: sqliteDatabase(this.ctx.storage), APP_URL: appUrl, VAPID_PUBLIC_KEY: this.env.VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY: this.env.VAPID_PRIVATE_KEY };
  }
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/migrate") return importExisting(request,this.ctx.storage,this.env.MIGRATION_TOKEN);
    const appUrl = this.env.APP_URL || url.origin + '/';
    const e = this.bindings(appUrl);
    // Initialize once without presenting the bundled snapshot as a fresh collection.
    if (!await getState(e, 'snapshot')) await setState(e, 'snapshot', seed);
    if (!await getState(e, 'appUrl')) await setState(e, 'appUrl', appUrl);
    if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(Date.now() + 1000);
    if ((url.pathname === '/data/notices.json' || url.pathname === '/api/notices')) return Response.json(await getState(e, 'snapshot'), { headers: { 'Cache-Control': 'no-store' } });
    if (url.pathname === '/api/refresh' && request.method === 'POST') {
      if (!await throttle(e,'refresh-lock',120000)) return Response.json({status:'already-requested'});
      await setState(e,'refresh-requested',true);
      await this.ctx.storage.setAlarm(Date.now()+1000);
      return Response.json({status:'scheduled'},{status:202});
    }
    if (url.pathname === '/api/health') return Response.json({ progress: await getState(e, 'progress'), collector: await getState(e, 'collector'), health: await getState(e, 'health'), nextCheck: await this.ctx.storage.getAlarm(), runtime: 'cloudflare-independent' }, { headers: { 'Cache-Control': 'no-store' } });
    if (request.method === 'OPTIONS') return OPTIONS(request);
    return handle(request, e);
  }
  async alarm(): Promise<void> {
    const e = this.bindings(await getState(this.bindings(''), 'appUrl'));
    // Persist the next wake-up before doing network work. No browser or GitHub scheduler is needed.
    await this.ctx.storage.setAlarm(Date.now() + interval);
    const collector = await getState(e, 'collector');
    if (await getState(e,'refresh-requested') || !collector?.finishedAt || Date.now() - Date.parse(collector.startedAt) >= 30 * 60000) {
      await setState(e,'refresh-requested',false);
      const startedAt = new Date().toISOString();
      await setState(e, 'collector', { ...collector, startedAt, status: 'checking' });
      await setState(e,'progress',{});
      try {
        const previous = await getState(e, 'snapshot') as NoticeResponse;
        const completed = new Map<string,ScanResult>();
        let publishing = Promise.resolve();
        const scans = await Promise.all(sourceNames.map(async source => {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let result: ScanResult;
          try { result = await Promise.race([this.env.SCANNERS.getByName(source+'-apac',{locationHint:'apac'}).scan(source),new Promise<ScanResult>((_,reject)=>{timer=setTimeout(()=>reject(new Error('source-timeout')),7*60000);})]); }
          catch { result = { healthy: false, notices: [] }; }
          finally { clearTimeout(timer); }
          completed.set(source,result);
          publishing = publishing.then(async()=>{
            const partialScans=sourceNames.filter(name=>completed.has(name)).map(name=>({source:name,result:completed.get(name)!}));
            const records=reconcileNotices(previous||seed,partialScans);
            const snapshot={...records,checkedAt:startedAt,sourceCount:sourceNames.length,healthySourceCount:partialScans.filter(s=>s.result.healthy).length,sourceHealth:Object.fromEntries(sourceNames.map(name=>[name,completed.get(name)?.healthy||false]))};
            await setState(e,'snapshot',snapshot);
            await setState(e,'progress',Object.fromEntries(partialScans.map(s=>[s.source,{healthy:s.result.healthy,count:s.result.notices.length}])));
            const updates=buildAlerts(snapshot,await getState(e,'known'),Date.now());
            for(const alert of updates.alerts) await putEvent(e,alert);
            await setState(e,'known',updates.known);
            await deliverPending(e);
          });
          await publishing;
          return {source,result};
        }));
        const records = reconcileNotices(previous || seed, scans);
        const snapshot = { ...records, checkedAt: startedAt, sourceCount: sourceNames.length,
          healthySourceCount: scans.filter(s => s.result.healthy).length,
          sourceHealth: Object.fromEntries(scans.map(s => [s.source, s.result.healthy])) };
        await setState(e, 'snapshot', snapshot);
        await setState(e, 'collector', { startedAt, finishedAt: new Date().toISOString(), status: 'checked', healthySourceCount: snapshot.healthySourceCount });
      } catch {
        await setState(e, 'collector', { ...collector, startedAt, status: 'failed' });
      }
    }
    await tick(e);
  }
}

export default {
  async fetch(request: Request, env: Environment): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.startsWith('/api/') || path === '/data/notices.json') return env.WATCH.getByName('asan').fetch(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Environment>;

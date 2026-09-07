import { hash } from './service.ts';
const columns: Record<string,string[]> = {
 devices:['id','token_hash','subscription','created_at','updated_at'],
 events:['id','title','body','created_at','expires_at','audience'],
 deliveries:['device_id','event_id','sent_at','received_at','attempts','next_attempt_at','last_error'],
};
export async function importExisting(request:Request, storage:DurableObjectStorage, secret?:string) {
 const supplied=request.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 if(request.method!=='POST'||!secret||supplied.length!==64||await hash(supplied)!==await hash(secret)) return Response.json({error:'not-found'},{status:404});
 if(storage.sql.exec("SELECT key FROM state WHERE key='migration-complete'").toArray().length) return Response.json({error:'already-imported'},{status:409});
 const raw=await request.text();if(raw.length>1000000) return Response.json({error:'too-large'},{status:413});
 const data=JSON.parse(raw);
 for(const [table,fields] of Object.entries(columns)){
  if(!Array.isArray(data[table])||data[table].length>1000) return Response.json({error:'invalid-data'},{status:400});
  for(const row of data[table]) for(const field of fields) if(row[field]!==null&&typeof row[field]!=='string'&&typeof row[field]!=='number') return Response.json({error:'invalid-data'},{status:400});
 }
 storage.transactionSync(()=>{
  for(const [table,fields] of Object.entries(columns)) for(const row of data[table]) storage.sql.exec(`INSERT OR IGNORE INTO ${table}(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,...fields.map(f=>row[f]));
  if(Array.isArray(data.known)&&data.known.every((s:unknown)=>typeof s==='string')) storage.sql.exec("INSERT INTO state(key,value) VALUES('known',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",JSON.stringify(data.known));
  storage.sql.exec("INSERT INTO state(key,value) VALUES('migration-complete',?)",JSON.stringify(new Date().toISOString()));
 });
 return Response.json({imported:Object.fromEntries(Object.keys(columns).map(t=>[t,data[t].length]))});
}

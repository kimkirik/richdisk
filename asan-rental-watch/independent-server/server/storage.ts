// A small adapter keeps the tested parameterized SQL delivery code unchanged.
export function sqliteDatabase(storage: DurableObjectStorage): D1Database {
  function prepare(query: string, args: unknown[] = []): any {
    const rows = () => storage.sql.exec(query, ...(args as (string | number | null)[])).toArray();
    return { bind: (...values: unknown[]) => prepare(query, values),
      first: async () => rows()[0] ?? null,
      all: async () => ({ results: rows() }),
      run: async () => { rows(); return { success: true }; },
      execute: rows,
    };
  }
  return { prepare, batch: async (statements: any[]) => storage.transactionSync(() => statements.map(s => s.execute())) } as unknown as D1Database;
}
export function initialize(storage: DurableObjectStorage) {
  storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS devices(id TEXT PRIMARY KEY,token_hash TEXT NOT NULL,subscription TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token_hash);
    CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,title TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,audience TEXT);
    CREATE INDEX IF NOT EXISTS idx_events_expiry ON events(expires_at);
    CREATE TABLE IF NOT EXISTS deliveries(device_id TEXT NOT NULL,event_id TEXT NOT NULL,sent_at INTEGER,received_at INTEGER,attempts INTEGER NOT NULL DEFAULT 0,next_attempt_at INTEGER NOT NULL DEFAULT 0,last_error TEXT,PRIMARY KEY(device_id,event_id));
    CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,value TEXT NOT NULL);
  `);
}

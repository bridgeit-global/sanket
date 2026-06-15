import 'server-only';

import postgres from 'postgres';
import type { Sql, Options } from 'postgres';

const PG_GLOBAL_KEY = '__sanket_pg_sql__' as const;

type PgGlobal = typeof globalThis & {
  [PG_GLOBAL_KEY]?: Sql;
};

function usesSupabasePooler(url: string): boolean {
  return (
    url.includes('.pooler.supabase.com') ||
    /\/\/postgres\.[a-z0-9]+:/i.test(url)
  );
}

/** Session pooler (port 5432) holds one DB connection per client; transaction pooler (6543) multiplexes. */
function isSupabaseSessionPooler(url: string): boolean {
  if (!usesSupabasePooler(url)) return false;
  try {
    const { port } = new URL(url);
    return port === '' || port === '5432';
  } catch {
    return url.includes(':5432/');
  }
}

function resolvePoolOptions(url: string): Options<Record<string, never>> {
  const pooler = usesSupabasePooler(url);
  const sessionMode = isSupabaseSessionPooler(url);

  return {
    // Session mode: one real connection per pool slot (Supabase default limit: 15).
    // Transaction mode: connections are multiplexed — a small pool is safe per process.
    max: sessionMode ? 1 : pooler ? 5 : 10,
    idle_timeout: 20,
    max_lifetime: 60 * 10,
    connect_timeout: 10,
    prepare: pooler ? false : undefined,
  };
}

function getSql(): Sql {
  const globalStore = globalThis as PgGlobal;
  if (globalStore[PG_GLOBAL_KEY]) {
    return globalStore[PG_GLOBAL_KEY];
  }

  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is not set');
  }

  globalStore[PG_GLOBAL_KEY] = postgres(url, resolvePoolOptions(url));
  return globalStore[PG_GLOBAL_KEY];
}

/** Lazy postgres client for complex raw SQL — single global pool, survives dev HMR. */
export const sql = new Proxy((() => {}) as unknown as Sql, {
  apply(_target, _thisArg, args) {
    return (getSql() as unknown as (...a: unknown[]) => unknown)(...args);
  },
  get(_target, prop: string | symbol) {
    const value = Reflect.get(getSql() as object, prop, getSql());
    if (typeof value === 'function') {
      return value.bind(getSql());
    }
    return value;
  },
});

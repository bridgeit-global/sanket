import 'server-only';

import postgres from 'postgres';
import type { Sql } from 'postgres';

let client: Sql | undefined;

function usesSupabasePooler(url: string): boolean {
  return (
    url.includes('.pooler.supabase.com') ||
    /\/\/postgres\.[a-z0-9]+:/i.test(url)
  );
}

function getSql(): Sql {
  if (client) return client;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is not set');
  }
  // Transaction pooler mode rejects prepared statements — disable for Supabase pooler URLs.
  client = postgres(url, {
    max: 1,
    prepare: usesSupabasePooler(url) ? false : undefined,
  });
  return client;
}

/** Lazy postgres client for complex raw SQL — initialized on first use. */
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

import 'server-only';

import postgres from 'postgres';
import type { Sql } from 'postgres';

let client: Sql | undefined;

function getSql(): Sql {
  if (client) return client;
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error('SUPABASE_DB_URL is not set');
  }
  client = postgres(url, { max: 1 });
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

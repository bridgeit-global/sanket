import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from './config';

let client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (client) return client;

  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return client;
}

/** Lazy Supabase client — initialized on first use, not at module load. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop: string | symbol) {
    const value = Reflect.get(getClient(), prop, getClient());
    if (typeof value === 'function') {
      return value.bind(getClient());
    }
    return value;
  },
});

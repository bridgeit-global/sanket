import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  resolveServiceRoleKey,
  resolveSupabaseUrl,
  validateSupabaseEnv,
} from './config';
import type { Database } from './database.types';

let client: SupabaseClient<Database> | undefined;

/** Supabase client with generated `Database` types (use for new typed queries). */
export function getTypedSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  validateSupabaseEnv();

  client = createClient<Database>(resolveSupabaseUrl(), resolveServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
}

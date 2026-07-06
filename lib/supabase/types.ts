import type { Database } from './database.types';

export type { Database } from './database.types';
export type AppSupabaseClient = import('@supabase/supabase-js').SupabaseClient<Database>;
export type PublicTableName = keyof Database['public']['Tables'];
export type Tables<T extends PublicTableName> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends PublicTableName> =
  Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends PublicTableName> =
  Database['public']['Tables'][T]['Update'];

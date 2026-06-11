/**
 * Resolve Supabase API URL from env or derive from SUPABASE_DB_URL.
 *
 * Supports:
 * - NEXT_PUBLIC_SUPABASE_URL (explicit)
 * - SUPABASE_PROJECT_REF
 * - Direct: postgresql://...@db.[ref].supabase.co:5432/...
 * - Pooler: postgresql://postgres.[ref]:...@aws-0-....pooler.supabase.com:5432/...
 */
export function resolveSupabaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const projectRef = process.env.SUPABASE_PROJECT_REF;
  if (projectRef) {
    return `https://${projectRef}.supabase.co`;
  }

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    const directHost = dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
    if (directHost?.[1]) {
      return `https://${directHost[1]}.supabase.co`;
    }

    const poolerUser = dbUrl.match(/\/\/postgres\.([a-z0-9]+):/i);
    if (poolerUser?.[1]) {
      return `https://${poolerUser[1]}.supabase.co`;
    }
  }

  throw new Error(
    'Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_PROJECT_REF, or use a standard Supabase SUPABASE_DB_URL',
  );
}

export function resolveServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set (Supabase Dashboard → Settings → API → service_role)',
    );
  }
  return key;
}

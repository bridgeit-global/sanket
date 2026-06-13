function getProjectRefFromServiceRoleKey(key: string): string | null {
  try {
    const payloadPart = key.split('.')[1];
    if (!payloadPart) return null;

    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as { ref?: string };

    return typeof payload.ref === 'string' ? payload.ref : null;
  } catch {
    return null;
  }
}

function getProjectRefFromUrl(url: string): string | null {
  return url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/i)?.[1] ?? null;
}

function getProjectRefFromDbUrl(dbUrl: string): string | null {
  const directHost = dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
  if (directHost?.[1]) return directHost[1];

  const poolerUser = dbUrl.match(/\/\/postgres\.([a-z0-9]+):/i);
  if (poolerUser?.[1]) return poolerUser[1];

  return null;
}

/**
 * Ensure Supabase REST env vars point at the same project.
 * A common production failure: NEXT_PUBLIC_SUPABASE_URL from dev while
 * SUPABASE_SERVICE_ROLE_KEY / SUPABASE_DB_URL are from prod (or vice versa).
 */
export function validateSupabaseEnv(): void {
  const url = resolveSupabaseUrl();
  const key = resolveServiceRoleKey();
  const urlRef = getProjectRefFromUrl(url);
  const keyRef = getProjectRefFromServiceRoleKey(key);
  const dbUrl = process.env.SUPABASE_DB_URL;
  const dbRef = dbUrl ? getProjectRefFromDbUrl(dbUrl) : null;

  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `Supabase env mismatch: API URL project "${urlRef}" does not match service role key project "${keyRef}". ` +
        'Set NEXT_PUBLIC_SUPABASE_URL (or remove it), SUPABASE_DB_URL, and SUPABASE_SERVICE_ROLE_KEY from the same Supabase project.',
    );
  }

  if (dbRef && urlRef && dbRef !== urlRef) {
    throw new Error(
      `Supabase env mismatch: SUPABASE_DB_URL project "${dbRef}" does not match API URL project "${urlRef}". ` +
        'Align NEXT_PUBLIC_SUPABASE_URL with SUPABASE_DB_URL or unset NEXT_PUBLIC_SUPABASE_URL so it is derived from the DB URL.',
    );
  }
}

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

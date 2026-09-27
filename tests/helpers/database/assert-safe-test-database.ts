import postgres, { type Sql } from 'postgres';

export const LOCAL_SUPABASE_DEFAULTS = {
  host: '127.0.0.1',
  apiPort: 54421,
  databasePort: 54422,
  projectId: 'sanket',
} as const;

export type SafeTestDatabase = {
  url: string;
  host: string;
  port: number;
  database: string;
  environment: 'test';
  disposable: boolean;
  isLocal: boolean;
};

export type TestDatabaseSafetyInput = {
  url?: string;
  environment?: string;
  disposable?: boolean;
};

const REMOTE_SUPABASE_HOST = /(^|\.)supabase\.(co|com)$/i;
const REMOTE_SUPABASE_POOLER_HOST = /(^|\.)pooler\.supabase\.com$/i;
const PRODUCTION_OR_STAGING_MARKER = /(^|[._-])(production|prod|staging|stage)([._-]|$)/i;

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function environmentFromProcess(): string | undefined {
  return process.env.TEST_DATABASE_ENVIRONMENT?.trim() || undefined;
}

function disposableFromProcess(): boolean {
  return process.env.TEST_DATABASE_DISPOSABLE?.trim().toLowerCase() === 'true';
}

/**
 * Fail-closed database guard for destructive integration-test setup.
 *
 * This function intentionally does not inspect SUPABASE_DB_URL, DATABASE_URL,
 * .env.local, or deployment variables. Test callers must opt into a dedicated
 * TEST_DATABASE_URL and identify it as a test/disposable database.
 */
export function assertSafeTestDatabase(
  input: TestDatabaseSafetyInput = {},
): SafeTestDatabase {
  const url = (input.url ?? process.env.TEST_DATABASE_URL)?.trim();
  const environment = (
    input.environment ?? environmentFromProcess()
  )?.trim().toLowerCase();
  const disposable = input.disposable ?? disposableFromProcess();

  if (!url) {
    throw new Error(
      'TEST-INFRA-DB-001: TEST_DATABASE_URL is required; refusing an unverified database.',
    );
  }

  if (environment !== 'test') {
    throw new Error(
      'TEST-INFRA-DB-002: TEST_DATABASE_ENVIRONMENT must be exactly "test".',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'TEST-INFRA-DB-003: TEST_DATABASE_URL is not a valid PostgreSQL URL.',
    );
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error(
      'TEST-INFRA-DB-004: only postgres:// or postgresql:// test URLs are allowed.',
    );
  }

  const host = parsed.hostname.toLowerCase();
  const normalizedUrl = url.toLowerCase();

  if (
    REMOTE_SUPABASE_HOST.test(host) ||
    REMOTE_SUPABASE_POOLER_HOST.test(host) ||
    host.includes('supabase')
  ) {
    throw new Error(
      'TEST-INFRA-DB-005: remote Supabase databases are never allowed for integration tests.',
    );
  }

  if (PRODUCTION_OR_STAGING_MARKER.test(host) || PRODUCTION_OR_STAGING_MARKER.test(normalizedUrl)) {
    throw new Error(
      'TEST-INFRA-DB-006: production and staging database targets are never allowed.',
    );
  }

  const isLocal = isLoopbackHost(host);
  const port = Number(parsed.port || 5432);
  const isConfiguredLocalSupabasePort =
    isLocal && port === LOCAL_SUPABASE_DEFAULTS.databasePort;

  if (!isLocal && !disposable) {
    throw new Error(
      'TEST-INFRA-DB-007: non-local databases require explicit disposable=true.',
    );
  }

  if (isLocal && !isConfiguredLocalSupabasePort && !disposable) {
    throw new Error(
      `TEST-INFRA-DB-008: local test database must use port ${LOCAL_SUPABASE_DEFAULTS.databasePort} unless explicitly disposable.`,
    );
  }

  return {
    url,
    host,
    port,
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    environment: 'test',
    disposable,
    isLocal,
  };
}

/** Create a raw SQL client only after the safety guard has passed. */
export function getTestDb(): Sql {
  const safe = assertSafeTestDatabase();
  return postgres(safe.url, {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 10,
    prepare: false,
  });
}

const ROLLBACK_TEST_TRANSACTION = Symbol('rollback-test-transaction');

/**
 * Run a future fixture operation in a transaction and roll it back on success.
 * This keeps the default test path isolated; callers own domain-level cleanup
 * only when a route or worker must use a separate database connection. The
 * helper never issues an unscoped TRUNCATE or CASCADE command.
 */
export async function createTestTransaction<T>(
  work: (transaction: Sql) => Promise<T>,
  db?: Sql,
): Promise<T> {
  const client = db ?? getTestDb();
  let result: T;
  try {
    try {
      await client.begin(async (transaction) => {
        result = await work(transaction as Sql);
        throw ROLLBACK_TEST_TRANSACTION;
      });
    } catch (error) {
      if (error !== ROLLBACK_TEST_TRANSACTION) throw error;
    }
    return result!;
  } finally {
    if (!db) await client.end({ timeout: 5 });
  }
}

/**
 * Cleanup is intentionally a no-op until fixture-owned tables and predicates
 * are registered. This is safer than a global TRUNCATE CASCADE against a
 * schema that contains real application data.
 */
export async function resetKnownTestData(): Promise<{
  status: 'noop';
  reason: string;
}> {
  return {
    status: 'noop',
    reason: 'No fixture-owned cleanup handlers are registered yet.',
  };
}

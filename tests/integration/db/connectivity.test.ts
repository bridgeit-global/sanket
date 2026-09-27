import { describe, expect, it } from 'vitest';
import {
  assertSafeTestDatabase,
  getTestDb,
} from '@/tests/helpers/database/assert-safe-test-database';

function isLocalDatabaseUnavailable(error: unknown): boolean {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String(error.code)
      : '';
  return (
    ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(code) ||
    /connection|connect|timeout/i.test(String(error))
  );
}

describe('local Supabase connectivity', () => {
  // TEST-INFRA-DB-006
  if (!process.env.TEST_DATABASE_URL) {
    it.skip('requires TEST_DATABASE_URL from .env.test; local Supabase is not running/configured', () => {});
  } else {
    it('executes a non-destructive SELECT 1', async ({ skip }) => {
      // Guard validation is deliberately outside the connection-error branch:
      // an unsafe target must fail, never become a skipped test.
      const safe = assertSafeTestDatabase();
      let db: ReturnType<typeof getTestDb> | undefined;
      try {
        db = getTestDb();
        const rows = await db<{ ok: number }[]>`SELECT 1 AS ok`;
        expect(rows[0]?.ok).toBe(1);
      } catch (error) {
        if (safe.isLocal && isLocalDatabaseUnavailable(error)) {
          skip(
            'INTEGRATION DB HARNESS: BLOCKED — LOCAL SUPABASE NOT RUNNING',
          );
          return;
        }
        throw error;
      } finally {
        if (db) await db.end({ timeout: 5 });
      }
    });
  }
});

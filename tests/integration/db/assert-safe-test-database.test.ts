import { describe, expect, it } from 'vitest';
import { assertSafeTestDatabase } from '@/tests/helpers/database/assert-safe-test-database';

describe('database safety guard', () => {
  // TEST-INFRA-DB-001
  it('rejects a production-like database URL', () => {
    expect(() =>
      assertSafeTestDatabase({
        url: 'postgresql://test:secret@db.production.example.test:5432/app',
        environment: 'test',
      }),
    ).toThrow(/production and staging/i);
  });

  // TEST-INFRA-DB-002
  it('rejects a remote Supabase URL', () => {
    expect(() =>
      assertSafeTestDatabase({
        url: 'postgresql://test:secret@db.example.supabase.co:5432/postgres',
        environment: 'test',
        disposable: true,
      }),
    ).toThrow(/remote Supabase/i);
  });

  // TEST-INFRA-DB-003
  it('rejects an unknown, unverified database URL', () => {
    expect(() =>
      assertSafeTestDatabase({
        url: 'postgresql://test:secret@db.example.invalid:5432/app',
        environment: 'test',
      }),
    ).toThrow(/non-local databases require explicit disposable/i);
  });

  // TEST-INFRA-DB-004
  it('allows the configured local Supabase test database', () => {
    expect(
      assertSafeTestDatabase({
        url: 'postgresql://postgres:postgres@127.0.0.1:54422/postgres',
        environment: 'test',
      }),
    ).toMatchObject({
      host: '127.0.0.1',
      port: 54422,
      database: 'postgres',
      environment: 'test',
      disposable: false,
      isLocal: true,
    });
  });

  // TEST-INFRA-DB-005
  it('fails closed when the environment is not explicitly test', () => {
    expect(() =>
      assertSafeTestDatabase({
        url: 'postgresql://postgres:postgres@127.0.0.1:54422/postgres',
        environment: 'development',
      }),
    ).toThrow(/exactly "test"/i);
  });
});

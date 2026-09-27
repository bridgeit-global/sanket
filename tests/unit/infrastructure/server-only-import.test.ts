import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('server-only test adapter', () => {
  // TEST-INFRA-SERVER-001
  it('imports a server-only production module without removing its source boundary', async () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/db/postgres.ts'),
      'utf8',
    );

    expect(source).toContain("import 'server-only'");

    const serverModule = await import('@/lib/db/postgres');

    expect(serverModule.sql).toBeDefined();
  });
});

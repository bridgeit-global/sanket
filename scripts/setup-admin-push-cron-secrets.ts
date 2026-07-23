/**
 * Upsert Supabase Vault secrets used by private.invoke_admin_push_cron().
 *
 * Required env:
 *   SUPABASE_DB_URL
 *   CRON_SECRET
 *   ADMIN_PUSH_CRON_URL (optional; defaults to https://sanket-snowy.vercel.app/api/cron/admin-push)
 *
 * Usage:
 *   CRON_SECRET=... ADMIN_PUSH_CRON_URL=... pnpm exec tsx scripts/setup-admin-push-cron-secrets.ts
 */
import dotenv from 'dotenv';

// dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.local' });
dotenv.config();

import postgres from 'postgres';

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function upsertVaultSecret(
  sql: postgres.Sql,
  name: string,
  secret: string,
  description: string,
) {
  const existing = await sql<{ id: string }[]>`
    select id::text as id
    from vault.secrets
    where name = ${name}
    limit 1
  `;

  if (existing[0]?.id) {
    await sql`
      select vault.update_secret(${existing[0].id}::uuid, ${secret}, ${name}, ${description})
    `;
    console.log(`Updated vault secret: ${name}`);
    return;
  }

  await sql`
    select vault.create_secret(${secret}, ${name}, ${description})
  `;
  console.log(`Created vault secret: ${name}`);
}

async function main() {
  const dbUrl = requireEnv('SUPABASE_DB_URL');
  const cronSecret = requireEnv('CRON_SECRET');
  const cronUrl =
    process.env.ADMIN_PUSH_CRON_URL?.trim() ||
    'https://sanket-snowy.vercel.app/api/cron/admin-push';

  const sql = postgres(dbUrl, { max: 1, prepare: false });

  try {
    await upsertVaultSecret(
      sql,
      'admin_push_cron_url',
      cronUrl,
      'Full URL for admin push cron (GET /api/cron/admin-push)',
    );
    await upsertVaultSecret(
      sql,
      'cron_secret',
      cronSecret,
      'Bearer token for /api/cron/*',
    );

    const jobs = await sql`
      select jobid, jobname, schedule, active
      from cron.job
      where jobname = 'admin-push-notifications'
    `;
    console.log('Cron job:', jobs[0] ?? '(not found — apply migration first)');
    console.log('Done. Trigger a test run with:');
    console.log("  select private.invoke_admin_push_cron();");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

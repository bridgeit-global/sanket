/**
 * Smoke-test Supabase client + postgres after migration.
 * Usage: npx tsx scripts/verify-db-connection.ts
 * Requires: SUPABASE_DB_URL, SUPABASE_SERVICE_ROLE_KEY
 *           (NEXT_PUBLIC_SUPABASE_URL optional — derived from DB URL)
 */
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL is not set');
    process.exit(1);
  }

  const supabaseUrl = resolveSupabaseUrl();
  console.log(`Supabase URL: ${supabaseUrl}`);

  const serviceKey = resolveServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Supabase client — simple read
  const { data: users, error: userError } = await supabase
    .from('User')
    .select('id')
    .limit(1);
  if (userError) {
    console.error('❌ Supabase User query failed:', userError.message);
    process.exit(1);
  }
  console.log(`✅ Supabase client OK (User rows sample: ${users?.length ?? 0})`);

  // Raw postgres — complex read
  const sql = postgres(dbUrl, { max: 1 });
  try {
    const [row] = await sql`SELECT COUNT(*)::int AS count FROM "VoterMaster"`;
    console.log(`✅ Postgres client OK (VoterMaster count: ${row?.count ?? 0})`);
  } finally {
    await sql.end();
  }

  // Supabase — election list
  const { data: elections, error: electionError } = await supabase
    .from('ElectionMaster')
    .select('election_id')
    .limit(3);
  if (electionError) {
    console.error('❌ Supabase ElectionMaster query failed:', electionError.message);
    process.exit(1);
  }
  console.log(`✅ ElectionMaster OK (${elections?.length ?? 0} rows)`);

  console.log('\nAll database checks passed.');
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});

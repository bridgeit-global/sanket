/**
 * Seed Ward 144, Booth 53 BLA agents using Supabase JS client (REST API).
 * Usage: pnpm exec tsx --env-file=.env.local scripts/seed-ward144-booth53-bla.ts
 */
import { createClient } from '@supabase/supabase-js';

// Derive Supabase URL from SUPABASE_DB_URL pooler format
function resolveSupabaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (dbUrl) {
    const poolerUser = dbUrl.match(/\/\/postgres\.([a-z0-9]+):/i);
    if (poolerUser?.[1]) return `https://${poolerUser[1]}.supabase.co`;
    const directHost = dbUrl.match(/@db\.([a-z0-9]+)\.supabase\.co/i);
    if (directHost?.[1]) return `https://${directHost[1]}.supabase.co`;
  }
  throw new Error('Cannot resolve Supabase URL. Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_URL.');
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set');
    process.exit(1);
  }

  console.log(`Connecting to Supabase: ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Configuration constants ---
  const MEMBER_1_ID = '7c5d5b41-b765-4a74-8961-2c18659b0e64';
  const MEMBER_2_ID = 'addc5a1d-4385-4786-a8a9-3cf3813cad2d';
  const POST_1_ID = '6e603cd6-7e03-4644-9536-f1a063721660';
  const POST_2_ID = 'a436c3c5-9898-4bee-9d5d-239c6cd4d5a5';
  const BLA_POSITION_ID = '30a9266d-6c3a-4d76-9a9f-0f6763c8c644';
  const CONSTITUENCY_ID = '172';
  const BOOTH_NO = '53';

  // ---- Step 1: Get Ward 144 geo unit ----
  console.log('Step 1: Looking up Ward 144...');
  let { data: wardRows, error: wardErr } = await supabase
    .from('CadreGeographicUnit')
    .select('id')
    .eq('type', 'ward')
    .eq('name', 'Ward 144')
    .limit(1);
  if (wardErr) throw new Error(`Ward lookup failed: ${wardErr.message}`);

  let wardGeoId: string;
  if (!wardRows || wardRows.length === 0) {
    console.log('  Ward 144 not found, creating...');
    const { data: newWard, error: newWardErr } = await supabase
      .from('CadreGeographicUnit')
      .insert({ type: 'ward', name: 'Ward 144', ac_no: CONSTITUENCY_ID, sort_order: 144 })
      .select('id')
      .single();
    if (newWardErr) throw new Error(`Ward insert failed: ${newWardErr.message}`);
    wardGeoId = newWard.id;
    console.log(`  Created Ward 144: ${wardGeoId}`);
  } else {
    wardGeoId = wardRows[0].id;
    console.log(`  Found Ward 144: ${wardGeoId}`);
  }

  // ---- Step 2: Get BLA Position Level ----
  console.log('Step 2: Looking up BLA position level...');
  const { data: levelRows, error: levelErr } = await supabase
    .from('CadrePositionLevel')
    .select('id')
    .eq('key', 'booth_bla')
    .limit(1);
  if (levelErr) throw new Error(`Level lookup failed: ${levelErr.message}`);
  if (!levelRows || levelRows.length === 0) throw new Error('booth_bla level not found — run migrations first');
  const levelId = levelRows[0].id;
  console.log(`  BLA level id: ${levelId}`);

  // ---- Step 3: Ensure BLA position exists with the exact ID ----
  console.log('Step 3: Ensuring BLA position...');
  const { data: posRow } = await supabase
    .from('CadrePosition')
    .select('id')
    .eq('id', BLA_POSITION_ID)
    .maybeSingle();

  if (!posRow) {
    // Delete any existing BLA position for this level, then insert with exact ID
    await supabase
      .from('CadrePosition')
      .delete()
      .eq('level_id', levelId)
      .eq('name', 'BLA (Booth Level Agent)');
    const { error: posInsErr } = await supabase
      .from('CadrePosition')
      .insert({ id: BLA_POSITION_ID, level_id: levelId, name: 'BLA (Booth Level Agent)', sort_order: 1, is_active: true });
    if (posInsErr) throw new Error(`Position insert failed: ${posInsErr.message}`);
    console.log(`  Created BLA position: ${BLA_POSITION_ID}`);
  } else {
    console.log(`  BLA position exists: ${BLA_POSITION_ID}`);
  }

  // ---- Step 4: Get the Basic vertical (max_geo_level = booth) ----
  console.log('Step 4: Finding Basic vertical...');
  const { data: verticalRows, error: vertErr } = await supabase
    .from('CadreVertical')
    .select('id, max_geo_level')
    .eq('name', 'Basic')
    .limit(1);
  if (vertErr) throw new Error(`Vertical lookup failed: ${vertErr.message}`);
  if (!verticalRows || verticalRows.length === 0) throw new Error('Basic vertical not found — run migrations first');
  const verticalId = verticalRows[0].id;
  console.log(`  Basic vertical: ${verticalId} (max_geo_level: ${verticalRows[0].max_geo_level})`);

  if (verticalRows[0].max_geo_level !== 'booth') {
    console.log('  Updating max_geo_level to booth...');
    await supabase.from('CadreVertical').update({ max_geo_level: 'booth' }).eq('id', verticalId);
  }

  // ---- Step 5: Upsert Agent 1 — Nazir Dagadu Mulani ----
  console.log('Step 5: Upserting Agent 1 (Nazir Dagadu Mulani)...');
  const { error: m1Err } = await supabase.from('CadreMember').upsert({
    id: MEMBER_1_ID,
    person_name: 'Nazir Dagadu Mulani',
    epic_number: 'NCT2893600',
    constituency_id: CONSTITUENCY_ID,
    is_active: true,
  }, { onConflict: 'id' });
  if (m1Err) throw new Error(`Agent 1 upsert failed: ${m1Err.message}`);

  await supabase.from('CadreMemberVertical').upsert({
    member_id: MEMBER_1_ID, vertical_id: verticalId, is_primary: true,
  }, { onConflict: 'member_id,vertical_id' });

  const { error: p1Err } = await supabase.from('CadreMemberPost').upsert({
    id: POST_1_ID,
    member_id: MEMBER_1_ID,
    position_id: BLA_POSITION_ID,
    vertical_id: verticalId,
    ward_geo_id: wardGeoId,
    booth_no: BOOTH_NO,
    is_primary: true,
    sort_order: 1,
  }, { onConflict: 'id' });
  if (p1Err) throw new Error(`Post 1 upsert failed: ${p1Err.message}`);
  console.log('  ✅ Agent 1 done');

  // ---- Step 6: Upsert Agent 2 — Sanjiva Krushnarao Kulkarni ----
  console.log('Step 6: Upserting Agent 2 (Sanjiva Krushnarao Kulkarni)...');
  const { error: m2Err } = await supabase.from('CadreMember').upsert({
    id: MEMBER_2_ID,
    person_name: 'Sanjiva Krushnarao Kulkarni',
    epic_number: 'NCT0092491',
    constituency_id: CONSTITUENCY_ID,
    is_active: true,
  }, { onConflict: 'id' });
  if (m2Err) throw new Error(`Agent 2 upsert failed: ${m2Err.message}`);

  await supabase.from('CadreMemberVertical').upsert({
    member_id: MEMBER_2_ID, vertical_id: verticalId, is_primary: true,
  }, { onConflict: 'member_id,vertical_id' });

  const { error: p2Err } = await supabase.from('CadreMemberPost').upsert({
    id: POST_2_ID,
    member_id: MEMBER_2_ID,
    position_id: BLA_POSITION_ID,
    vertical_id: verticalId,
    ward_geo_id: wardGeoId,
    booth_no: BOOTH_NO,
    is_primary: true,
    sort_order: 2,
  }, { onConflict: 'id' });
  if (p2Err) throw new Error(`Post 2 upsert failed: ${p2Err.message}`);
  console.log('  ✅ Agent 2 done');

  // ---- Step 7: Verify ----
  console.log('\nStep 7: Verifying records...');
  const { data: verifyPosts } = await supabase
    .from('CadreMemberPost')
    .select('id, member_id, booth_no, sort_order')
    .in('id', [POST_1_ID, POST_2_ID]);
  console.log('Posts in DB:', verifyPosts);

  const { data: verifyMembers } = await supabase
    .from('CadreMember')
    .select('id, person_name, epic_number')
    .in('id', [MEMBER_1_ID, MEMBER_2_ID]);
  console.log('Members in DB:', verifyMembers);

  console.log('\n✅ Seed complete! Both BLA agents are now in the database.');
}

main().catch((err) => {
  console.error('❌', err instanceof Error ? err.message : err);
  process.exit(1);
});

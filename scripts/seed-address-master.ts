/**
 * Replace AddressMaster with curated ADM address list.
 * Usage: pnpm db:seed:addresses
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';

dotenv.config({ path: '.env.local.prod' });
dotenv.config();

type SeedAddress = {
  name: string;
  nameMr: string;
  addressType: 'school' | 'office' | 'ration_office' | 'general';
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
  sortOrder: number;
};

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seedPath = resolve(process.cwd(), 'data/address-master-seed.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedAddress[];
  if (!Array.isArray(seed) || seed.length === 0) {
    throw new Error(`No addresses found in ${seedPath}`);
  }

  console.log(`Loaded ${seed.length} addresses from data/address-master-seed.json`);

  const { data: existing, error: listError } = await supabase
    .from('AddressMaster')
    .select('id');
  if (listError) throw listError;

  const existingIds = (existing ?? []).map((row) => String(row.id));
  if (existingIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('AddressMaster')
      .delete()
      .in('id', existingIds);
    if (deleteError) throw deleteError;
    console.log(`Deleted ${existingIds.length} existing AddressMaster row(s).`);
  } else {
    console.log('AddressMaster was empty.');
  }

  const now = new Date().toISOString();
  const payload = seed.map((item) => ({
    name: item.name,
    name_mr: item.nameMr,
    address_type: item.addressType,
    line1_en: item.line1En,
    line1_mr: item.line1Mr,
    line2_en: item.line2En ?? '',
    line2_mr: item.line2Mr ?? '',
    city_en: item.cityEn,
    city_mr: item.cityMr,
    state_en: item.stateEn,
    state_mr: item.stateMr,
    pincode: item.pincode,
    sort_order: item.sortOrder,
    is_active: true,
    created_at: now,
    updated_at: now,
  }));

  // Insert in chunks to stay under request size limits
  const chunkSize = 50;
  let inserted = 0;
  for (let i = 0; i < payload.length; i += chunkSize) {
    const chunk = payload.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('AddressMaster')
      .insert(chunk)
      .select('id');
    if (error) throw error;
    inserted += data?.length ?? chunk.length;
  }

  if (inserted !== seed.length) {
    throw new Error(`Expected ${seed.length} inserts, got ${inserted}`);
  }

  const { count, error: countError } = await supabase
    .from('AddressMaster')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;

  console.log(`Inserted ${inserted} AddressMaster row(s). Table count: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

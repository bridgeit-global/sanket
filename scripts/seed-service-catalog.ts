/**
 * Upsert ServiceCatalog from ADM beneficiary service master list.
 * Deactivates catalog rows not in the seed; activates/upserts the 89 services.
 * Usage: pnpm db:seed:services
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';

dotenv.config({ path: '.env.local.prod' });
dotenv.config();

type SeedService = {
  category: string;
  name: string;
  sortOrder: number;
};

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const seedPath = resolve(process.cwd(), 'data/service-catalog-seed.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedService[];
  if (!Array.isArray(seed) || seed.length === 0) {
    throw new Error(`No services found in ${seedPath}`);
  }

  console.log(`Loaded ${seed.length} services from data/service-catalog-seed.json`);

  const seedNames = new Set(seed.map((row) => row.name));
  const now = new Date().toISOString();

  const { data: existing, error: listError } = await supabase
    .from('ServiceCatalog')
    .select('id, name');
  if (listError) throw listError;

  const toDeactivate = (existing ?? []).filter((row) => !seedNames.has(String(row.name)));
  if (toDeactivate.length > 0) {
    const { error: deactivateError } = await supabase
      .from('ServiceCatalog')
      .update({ is_active: false, updated_at: now })
      .in(
        'id',
        toDeactivate.map((row) => String(row.id)),
      );
    if (deactivateError) throw deactivateError;
    console.log(`Deactivated ${toDeactivate.length} catalog row(s) not in seed.`);
  } else {
    console.log('No obsolete catalog rows to deactivate.');
  }

  const existingByName = new Map(
    (existing ?? []).map((row) => [String(row.name), String(row.id)]),
  );

  let inserted = 0;
  let updated = 0;

  for (const item of seed) {
    const payload = {
      name: item.name,
      category: item.category,
      sort_order: item.sortOrder,
      is_active: true,
      updated_at: now,
    };

    const existingId = existingByName.get(item.name);
    if (existingId) {
      const { error } = await supabase
        .from('ServiceCatalog')
        .update(payload)
        .eq('id', existingId);
      if (error) throw error;
      updated += 1;
    } else {
      const { error } = await supabase.from('ServiceCatalog').insert({
        ...payload,
        created_at: now,
      });
      if (error) throw error;
      inserted += 1;
    }
  }

  const { count, error: countError } = await supabase
    .from('ServiceCatalog')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  if (countError) throw countError;

  console.log(
    `Upserted services (inserted ${inserted}, updated ${updated}). Active count: ${count ?? 0}`,
  );

  if ((count ?? 0) !== seed.length) {
    throw new Error(`Expected ${seed.length} active services, got ${count ?? 0}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

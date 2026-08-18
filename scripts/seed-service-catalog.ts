/**
 * Upsert ServiceCatalog from ADM beneficiary service master list.
 * Deactivates catalog rows not in the seed; activates/upserts services from the seed.
 * Usage: pnpm db:seed:services
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';
import { resolveLetterTypeFromServiceName } from '../lib/letters/letter-type-options';

dotenv.config({ path: '.env.local.prod' });
dotenv.config();

/** Catalog names whose letter type must stay linked even if previously set. */
const FORCE_LETTER_TYPE_BY_NAME: Record<string, string> = {
  'Identity Card': 'identity',
};

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
    const inferredLetterType = resolveLetterTypeFromServiceName(item.name);
    const existingId = existingByName.get(item.name);
    if (existingId) {
      const { error } = await supabase
        .from('ServiceCatalog')
        .update({
          name: item.name,
          category: item.category,
          sort_order: item.sortOrder,
          is_active: true,
          updated_at: now,
        })
        .eq('id', existingId);
      if (error) throw error;
      const forcedLetterType = FORCE_LETTER_TYPE_BY_NAME[item.name];
      if (forcedLetterType) {
        const { error: forceError } = await supabase
          .from('ServiceCatalog')
          .update({ letter_type: forcedLetterType, updated_at: now })
          .eq('id', existingId);
        if (forceError) throw forceError;
      } else {
        // Only fill letter_type when missing so manual manage links are preserved.
        const { error: letterTypeError } = await supabase
          .from('ServiceCatalog')
          .update({ letter_type: inferredLetterType, updated_at: now })
          .eq('id', existingId)
          .is('letter_type', null);
        if (letterTypeError) throw letterTypeError;
      }
      updated += 1;
    } else {
      const { error } = await supabase.from('ServiceCatalog').insert({
        name: item.name,
        category: item.category,
        sort_order: item.sortOrder,
        letter_type: FORCE_LETTER_TYPE_BY_NAME[item.name] ?? inferredLetterType,
        is_active: true,
        created_at: now,
        updated_at: now,
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

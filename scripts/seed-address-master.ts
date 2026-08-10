/**
 * Non-destructive Address Master seed.
 * - Upserts/appends school/office/ration rows from data/address-master-seed.json
 * - Appends Maharashtra minister entries from data/maharashtra-ministers-seed.json
 * Never deletes existing AddressMaster rows.
 *
 * Usage: pnpm db:seed:addresses
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';

dotenv.config({ path: '.env.local' });
dotenv.config();

type SeedAddress = {
  name: string;
  nameMr: string;
  addressType: string;
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  line3En?: string;
  line3Mr?: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
  sortOrder: number;
};

type MinisterSeed = {
  code: string;
  holderMr: string;
  holderEn: string;
  typeCode: string;
  positionMr: string;
  positionEn: string;
  line1Mr: string;
  line2Mr: string;
  line3Mr: string;
  line1En: string;
  line2En: string;
  line3En: string;
  cityMr: string;
  cityEn: string;
  stateMr: string;
  stateEn: string;
  pincode: string;
};

function contentKey(parts: {
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  line3En: string;
  line3Mr: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
}): string {
  return createHash('md5')
    .update(
      [
        parts.line1En,
        parts.line1Mr,
        parts.line2En,
        parts.line2Mr,
        parts.line3En,
        parts.line3Mr,
        parts.cityEn,
        parts.cityMr,
        parts.stateEn,
        parts.stateMr,
        parts.pincode,
      ].join('\n'),
      'utf8',
    )
    .digest('hex');
}

async function resolveTypeId(
  supabase: SupabaseClient,
  code: string,
  cache: Map<string, string>,
): Promise<string> {
  const hit = cache.get(code);
  if (hit) return hit;
  const { data, error } = await supabase
    .from('AddressTypeMaster')
    .select('id')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Missing AddressTypeMaster code: ${code}`);
  cache.set(code, String(data.id));
  return String(data.id);
}

async function findOrCreateBlock(
  supabase: SupabaseClient,
  parts: {
    line1En: string;
    line1Mr: string;
    line2En: string;
    line2Mr: string;
    line3En: string;
    line3Mr: string;
    cityEn: string;
    cityMr: string;
    stateEn: string;
    stateMr: string;
    pincode: string;
  },
  cache: Map<string, string>,
): Promise<string> {
  const key = contentKey(parts);
  const hit = cache.get(key);
  if (hit) return hit;

  const { data: existing, error: existingError } = await supabase
    .from('AddressBlock')
    .select('id')
    .eq('content_key', key)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing?.id) {
    cache.set(key, String(existing.id));
    return String(existing.id);
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('AddressBlock')
    .insert({
      content_key: key,
      line1_en: parts.line1En,
      line1_mr: parts.line1Mr,
      line2_en: parts.line2En,
      line2_mr: parts.line2Mr,
      line3_en: parts.line3En,
      line3_mr: parts.line3Mr,
      city_en: parts.cityEn,
      city_mr: parts.cityMr,
      state_en: parts.stateEn,
      state_mr: parts.stateMr,
      pincode: parts.pincode,
      is_active: true,
      sort_order: 0,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      const { data: raced, error: raceError } = await supabase
        .from('AddressBlock')
        .select('id')
        .eq('content_key', key)
        .maybeSingle();
      if (raceError) throw raceError;
      if (raced?.id) {
        cache.set(key, String(raced.id));
        return String(raced.id);
      }
    }
    throw error;
  }
  cache.set(key, String(data.id));
  return String(data.id);
}

async function ensureEntry(
  supabase: SupabaseClient,
  opts: {
    holderEn: string;
    holderMr: string;
    typeCode: string;
    positionEn: string;
    positionMr: string;
    positionCode?: string | null;
    addressParts: {
      line1En: string;
      line1Mr: string;
      line2En: string;
      line2Mr: string;
      line3En: string;
      line3Mr: string;
      cityEn: string;
      cityMr: string;
      stateEn: string;
      stateMr: string;
      pincode: string;
    };
    sortOrder: number;
    typeCache: Map<string, string>;
    blockCache: Map<string, string>;
  },
): Promise<'inserted' | 'skipped' | 'updated'> {
  const typeId = await resolveTypeId(supabase, opts.typeCode, opts.typeCache);
  const addressId = await findOrCreateBlock(
    supabase,
    opts.addressParts,
    opts.blockCache,
  );

  let positionId: string | null = null;

  if (opts.positionCode) {
    const { data: byCode, error } = await supabase
      .from('PositionMaster')
      .select('id, title_en, title_mr')
      .eq('code', opts.positionCode)
      .maybeSingle();
    if (error) throw error;
    if (byCode?.id) {
      positionId = String(byCode.id);
      const { data: existingEntry, error: entryError } = await supabase
        .from('AddressMaster')
        .select('id, holder_name_en, holder_name_mr, address_id, type_id')
        .eq('position_id', positionId)
        .maybeSingle();
      if (entryError) throw entryError;
      if (existingEntry?.id) {
        const now = new Date().toISOString();
        const needsPositionUpdate =
          String(byCode.title_en ?? '') !== opts.positionEn ||
          String(byCode.title_mr ?? '') !== opts.positionMr;
        if (needsPositionUpdate) {
          const { error: posUpdateError } = await supabase
            .from('PositionMaster')
            .update({
              title_en: opts.positionEn,
              title_mr: opts.positionMr,
              updated_at: now,
            })
            .eq('id', positionId);
          if (posUpdateError) throw posUpdateError;
        }

        const needsEntryUpdate =
          String(existingEntry.holder_name_en ?? '') !== opts.holderEn ||
          String(existingEntry.holder_name_mr ?? '') !== opts.holderMr ||
          String(existingEntry.address_id ?? '') !== addressId ||
          String(existingEntry.type_id ?? '') !== typeId;
        if (needsEntryUpdate) {
          const { error: entryUpdateError } = await supabase
            .from('AddressMaster')
            .update({
              holder_name_en: opts.holderEn,
              holder_name_mr: opts.holderMr,
              type_id: typeId,
              address_id: addressId,
              updated_at: now,
            })
            .eq('id', existingEntry.id);
          if (entryUpdateError) throw entryUpdateError;
        }

        return needsPositionUpdate || needsEntryUpdate ? 'updated' : 'skipped';
      }
    }
  } else {
    const { data: existingHolders, error: holderError } = await supabase
      .from('AddressMaster')
      .select('id')
      .eq('holder_name_en', opts.holderEn)
      .eq('type_id', typeId)
      .eq('address_id', addressId);
    if (holderError) throw holderError;
    if ((existingHolders ?? []).length > 0) return 'skipped';
  }

  if (!positionId) {
    const nowPos = new Date().toISOString();
    const { data: pos, error: posError } = await supabase
      .from('PositionMaster')
      .insert({
        code: opts.positionCode || null,
        title_en: opts.positionEn,
        title_mr: opts.positionMr,
        is_active: true,
        sort_order: opts.sortOrder,
        created_at: nowPos,
        updated_at: nowPos,
      })
      .select('id')
      .single();
    if (posError) throw posError;
    positionId = String(pos.id);
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from('AddressMaster').insert({
    holder_name_en: opts.holderEn,
    holder_name_mr: opts.holderMr,
    type_id: typeId,
    address_id: addressId,
    position_id: positionId,
    is_active: true,
    sort_order: opts.sortOrder,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  return 'inserted';
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  console.log(`Seeding Address Master via ${supabaseUrl}`);
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const typeCache = new Map<string, string>();
  const blockCache = new Map<string, string>();

  const seedPath = resolve(process.cwd(), 'data/address-master-seed.json');
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedAddress[];
  if (!Array.isArray(seed) || seed.length === 0) {
    throw new Error(`No addresses found in ${seedPath}`);
  }

  console.log(`Loaded ${seed.length} addresses from data/address-master-seed.json`);
  let inserted = 0;
  let skipped = 0;

  for (const item of seed) {
    const result = await ensureEntry(supabase, {
      holderEn: item.name,
      holderMr: item.nameMr,
      typeCode: item.addressType,
      positionEn: item.name,
      positionMr: item.nameMr,
      addressParts: {
        line1En: item.line1En,
        line1Mr: item.line1Mr,
        line2En: item.line2En ?? '',
        line2Mr: item.line2Mr ?? '',
        line3En: item.line3En ?? '',
        line3Mr: item.line3Mr ?? '',
        cityEn: item.cityEn,
        cityMr: item.cityMr,
        stateEn: item.stateEn,
        stateMr: item.stateMr,
        pincode: item.pincode,
      },
      sortOrder: item.sortOrder,
      typeCache,
      blockCache,
    });
    if (result === 'inserted') inserted += 1;
    else skipped += 1;
  }

  console.log(`ADM seed: inserted ${inserted}, skipped existing ${skipped}`);

  const ministerPath = resolve(process.cwd(), 'data/maharashtra-ministers-seed.json');
  const ministers = JSON.parse(readFileSync(ministerPath, 'utf8')) as MinisterSeed[];
  console.log(`Loaded ${ministers.length} ministers from data/maharashtra-ministers-seed.json`);

  let ministerInserted = 0;
  let ministerUpdated = 0;
  let ministerSkipped = 0;
  for (const [index, item] of ministers.entries()) {
    const result = await ensureEntry(supabase, {
      holderEn: item.holderEn || item.holderMr,
      holderMr: item.holderMr,
      typeCode: item.typeCode,
      positionEn: item.positionEn || item.positionMr,
      positionMr: item.positionMr,
      positionCode: item.code,
      addressParts: {
        line1En: item.line1En,
        line1Mr: item.line1Mr,
        line2En: item.line2En,
        line2Mr: item.line2Mr,
        line3En: item.line3En,
        line3Mr: item.line3Mr,
        cityEn: item.cityEn,
        cityMr: item.cityMr,
        stateEn: item.stateEn,
        stateMr: item.stateMr,
        pincode: item.pincode,
      },
      sortOrder: 1000 + index,
      typeCache,
      blockCache,
    });
    if (result === 'inserted') ministerInserted += 1;
    else if (result === 'updated') ministerUpdated += 1;
    else ministerSkipped += 1;
  }

  console.log(
    `Minister seed: inserted ${ministerInserted}, updated ${ministerUpdated}, skipped existing ${ministerSkipped}`,
  );

  const { count, error: countError } = await supabase
    .from('AddressMaster')
    .select('id', { count: 'exact', head: true });
  if (countError) throw countError;
  console.log(`AddressMaster table count: ${count}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

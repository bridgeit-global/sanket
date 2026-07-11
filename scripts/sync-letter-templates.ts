/**
 * Force-sync all LetterMaster rows to code defaults (EN + MR).
 * Usage: npx tsx scripts/sync-letter-templates.ts
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { resolveServiceRoleKey, resolveSupabaseUrl } from '../lib/supabase/config';
import {
  getAllDefaultLetterMasters,
  getDefaultTemplateHtml,
  getDefaultTemplateName,
} from '../lib/letters/default-template-html';
import { getDefaultLetterPaperSize } from '../lib/letters/paper-size';
import { isLetterType } from '../lib/letters/templates';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const defaults = getAllDefaultLetterMasters();
  const now = new Date().toISOString();

  console.log('Force-syncing all letter master templates from code defaults…');

  const { data: existingRows, error: listError } = await supabase
    .from('LetterMaster')
    .select('id, name, letter_type, letter_locale, template_html');
  if (listError) throw listError;

  const legacyRationIds = (existingRows ?? [])
    .filter((row) => String(row.letter_type) === 'ration')
    .map((row) => row.id);
  if (legacyRationIds.length > 0) {
    const { error } = await supabase
      .from('LetterMaster')
      .delete()
      .in('id', legacyRationIds);
    if (error) throw error;
    console.log(`Removed ${legacyRationIds.length} legacy ration master(s).`);
  }

  const canonicalRows = (existingRows ?? []).filter((row) =>
    isLetterType(String(row.letter_type)),
  );
  const existingKeys = new Set(
    canonicalRows.map(
      (row) => `${String(row.letter_type)}:${String(row.letter_locale)}`,
    ),
  );

  const missing = defaults.filter(
    (item) => !existingKeys.has(`${item.letterType}:${item.letterLocale}`),
  );
  if (missing.length > 0) {
    const { error } = await supabase.from('LetterMaster').insert(
      missing.map((item) => ({
        name: item.name,
        letter_type: item.letterType,
        letter_locale: item.letterLocale,
        template_html: item.templateHtml,
        paper_size: getDefaultLetterPaperSize(item.letterType),
        created_at: now,
        updated_at: now,
      })),
    );
    if (error) throw error;
    console.log(`Inserted ${missing.length} missing template(s).`);
  }

  const { data: rows, error: reloadError } = await supabase
    .from('LetterMaster')
    .select('id, name, letter_type, letter_locale, template_html');
  if (reloadError) throw reloadError;

  let updated = 0;
  let matched = 0;

  for (const row of rows ?? []) {
    const letterType = String(row.letter_type);
    const letterLocale = String(row.letter_locale);
    if (!isLetterType(letterType)) continue;
    if (letterLocale !== 'en' && letterLocale !== 'mr') continue;

    const expectedName = getDefaultTemplateName(letterType, letterLocale);
    const expectedHtml = getDefaultTemplateHtml(letterType, letterLocale);
    if (row.template_html === expectedHtml && row.name === expectedName) {
      matched += 1;
      console.log(`  ✓ ${letterType}/${letterLocale} (already current)`);
      continue;
    }

    const { error } = await supabase
      .from('LetterMaster')
      .update({
        name: expectedName,
        template_html: expectedHtml,
        updated_at: now,
      })
      .eq('id', row.id);
    if (error) throw error;
    updated += 1;
    console.log(`  ↑ ${letterType}/${letterLocale} updated`);
  }

  console.log(`\nDone. ${updated} updated, ${matched} already current.`);
}

main().catch((error) => {
  console.error('Failed to sync letter templates:', error);
  process.exit(1);
});

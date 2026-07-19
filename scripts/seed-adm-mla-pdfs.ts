/**
 * Seed MLA Fund batches + works from ADM/seed/*.json (parsed from details PDFs).
 * Usage: pnpm db:seed:adm-mla
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import {
  resolveServiceRoleKey,
  resolveSupabaseUrl,
} from '../lib/supabase/config';

dotenv.config({ path: '.env.local.prod' });
dotenv.config();

type SeedWork = {
  sortOrder: number;
  workCode: string | null;
  taluka: string | null;
  village: string | null;
  ward: string | null;
  name: string;
  physicalStatus: 'WNS' | 'WIP' | 'WC';
  mlaRecommendationRef: string | null;
  technicalSanctionRef: string | null;
  technicalSanctionDate: string | null;
  technicalSanctionAmountThousands: number;
  administrativeSanctionAmountThousands: number;
};

type SeedBatch = {
  sourcePdf: string;
  financialYear: string;
  batchLabel: string;
  budgetCrore: number;
  works: SeedWork[];
};

const SEED_FILES = [
  'ADM/seed/mla1-24-25-0.58.json',
  'ADM/seed/mla2-24-25-2.70.json',
  'ADM/seed/mla1-25-26-6.10.json',
];

function croreToRupees(crore: number): number {
  return Math.round(crore * 10_000_000);
}

function thousandsToRupees(thousands: number): number {
  return Math.round(thousands * 1000);
}

function projectStatusFromPhysical(
  physical: SeedWork['physicalStatus'],
): 'Concept' | 'Proposal' | 'In Progress' | 'Completed' {
  if (physical === 'WC') return 'Completed';
  if (physical === 'WIP') return 'In Progress';
  return 'Proposal';
}

async function main() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceKey = resolveServiceRoleKey();
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error: userError } = await supabase
    .from('User')
    .select('id')
    .limit(1);
  if (userError) throw userError;
  const createdBy = users?.[0]?.id ? String(users[0].id) : null;
  if (!createdBy) {
    throw new Error('No User row found — create a user before seeding ADM MLA data');
  }
  console.log(`Using created_by=${createdBy}`);

  const { data: category, error: catError } = await supabase
    .from('AdmFundingCategory')
    .select('*')
    .eq('code', 'MLA-FUND')
    .maybeSingle();
  if (catError) throw catError;
  if (!category) {
    throw new Error('MLA-FUND category not found — run ADM migrations first');
  }
  const categoryId = String(category.id);
  console.log(`MLA-FUND category id=${categoryId}`);

  for (const relativePath of SEED_FILES) {
    const seedPath = resolve(process.cwd(), relativePath);
    const batch = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedBatch;
    console.log(
      `\n=== ${batch.batchLabel} ${batch.financialYear} (${batch.works.length} works) ===`,
    );

    const budget = croreToRupees(batch.budgetCrore);
    const now = new Date().toISOString();

    const { data: existingFunds, error: fundFindError } = await supabase
      .from('AdmFundRecord')
      .select('*')
      .eq('category_id', categoryId)
      .eq('financial_year', batch.financialYear)
      .eq('batch_label', batch.batchLabel)
      .limit(1);
    if (fundFindError) throw fundFindError;

    let fundId: string;
    const existingFund = existingFunds?.[0];
    if (existingFund) {
      fundId = String(existingFund.id);
      const { error: fundUpdateError } = await supabase
        .from('AdmFundRecord')
        .update({
          budget,
          project_year: batch.financialYear,
          updated_at: now,
        })
        .eq('id', fundId);
      if (fundUpdateError) throw fundUpdateError;
      console.log(`Updated fund ${fundId} budget=${budget}`);
    } else {
      const { data: createdFund, error: fundCreateError } = await supabase
        .from('AdmFundRecord')
        .insert({
          category_id: categoryId,
          financial_year: batch.financialYear,
          project_year: batch.financialYear,
          batch_label: batch.batchLabel,
          budget,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (fundCreateError) throw fundCreateError;
      fundId = String(createdFund.id);
      console.log(`Created fund ${fundId} budget=${budget}`);
    }

    // Attach source PDF document (public static path)
    const pdfPublicUrl = `/adm/sources/${batch.sourcePdf}`;
    const pdfPath = resolve(process.cwd(), 'public/adm/sources', batch.sourcePdf);
    const pdfSizeKb = Math.max(1, Math.round(statSync(pdfPath).size / 1024));

    const { data: existingDocs, error: docFindError } = await supabase
      .from('AdmDocument')
      .select('id')
      .eq('fund_record_id', fundId)
      .eq('kind', 'source_details')
      .eq('file_name', batch.sourcePdf)
      .limit(1);
    if (docFindError) throw docFindError;

    if (!existingDocs?.length) {
      const { error: docCreateError } = await supabase.from('AdmDocument').insert({
        fund_record_id: fundId,
        register_entry_id: null,
        amount_unit: 'thousands',
        file_name: batch.sourcePdf,
        file_size_kb: pdfSizeKb,
        file_url: pdfPublicUrl,
        kind: 'source_details',
        label: `MLA details ${batch.batchLabel} ${batch.financialYear}`,
        uploaded_by: createdBy,
        created_at: now,
      });
      if (docCreateError) throw docCreateError;
      console.log(`Attached source PDF ${batch.sourcePdf}`);
    } else {
      console.log(`Source PDF already attached`);
    }

    // Existing allocations for this fund (for idempotency)
    const { data: existingAllocs, error: allocListError } = await supabase
      .from('AdmFundAllocation')
      .select('id, project_id, work_code, sort_order')
      .eq('fund_record_id', fundId);
    if (allocListError) throw allocListError;

    const byWorkCode = new Map<string, { id: string; project_id: string }>();
    const bySortOrder = new Map<number, { id: string; project_id: string }>();
    for (const row of existingAllocs ?? []) {
      const entry = { id: String(row.id), project_id: String(row.project_id) };
      if (row.work_code) byWorkCode.set(String(row.work_code), entry);
      bySortOrder.set(Number(row.sort_order ?? 0), entry);
    }

    let created = 0;
    let updated = 0;

    for (const work of batch.works) {
      const tsAmount = thousandsToRupees(work.technicalSanctionAmountThousands);
      const asAmount = thousandsToRupees(
        work.administrativeSanctionAmountThousands,
      );

      const existing =
        (work.workCode ? byWorkCode.get(work.workCode) : undefined) ??
        bySortOrder.get(work.sortOrder);

      if (existing) {
        const { error: projUpdateError } = await supabase
          .from('MlaProject')
          .update({
            name: work.name,
            ward: work.ward,
            taluka: work.taluka,
            village: work.village,
            physical_status: work.physicalStatus,
            status: projectStatusFromPhysical(work.physicalStatus),
            estimated_cost: asAmount,
            updated_at: now,
          })
          .eq('id', existing.project_id);
        if (projUpdateError) throw projUpdateError;

        const { error: allocUpdateError } = await supabase
          .from('AdmFundAllocation')
          .update({
            allocated_budget: asAmount,
            work_code: work.workCode,
            sort_order: work.sortOrder,
            mla_recommendation_ref: work.mlaRecommendationRef,
            technical_sanction_ref: work.technicalSanctionRef,
            technical_sanction_date: work.technicalSanctionDate,
            technical_sanction_amount: tsAmount,
            government_fixed_amount: asAmount,
            updated_at: now,
          })
          .eq('id', existing.id);
        if (allocUpdateError) throw allocUpdateError;
        updated += 1;
        continue;
      }

      const { data: project, error: projCreateError } = await supabase
        .from('MlaProject')
        .insert({
          name: work.name,
          ward: work.ward,
          type: 'MLA Work',
          status: projectStatusFromPhysical(work.physicalStatus),
          department: 'MLA Fund',
          category: 'MLA Fund',
          taluka: work.taluka,
          village: work.village,
          estimated_cost: asAmount,
          approval_status: 'Approved',
          noc_required: false,
          noc_status: 'NotRequired',
          physical_status: work.physicalStatus,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })
        .select('id')
        .single();
      if (projCreateError) throw projCreateError;

      const { error: allocCreateError } = await supabase
        .from('AdmFundAllocation')
        .insert({
          fund_record_id: fundId,
          project_id: project.id,
          allocated_budget: asAmount,
          work_code: work.workCode,
          sort_order: work.sortOrder,
          mla_recommendation_ref: work.mlaRecommendationRef,
          technical_sanction_ref: work.technicalSanctionRef,
          technical_sanction_date: work.technicalSanctionDate,
          technical_sanction_amount: tsAmount,
          government_fixed_amount: asAmount,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        });
      if (allocCreateError) throw allocCreateError;
      created += 1;
    }

    console.log(`Works: created=${created} updated=${updated}`);
  }

  console.log('\nDone.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

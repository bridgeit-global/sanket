import { NextResponse } from 'next/server';

import {
  getJobFairRegistrationByMobile,
  upsertJobFairDraft,
} from '@/lib/db/job-fair-queries';
import { JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT } from '@/lib/job-fair/options';
import {
  clampJobFairResumeStep,
  normalizeIndianMobile,
  sanitizeJobFairFormValues,
} from '@/lib/job-fair/schema';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: {
    step?: unknown;
    values?: unknown;
    sameAsMobile?: unknown;
    savedAt?: unknown;
    website?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (String(body.website ?? '').trim()) {
    return NextResponse.json({ ok: true });
  }

  const values = sanitizeJobFairFormValues(body.values);
  if (body.sameAsMobile === true) values.whatsapp = values.mobile;

  const mobile = normalizeIndianMobile(values.mobile);
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return NextResponse.json(
      { error: 'Enter a valid 10-digit mobile number' },
      { status: 400 },
    );
  }
  values.mobile = mobile;

  const requested = typeof body.step === 'number' ? body.step : Number(body.step);
  const step = clampJobFairResumeStep(values, requested);
  const savedAt =
    typeof body.savedAt === 'number' && Number.isFinite(body.savedAt)
      ? body.savedAt
      : Date.now();

  try {
    await upsertJobFairDraft({
      mobile,
      step,
      values,
      sameAsMobile: body.sameAsMobile === true || values.whatsapp === values.mobile,
      savedAt,
    });

    const existing = await getJobFairRegistrationByMobile(mobile);
    return NextResponse.json({
      ok: true,
      step,
      status: existing ? 'registered' : 'draft',
      registrationNo: existing?.registrationNo ?? null,
      receiptDownloadsRemaining: existing
        ? Math.max(0, JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT - existing.receiptDownloadCount)
        : null,
      resumeFileName: existing?.resumeFileName ?? null,
    });
  } catch (error) {
    console.error('Job fair step save failed:', error);
    return NextResponse.json(
      { error: 'Could not save this step. Please try again.' },
      { status: 500 },
    );
  }
}

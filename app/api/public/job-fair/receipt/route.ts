import { NextResponse } from 'next/server';

import { claimJobFairReceiptDownload } from '@/lib/db/job-fair-queries';
import { JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT } from '@/lib/job-fair/options';
import {
  jobFairRegistrationToFormValues,
  normalizeIndianMobile,
} from '@/lib/job-fair/schema';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { mobile?: unknown; website?: unknown };
  try {
    body = (await request.json()) as { mobile?: unknown; website?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (String(body.website ?? '').trim()) {
    return NextResponse.json({ ok: true, registrationNo: null });
  }

  const mobile = normalizeIndianMobile(String(body.mobile ?? ''));
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return NextResponse.json(
      { error: 'Enter a valid 10-digit mobile number' },
      { status: 400 },
    );
  }

  try {
    const claimed = await claimJobFairReceiptDownload(mobile);
    if (!claimed.ok && claimed.reason === 'not_found') {
      return NextResponse.json(
        { error: 'No registration found for this mobile number.' },
        { status: 404 },
      );
    }
    if (!claimed.ok) {
      return NextResponse.json(
        {
          error: 'receipt_limit',
          message: `This receipt can be downloaded only ${JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT} times.`,
          receiptDownloadsRemaining: 0,
        },
        { status: 429 },
      );
    }

    return NextResponse.json({
      ok: true,
      registrationNo: claimed.registration.registrationNo,
      values: jobFairRegistrationToFormValues(claimed.registration),
      resumeFileName: claimed.registration.resumeFileName,
      receiptDownloadsRemaining: claimed.remaining,
    });
  } catch (error) {
    console.error('Job fair receipt download failed:', error);
    return NextResponse.json(
      { error: 'Could not prepare the receipt. Please try again.' },
      { status: 500 },
    );
  }
}

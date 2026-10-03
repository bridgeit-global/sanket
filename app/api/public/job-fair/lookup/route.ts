import { NextResponse } from 'next/server';

import { getJobFairMobileState } from '@/lib/db/job-fair-queries';
import { normalizeIndianMobile } from '@/lib/job-fair/schema';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { mobile?: unknown; website?: unknown };
  try {
    body = (await request.json()) as { mobile?: unknown; website?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (String(body.website ?? '').trim()) {
    return NextResponse.json({ status: 'new' });
  }

  const mobile = normalizeIndianMobile(String(body.mobile ?? ''));
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return NextResponse.json(
      { error: 'Enter a valid 10-digit mobile number' },
      { status: 400 },
    );
  }

  try {
    const state = await getJobFairMobileState(mobile);
    return NextResponse.json(state);
  } catch (error) {
    console.error('Job fair mobile lookup failed:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}

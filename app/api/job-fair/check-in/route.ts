import { type NextRequest, NextResponse } from 'next/server';

import {
  checkInJobFairRegistration,
  getJobFairCheckInByCode,
} from '@/lib/db/job-fair-check-in';
import { requireJobFairCheckInAccess } from '@/lib/job-fair/access';
import { parseJobFairRegistrationNo } from '@/lib/job-fair/check-in';

function readCode(value: string | null): string | null {
  if (!value) return null;
  return parseJobFairRegistrationNo(value);
}

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairCheckInAccess();
    if (error || !session) return error;

    const code = readCode(new URL(request.url).searchParams.get('code'));
    if (!code) {
      return NextResponse.json(
        { error: 'Scan a YUVAAZ registration QR or enter the registration number.' },
        { status: 400 },
      );
    }

    const registration = await getJobFairCheckInByCode(code);
    if (!registration) {
      return NextResponse.json(
        { error: `No registration found for ${code}.` },
        { status: 404 },
      );
    }

    return NextResponse.json({ registration });
  } catch (err) {
    console.error('Error looking up job fair check-in:', err);
    return NextResponse.json(
      { error: 'Could not look up this registration.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairCheckInAccess();
    if (error || !session) return error;

    const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
    const code = readCode(typeof body?.code === 'string' ? body.code : null);
    if (!code) {
      return NextResponse.json(
        { error: 'Scan a YUVAAZ registration QR or enter the registration number.' },
        { status: 400 },
      );
    }

    const result = await checkInJobFairRegistration(code, session.user.id);
    if (!result) {
      return NextResponse.json(
        { error: `No registration found for ${code}.` },
        { status: 404 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error checking in job fair registration:', err);
    return NextResponse.json(
      { error: 'Could not check in this registration.' },
      { status: 500 },
    );
  }
}

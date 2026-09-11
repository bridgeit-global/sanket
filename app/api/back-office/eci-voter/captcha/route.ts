import { NextResponse } from 'next/server';
import { requireBackOfficeSession } from '@/lib/back-office/auth';
import { EciSearchError, fetchEciCaptcha } from '@/lib/eci/national-display';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await requireBackOfficeSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const captcha = await fetchEciCaptcha();
    return NextResponse.json(captcha);
  } catch (error) {
    console.error('Failed to load ECI captcha', error);
    const message =
      error instanceof EciSearchError
        ? error.message
        : 'Failed to load captcha';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

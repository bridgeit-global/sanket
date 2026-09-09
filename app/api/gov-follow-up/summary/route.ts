import { NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { getGovFollowUpSummary } from '@/lib/db/gov-follow-up';

export async function GET() {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;
    const summary = await getGovFollowUpSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Error loading follow-up summary:', err);
    return NextResponse.json(
      { error: 'Failed to load summary' },
      { status: 500 },
    );
  }
}

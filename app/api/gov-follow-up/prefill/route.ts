import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { getGovFollowUpPrefill } from '@/lib/db/gov-follow-up';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;
    const { searchParams } = new URL(request.url);
    const prefill = await getGovFollowUpPrefill({
      letterId: searchParams.get('letterId') ?? undefined,
      registerEntryId: searchParams.get('registerEntryId') ?? undefined,
    });
    return NextResponse.json(prefill);
  } catch (err) {
    console.error('Error loading follow-up prefill:', err);
    return NextResponse.json(
      { error: 'Failed to load prefill' },
      { status: 500 },
    );
  }
}

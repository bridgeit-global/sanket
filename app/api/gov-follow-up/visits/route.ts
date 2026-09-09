import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { getGovFollowUpVisitPlanner } from '@/lib/db/gov-follow-up';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;
    const { searchParams } = new URL(request.url);
    const planner = await getGovFollowUpVisitPlanner({
      locationId: searchParams.get('locationId') ?? undefined,
      date: searchParams.get('date') ?? undefined,
    });
    return NextResponse.json(planner);
  } catch (err) {
    console.error('Error loading visit planner:', err);
    return NextResponse.json(
      { error: 'Failed to load visit planner' },
      { status: 500 },
    );
  }
}

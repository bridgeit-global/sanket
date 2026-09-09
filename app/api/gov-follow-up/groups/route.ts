import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { listGovFollowUpGroups } from '@/lib/db/gov-follow-up';

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireGovFollowUpAccess();
    if (error) return error;
    const by = request.nextUrl.searchParams.get('by');
    if (by !== 'department' && by !== 'officer' && by !== 'staff') {
      return NextResponse.json({ error: 'Invalid group' }, { status: 400 });
    }
    const groups = await listGovFollowUpGroups(by);
    return NextResponse.json({ groups });
  } catch (err) {
    console.error('Error grouping follow-up matters:', err);
    return NextResponse.json(
      { error: 'Failed to group matters' },
      { status: 500 },
    );
  }
}

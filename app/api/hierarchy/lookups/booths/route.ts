import { type NextRequest, NextResponse } from 'next/server';
import { getBoothsForElection } from '@/lib/db/queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const electionId = new URL(request.url).searchParams.get('electionId');
  if (!electionId) {
    return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
  }

  const booths = await getBoothsForElection(electionId);
  return NextResponse.json({ success: true, booths, electionId });
}

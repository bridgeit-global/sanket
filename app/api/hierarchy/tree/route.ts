import { type NextRequest, NextResponse } from 'next/server';
import { getCadreMembers } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const verticalId = searchParams.get('verticalId') ?? undefined;
  const constituencyId = searchParams.get('constituencyId') ?? undefined;

  const members = await getCadreMembers({ verticalId, constituencyId });
  return NextResponse.json({ success: true, members });
}

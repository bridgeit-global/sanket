import { type NextRequest, NextResponse } from 'next/server';
import { getCadreHierarchyLeaders } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';
  const verticalId = searchParams.get('verticalId')?.trim() ?? '';
  const wardGeoIds = searchParams
    .getAll('wardGeoId')
    .map((id) => id.trim())
    .filter(Boolean);

  if (!verticalId) {
    return NextResponse.json({ error: 'verticalId is required' }, { status: 400 });
  }

  try {
    const leaders = await getCadreHierarchyLeaders({
      constituencyId,
      verticalId,
      wardGeoIds,
    });
    return NextResponse.json({ success: true, leaders });
  } catch (error) {
    console.error('Hierarchy leaders failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load hierarchy leaders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

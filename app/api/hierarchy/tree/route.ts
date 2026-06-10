import { type NextRequest, NextResponse } from 'next/server';
import { getCadreTree } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const verticalId = searchParams.get('verticalId');
  const constituencyId = searchParams.get('constituencyId') ?? undefined;

  if (!verticalId) {
    return NextResponse.json({ error: 'verticalId is required' }, { status: 400 });
  }

  const nodes = await getCadreTree({ verticalId, constituencyId });
  return NextResponse.json({ success: true, nodes });
}

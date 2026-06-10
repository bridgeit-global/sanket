import { NextResponse } from 'next/server';
import { getCadreConfig } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET() {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const config = await getCadreConfig();
  return NextResponse.json({ success: true, config });
}

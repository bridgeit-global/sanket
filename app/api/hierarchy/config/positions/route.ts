import { NextResponse } from 'next/server';
import { upsertCadrePosition } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const position = await upsertCadrePosition(body);
  return NextResponse.json({ success: true, position });
}

export async function PUT(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const position = await upsertCadrePosition(body);
  return NextResponse.json({ success: true, position });
}

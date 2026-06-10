import { NextResponse } from 'next/server';
import {
  upsertCadreGeographicUnit,
  upsertCadreVerticalCategory,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  if (body.entityType === 'category') {
    const category = await upsertCadreVerticalCategory(body);
    return NextResponse.json({ success: true, category });
  }
  const geoUnit = await upsertCadreGeographicUnit(body);
  return NextResponse.json({ success: true, geoUnit });
}

export async function PUT(request: Request) {
  return POST(request);
}

import { NextResponse } from 'next/server';
import {
  CadreConfigDeleteError,
  deleteCadreGeographicUnit,
  deleteCadreVerticalCategory,
  upsertCadreGeographicUnit,
  upsertCadreVerticalCategory,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import { isCadreGeographicUnitType } from '@/lib/hierarchy/types';

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
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }
  if (!body.id && !isCadreGeographicUnitType(body.type)) {
    return NextResponse.json({ error: 'type is required' }, { status: 400 });
  }
  const geoUnit = await upsertCadreGeographicUnit(body);
  return NextResponse.json({ success: true, geoUnit });
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const params = new URL(request.url).searchParams;
  const id = params.get('id');
  const entityType = params.get('entityType');
  const name = params.get('name') ?? undefined;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    if (entityType === 'category') {
      await deleteCadreVerticalCategory(id);
    } else {
      await deleteCadreGeographicUnit(id, name);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CadreConfigDeleteError) {
      return NextResponse.json(
        { error: error.message, code: error.code, usage: error.usage },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to delete';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

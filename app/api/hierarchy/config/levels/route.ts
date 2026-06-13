import { NextResponse } from 'next/server';
import {
  CadreConfigDeleteError,
  deleteCadrePositionLevel,
  upsertCadrePositionLevel,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  if (!body.key?.trim()) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const level = await upsertCadrePositionLevel(body);
  return NextResponse.json({ success: true, level });
}

export async function PUT(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const existingKey = body.key?.trim();
  if (!existingKey) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 });
  }

  const level = await upsertCadrePositionLevel(body);
  return NextResponse.json({ success: true, level });
}

export async function DELETE(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  try {
    await deleteCadrePositionLevel(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CadreConfigDeleteError) {
      return NextResponse.json(
        { error: error.message, code: error.code, usage: error.usage },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to delete level';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

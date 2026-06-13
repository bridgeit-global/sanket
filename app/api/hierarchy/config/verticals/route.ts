import { NextResponse } from 'next/server';
import {
  CadreConfigDeleteError,
  deleteCadreVertical,
  upsertCadreVertical,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const vertical = await upsertCadreVertical(body);
  return NextResponse.json({ success: true, vertical });
}

export async function PUT(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const vertical = await upsertCadreVertical(body);
  return NextResponse.json({ success: true, vertical });
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
    await deleteCadreVertical(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof CadreConfigDeleteError) {
      return NextResponse.json(
        { error: error.message, code: error.code, usage: error.usage },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to delete vertical';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

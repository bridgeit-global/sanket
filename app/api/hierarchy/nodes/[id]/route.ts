import { type NextRequest, NextResponse } from 'next/server';
import {
  deleteCadreNode,
  getCadreNodeById,
  updateCadreNode,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const node = await getCadreNodeById(id);
  if (!node) {
    return NextResponse.json({ error: 'Node not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, node });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const node = await updateCadreNode(id, body, access.userId);
    return NextResponse.json({ success: true, node });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update node';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { id } = await params;
    await deleteCadreNode(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete node';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

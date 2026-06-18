import { type NextRequest, NextResponse } from 'next/server';
import {
  deleteCadreMember,
  getCadreMemberById,
  updateCadreMember,
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
  const member = await getCadreMemberById(id);
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true, member });
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
    const member = await updateCadreMember(id, body, access.userId);
    return NextResponse.json({ success: true, member });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update member';
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
    await deleteCadreMember(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

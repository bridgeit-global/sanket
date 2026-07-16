import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmFundAllocationById,
  updateAdmFundAllocation,
  deleteAdmFundAllocation,
  hasModuleAccess,
} from '@/lib/db/queries';
import { z } from 'zod';
import { validateForm } from '@/lib/validations';

const patchSchema = z.object({
  allocatedBudget: z.number().int().min(0).optional(),
  projectId: z.string().uuid().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getAdmFundAllocationById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateForm(patchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const updated = await updateAdmFundAllocation(id, validation.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating ADM allocation:', error);
    return NextResponse.json(
      { error: 'Failed to update allocation' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getAdmFundAllocationById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Allocation not found' }, { status: 404 });
    }

    await deleteAdmFundAllocation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM allocation:', error);
    return NextResponse.json(
      { error: 'Failed to delete allocation' },
      { status: 500 },
    );
  }
}

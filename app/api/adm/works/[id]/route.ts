import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmWorkById,
  updateAdmWork,
  deleteAdmWork,
  hasModuleAccess,
} from '@/lib/db/queries';
import { admWorkFormSchema, validateForm } from '@/lib/validations';

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

    const existing = await getAdmWorkById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateForm(admWorkFormSchema, {
      ...existing,
      ...body,
      categoryId: body.categoryId ?? existing.categoryId,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const updated = await updateAdmWork(id, {
      name: validation.data.name,
      workBudget: validation.data.workBudget,
      projectId: validation.data.projectId ?? null,
      physicalStatus: validation.data.physicalStatus,
      bhoomiPujanDone: validation.data.bhoomiPujanDone ?? false,
      bhoomiPujanDate: validation.data.bhoomiPujanDate ?? null,
      lokarpanDone: validation.data.lokarpanDone ?? false,
      lokarpanDate: validation.data.lokarpanDate ?? null,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating ADM work:', error);
    return NextResponse.json(
      { error: 'Failed to update work' },
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

    const existing = await getAdmWorkById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Work not found' }, { status: 404 });
    }

    await deleteAdmWork(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM work:', error);
    return NextResponse.json(
      { error: 'Failed to delete work' },
      { status: 500 },
    );
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmFundRecordById,
  updateAdmFundRecord,
  deleteAdmFundRecord,
  hasModuleAccess,
} from '@/lib/db/queries';
import { admFundRecordSchema, validateForm } from '@/lib/validations';

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

    const existing = await getAdmFundRecordById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateForm(admFundRecordSchema, {
      financialYear: body.financialYear ?? existing.financialYear,
      budget: body.budget ?? existing.budget,
      batchLabel: body.batchLabel ?? existing.batchLabel,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const updated = await updateAdmFundRecord(id, {
      financialYear: validation.data.financialYear,
      budget: validation.data.budget,
      batchLabel: validation.data.batchLabel?.trim() ?? existing.batchLabel,
      // Keep DB project_year in lockstep with financial year (UI no longer collects it)
      projectYear: validation.data.financialYear,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating ADM fund record:', error);
    return NextResponse.json(
      { error: 'Failed to update fund record' },
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

    const existing = await getAdmFundRecordById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    await deleteAdmFundRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM fund record:', error);
    return NextResponse.json(
      { error: 'Failed to delete fund record' },
      { status: 500 },
    );
  }
}

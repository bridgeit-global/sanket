import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateAdmCategoryBudget, hasModuleAccess } from '@/lib/db/queries';
import { admCategoryBudgetSchema, validateForm } from '@/lib/validations';

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

    const body = await request.json();
    const validation = validateForm(admCategoryBudgetSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const updated = await updateAdmCategoryBudget(id, validation.data.masterBudget);
    if (!updated) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating ADM category:', error);
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 },
    );
  }
}

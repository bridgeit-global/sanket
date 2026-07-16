import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAdmFundRecord,
  hasModuleAccess,
} from '@/lib/db/queries';
import { admFundRecordSchema, validateForm } from '@/lib/validations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id: categoryId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateForm(admFundRecordSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    // project_year column is retained for DB uniqueness; keep it synced to financial year
    const fund = await createAdmFundRecord({
      categoryId,
      financialYear: validation.data.financialYear,
      projectYear: validation.data.financialYear,
      budget: validation.data.budget,
    });

    return NextResponse.json(fund, { status: 201 });
  } catch (error) {
    console.error('Error creating ADM fund record:', error);
    return NextResponse.json(
      { error: 'Failed to create fund record' },
      { status: 500 },
    );
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAdmFundingCategory,
  hasModuleAccess,
} from '@/lib/db/queries';
import { admFundingCategorySchema, validateForm } from '@/lib/validations';

/** Create (or return existing) fund type / funding category by name. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateForm(admFundingCategorySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const category = await createAdmFundingCategory({
      name: validation.data.name,
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error('Error creating ADM funding category:', error);
    return NextResponse.json(
      { error: 'Failed to create fund type' },
      { status: 500 },
    );
  }
}

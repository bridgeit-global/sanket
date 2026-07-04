import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createAdmWork, hasModuleAccess } from '@/lib/db/queries';
import { admWorkFormSchema, validateForm } from '@/lib/validations';

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
    const validation = validateForm(admWorkFormSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const work = await createAdmWork({
      categoryId: validation.data.categoryId,
      name: validation.data.name,
      workBudget: validation.data.workBudget,
      projectId: validation.data.projectId ?? null,
      physicalStatus: validation.data.physicalStatus,
      createdBy: session.user.id,
    });

    return NextResponse.json(work, { status: 201 });
  } catch (error) {
    console.error('Error creating ADM work:', error);
    return NextResponse.json(
      { error: 'Failed to create work' },
      { status: 500 },
    );
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  createAdmFundAllocation,
  getProjectById,
  getAdmFundRecordById,
  hasModuleAccess,
  updateProject,
} from '@/lib/db/queries';
import { admFundAllocationSchema, validateForm } from '@/lib/validations';

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
    const validation = validateForm(admFundAllocationSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const fund = await getAdmFundRecordById(validation.data.fundRecordId);
    if (!fund) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    const project = await getProjectById(validation.data.projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const taluka =
      typeof body.taluka === 'string' ? body.taluka.trim() || null : undefined;
    const village =
      typeof body.village === 'string' ? body.village.trim() || null : undefined;
    if (taluka !== undefined || village !== undefined) {
      await updateProject(project.id, {
        ...(taluka !== undefined ? { taluka } : {}),
        ...(village !== undefined ? { village } : {}),
      });
    }

    const allocation = await createAdmFundAllocation({
      fundRecordId: validation.data.fundRecordId,
      projectId: validation.data.projectId,
      allocatedBudget: validation.data.allocatedBudget,
      workCode: validation.data.workCode,
      sortOrder: validation.data.sortOrder,
      mlaRecommendationRef: validation.data.mlaRecommendationRef,
      technicalSanctionRef: validation.data.technicalSanctionRef,
      technicalSanctionDate: validation.data.technicalSanctionDate,
      technicalSanctionAmount: validation.data.technicalSanctionAmount,
      governmentFixedAmount: validation.data.governmentFixedAmount,
      createdBy: session.user.id,
    });

    return NextResponse.json(allocation, { status: 201 });
  } catch (error) {
    console.error('Error creating ADM allocation:', error);
    return NextResponse.json(
      { error: 'Failed to create allocation' },
      { status: 500 },
    );
  }
}

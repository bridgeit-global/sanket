import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getProjects,
  createProject,
  createAdmFundAllocation,
  getAdmFundRecordById,
  hasModuleAccess,
} from '@/lib/db/queries';
import { projectFormSchema, validateForm } from '@/lib/validations';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [hasAdm, hasProjects] = await Promise.all([
      hasModuleAccess(session.user.id, 'adm'),
      hasModuleAccess(session.user.id, 'projects'),
    ]);

    if (!hasAdm && !hasProjects) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projects = await getProjects({ limit: 500 });
    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        ward: p.ward,
        status: p.status,
      })),
    );
  } catch (error) {
    console.error('Error fetching ADM projects list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

/** Create a project from ADM and optionally allocate it to a fund. */
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
    const {
      fundRecordId,
      allocatedBudget,
      workCode,
      sortOrder,
      mlaRecommendationRef,
      technicalSanctionRef,
      technicalSanctionDate,
      technicalSanctionAmount,
      governmentFixedAmount,
      ...projectFields
    } = body;

    const validation = validateForm(projectFormSchema, {
      status: 'Concept',
      ...projectFields,
    });
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    if (fundRecordId) {
      const fund = await getAdmFundRecordById(fundRecordId);
      if (!fund) {
        return NextResponse.json(
          { error: 'Fund record not found' },
          { status: 404 },
        );
      }
    }

    const project = await createProject({
      ...validation.data,
      createdBy: session.user.id,
    });

    let allocation = null;
    if (fundRecordId) {
      const asAmount =
        typeof governmentFixedAmount === 'number'
          ? governmentFixedAmount
          : typeof allocatedBudget === 'number'
            ? allocatedBudget
            : 0;
      allocation = await createAdmFundAllocation({
        fundRecordId,
        projectId: project.id,
        allocatedBudget: asAmount,
        createdBy: session.user.id,
        workCode: typeof workCode === 'string' ? workCode : null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : undefined,
        mlaRecommendationRef:
          typeof mlaRecommendationRef === 'string' ? mlaRecommendationRef : null,
        technicalSanctionRef:
          typeof technicalSanctionRef === 'string' ? technicalSanctionRef : null,
        technicalSanctionDate:
          typeof technicalSanctionDate === 'string'
            ? technicalSanctionDate
            : null,
        technicalSanctionAmount:
          typeof technicalSanctionAmount === 'number'
            ? technicalSanctionAmount
            : undefined,
        governmentFixedAmount: asAmount,
      });
    }

    return NextResponse.json({ project, allocation }, { status: 201 });
  } catch (error) {
    console.error('Error creating ADM project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    );
  }
}

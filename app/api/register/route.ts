import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getRegisterEntriesWithAttachments,
  createRegisterEntry,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'inward' | 'outward' | null;
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const projectIdsParam = searchParams.get('projectIds');
    const projectStatusParam = searchParams.get('projectStatus') as
      | 'Concept'
      | 'Proposal'
      | 'In Progress'
      | 'Completed'
      | null;

    // Check module access based on type
    if (type === 'inward') {
      const hasAccess = await hasModuleAccess(session.user.id, 'inward');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (type === 'outward') {
      const hasAccess = await hasModuleAccess(session.user.id, 'outward');
      if (!hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // If no type specified, check both
      const hasInward = await hasModuleAccess(session.user.id, 'inward');
      const hasOutward = await hasModuleAccess(session.user.id, 'outward');
      if (!hasInward && !hasOutward) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;
    const projectIds = projectIdsParam
      ? projectIdsParam.split(',').filter(Boolean)
      : undefined;
    const projectStatus = projectStatusParam || undefined;

    // Use the optimized query that includes attachments
    const entries = await getRegisterEntriesWithAttachments({
      type: type || undefined,
      startDate,
      endDate,
      projectIds,
      projectStatus,
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching register entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch register entries' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, documentType, date, fromTo, subject, projectId, mode, refNo, officer } =
      body;

    if (!type || !date || !fromTo || !subject) {
      return NextResponse.json(
        { error: 'type, date, fromTo, and subject are required' },
        { status: 400 },
      );
    }

    // Validate documentType if provided
    if (documentType && !['VIP', 'Department', 'General'].includes(documentType)) {
      return NextResponse.json(
        { error: 'documentType must be one of: VIP, Department, General' },
        { status: 400 },
      );
    }

    // Check module access based on type
    const moduleKey = type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await createRegisterEntry({
      type,
      documentType: documentType || 'General',
      date: new Date(date),
      fromTo,
      subject,
      projectId,
      mode,
      refNo,
      officer,
      createdBy: session.user.id,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating register entry:', error);
    return NextResponse.json(
      { error: 'Failed to create register entry' },
      { status: 500 },
    );
  }
}


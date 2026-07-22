import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getProjectById,
  updateProject,
  deleteProject,
  getRegisterEntriesByProjectId,
  getRegisterAttachments,
  getProjectAttachments,
  getProjectGroundMedia,
  getAdmAllocationsByProjectId,
  hasModuleAccess,
} from '@/lib/db/queries';
import { projectFormSchema, validateForm } from '@/lib/validations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const entries = await getRegisterEntriesByProjectId(id);
    const entriesWithAttachments = await Promise.all(
      entries.map(async (entry) => {
        const attachments = await getRegisterAttachments(entry.id);
        return { ...entry, attachments };
      }),
    );

    const [documents, groundMedia, fundAllocations] = await Promise.all([
      getProjectAttachments(id),
      getProjectGroundMedia(id),
      getAdmAllocationsByProjectId(id),
    ]);

    return NextResponse.json({
      ...project,
      registerEntries: entriesWithAttachments,
      documents,
      groundMedia,
      fundAllocations,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 },
    );
  }
}

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

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await getProjectById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateForm(projectFormSchema, {
      name: body.name ?? existing.name,
      ward: body.ward ?? existing.ward ?? undefined,
      wardGeoId:
        body.wardGeoId !== undefined ? body.wardGeoId : existing.wardGeoId,
      boothNo: body.boothNo !== undefined ? body.boothNo : existing.boothNo,
      type: body.type ?? existing.type ?? undefined,
      status: body.status ?? existing.status,
      department: body.department ?? existing.department,
      category: body.category ?? existing.category,
      estimatedCost: body.estimatedCost ?? existing.estimatedCost,
      approvalStatus: body.approvalStatus ?? existing.approvalStatus,
      nocRequired: body.nocRequired ?? existing.nocRequired,
      nocStatus: body.nocStatus ?? existing.nocStatus,
      remarks: body.remarks ?? existing.remarks,
      physicalStatus: body.physicalStatus ?? existing.physicalStatus,
      bhoomiPujanDone: body.bhoomiPujanDone ?? existing.bhoomiPujanDone,
      bhoomiPujanDate: body.bhoomiPujanDate ?? existing.bhoomiPujanDate,
      lokarpanDone: body.lokarpanDone ?? existing.lokarpanDone,
      lokarpanDate: body.lokarpanDate ?? existing.lokarpanDate,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const updated = await updateProject(id, {
      ...validation.data,
      ward: validation.data.ward ?? null,
      wardGeoId: validation.data.wardGeoId ?? null,
      boothNo: validation.data.boothNo ?? null,
      type: validation.data.type ?? null,
      department: validation.data.department ?? null,
      category: validation.data.category ?? null,
      remarks: validation.data.remarks ?? null,
      bhoomiPujanDate: validation.data.bhoomiPujanDate ?? null,
      lokarpanDate: validation.data.lokarpanDate ?? null,
      taluka: null,
      village: null,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
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

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteProject(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 },
    );
  }
}

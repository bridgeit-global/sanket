import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getRegisterEntryById,
  updateRegisterEntry,
  deleteRegisterEntry,
  getRegisterAttachments,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await getRegisterEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const attachments = await getRegisterAttachments(id);

    return NextResponse.json({ ...entry, attachments });
  } catch (error) {
    console.error('Error fetching register entry:', error);
    return NextResponse.json(
      { error: 'Failed to fetch register entry' },
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

    const entry = await getRegisterEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.date) updateData.date = new Date(body.date);
    if (body.fromTo !== undefined) updateData.fromTo = body.fromTo;
    if (body.subject !== undefined) updateData.subject = body.subject;
    if (body.projectId !== undefined) updateData.projectId = body.projectId;
    if (body.mode !== undefined) updateData.mode = body.mode;
    if (body.refNo !== undefined) updateData.refNo = body.refNo;
    if (body.officer !== undefined) updateData.officer = body.officer;
    if (body.documentType !== undefined) {
      // Validate documentType
      if (!['VIP', 'Department', 'General'].includes(body.documentType)) {
        return NextResponse.json(
          { error: 'documentType must be one of: VIP, Department, General' },
          { status: 400 },
        );
      }
      updateData.documentType = body.documentType;
    }

    const updated = await updateRegisterEntry(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating register entry:', error);
    return NextResponse.json(
      { error: 'Failed to update register entry' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entry = await getRegisterEntryById(id);
    if (!entry) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check module access based on entry type
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteRegisterEntry(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting register entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete register entry' },
      { status: 500 },
    );
  }
}


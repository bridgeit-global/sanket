import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getRegisterEntryById,
  updateRegisterEntry,
  deleteRegisterEntry,
  getRegisterAttachments,
  getDocumentTypeByCode,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';
import { canAccessInwardRegister } from '@/lib/register/access';
import { registerEntryFormSchema, validateForm } from '@/lib/validations';

async function canAccessEntry(
  userId: string,
  entryType: 'inward' | 'outward',
): Promise<boolean> {
  if (entryType === 'inward') return canAccessInwardRegister(userId);
  return hasModuleAccess(userId, 'outward');
}

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

    const hasAccess = await canAccessEntry(session.user.id, entry.type);
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

    // Full I/O edit stays on inward/outward modules (not ADM-only link access)
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const validation = validateForm(registerEntryFormSchema, {
      date: body.date ?? entry.date,
      fromTo: body.fromTo ?? entry.fromTo,
      subject: body.subject ?? entry.subject,
      projectId:
        body.projectId !== undefined
          ? body.projectId === ''
            ? undefined
            : body.projectId
          : entry.projectId ?? undefined,
      mode: body.mode !== undefined ? body.mode || undefined : entry.mode ?? undefined,
      refNo: body.refNo !== undefined ? body.refNo || undefined : entry.refNo ?? undefined,
      officer:
        body.officer !== undefined ? body.officer || undefined : entry.officer ?? undefined,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};

    // Date should remain as string (YYYY-MM-DD format) as per schema
    if (body.date !== undefined) updateData.date = validation.data.date;
    if (body.fromTo !== undefined) updateData.fromTo = validation.data.fromTo;
    if (body.subject !== undefined) updateData.subject = validation.data.subject;
    if (body.projectId !== undefined) {
      updateData.projectId = body.projectId === '' ? null : body.projectId;
    }
    if (body.mode !== undefined) updateData.mode = validation.data.mode || null;
    if (body.refNo !== undefined) updateData.refNo = validation.data.refNo || null;
    if (body.officer !== undefined) updateData.officer = validation.data.officer || null;
    if (body.documentType !== undefined) {
      const docType = await getDocumentTypeByCode(String(body.documentType), {
        activeOnly: false,
      });
      if (!docType) {
        return NextResponse.json(
          { error: 'documentType is invalid' },
          { status: 400 },
        );
      }
      updateData.documentType = docType.code;
    }

    const updated = await updateRegisterEntry(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating register entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update register entry';
    return NextResponse.json(
      { error: errorMessage },
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

    // Delete stays on full I/O module access
    const moduleKey = entry.type === 'inward' ? 'inward' : 'outward';
    const hasAccess = await hasModuleAccess(session.user.id, moduleKey);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteRegisterEntry(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting register entry:', error);
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('foreign key') ||
      message.includes('violates foreign key') ||
      message.includes('23503')
    ) {
      return NextResponse.json(
        {
          error:
            'Cannot delete: this entry is linked to an ADM document or project attachment',
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete register entry' },
      { status: 500 },
    );
  }
}


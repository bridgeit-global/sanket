import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmFundRecordById,
  getAdmDocumentsByFundRecordId,
  createAdmDocument,
  getAdmDocumentById,
  updateAdmDocument,
  deleteAdmDocument,
  hasModuleAccess,
} from '@/lib/db/queries';
import { admDocumentLinkSchema, validateForm } from '@/lib/validations';
import { z } from 'zod';
import { admAmountUnitSchema } from '@/lib/validations';

const patchSchema = z.object({
  documentId: z.string().uuid(),
  amountUnit: admAmountUnitSchema.optional(),
  kind: z.string().max(100).optional(),
  label: z.string().max(255).nullable().optional(),
});

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

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const fund = await getAdmFundRecordById(id);
    if (!fund) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    const documents = await getAdmDocumentsByFundRecordId(id);
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching ADM documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

/** Link an inward register entry as an ADM sanction document (no direct file upload). */
export async function POST(
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

    const fund = await getAdmFundRecordById(id);
    if (!fund) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateForm(admDocumentLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const document = await createAdmDocument({
      fundRecordId: id,
      registerEntryId: validation.data.registerEntryId,
      amountUnit: validation.data.amountUnit ?? 'rupees',
      kind: validation.data.kind ?? 'sanction_order',
      label: validation.data.label,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error linking ADM document:', error);
    const message = error instanceof Error ? error.message : '';
    if (message.includes('Inward register entry is required')) {
      return NextResponse.json(
        { error: 'Inward register entry is required' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to link document' },
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
    const { id: fundRecordId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateForm(patchSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const existing = await getAdmDocumentById(validation.data.documentId);
    if (!existing || existing.fundRecordId !== fundRecordId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const updated = await updateAdmDocument(validation.data.documentId, {
      amountUnit: validation.data.amountUnit,
      kind: validation.data.kind,
      label: validation.data.label,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating ADM document:', error);
    return NextResponse.json(
      { error: 'Failed to update document' },
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
    const { id: fundRecordId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 },
      );
    }

    const existing = await getAdmDocumentById(documentId);
    if (!existing || existing.fundRecordId !== fundRecordId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    await deleteAdmDocument(documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting ADM document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

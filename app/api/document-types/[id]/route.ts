import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteDocumentType,
  getDocumentTypeById,
  hasModuleAccess,
  updateDocumentType,
} from '@/lib/db/queries';
import { normalizeReferencePrefix } from '@/lib/letters/reference-sequence';

async function canReadDocumentTypes(userId: string): Promise<boolean> {
  const [letter, outward, inward] = await Promise.all([
    hasModuleAccess(userId, 'letter-generation'),
    hasModuleAccess(userId, 'outward'),
    hasModuleAccess(userId, 'inward'),
  ]);
  return letter || outward || inward;
}

async function canWriteDocumentTypes(userId: string): Promise<boolean> {
  const [letter, outward] = await Promise.all([
    hasModuleAccess(userId, 'letter-generation'),
    hasModuleAccess(userId, 'outward'),
  ]);
  return letter || outward;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canReadDocumentTypes(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const documentType = await getDocumentTypeById(id);
    if (!documentType) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    return NextResponse.json({ documentType });
  } catch (error) {
    console.error('Error fetching document type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document type' },
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
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canWriteDocumentTypes(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getDocumentTypeById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    const body = await request.json();
    const code = normalizeReferencePrefix(String(body?.code ?? ''));
    const labelEn = String(body?.labelEn ?? '').trim();
    const labelMr = String(body?.labelMr ?? '').trim();
    const isActive = body?.isActive !== false;
    const sortOrder = Number.isFinite(Number(body?.sortOrder))
      ? Number(body.sortOrder)
      : existing.sortOrder;

    if (!code || !labelEn || !labelMr) {
      return NextResponse.json(
        { error: 'code, labelEn, and labelMr are required' },
        { status: 400 },
      );
    }

    const documentType = await updateDocumentType({
      id,
      code,
      labelEn,
      labelMr,
      isActive,
      sortOrder,
      updatedBy: session.user.id,
    });

    return NextResponse.json({ documentType });
  } catch (error) {
    console.error('Error updating document type:', error);
    const message =
      error instanceof Error && error.message.includes('duplicate')
        ? 'A document type with this code already exists'
        : 'Failed to update document type';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await canWriteDocumentTypes(session.user.id))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await getDocumentTypeById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Document type not found' }, { status: 404 });
    }

    await deleteDocumentType(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting document type:', error);
    return NextResponse.json(
      { error: 'Failed to delete document type' },
      { status: 500 },
    );
  }
}

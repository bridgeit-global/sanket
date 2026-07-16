import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  getAdmFundRecordById,
  getAdmDocumentsByFundRecordId,
  createAdmDocument,
  getAdmDocumentById,
  deleteAdmDocument,
  hasModuleAccess,
} from '@/lib/db/queries';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kind = String(formData.get('kind') || 'general');
    const label = formData.get('label') ? String(formData.get('label')) : null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size should be less than 10MB' },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 },
      );
    }

    const filename = `adm/funds/${id}/${Date.now()}-${file.name}`;
    const blob = await put(filename, await file.arrayBuffer(), {
      access: 'public',
      contentType: file.type,
    });

    const document = await createAdmDocument({
      fundRecordId: id,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: blob.url,
      kind,
      label,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Error uploading ADM document:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
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

    if (existing.fileUrl) {
      try {
        await del(existing.fileUrl);
      } catch {
        // non-fatal
      }
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

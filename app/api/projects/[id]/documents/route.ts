import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';
import {
  getProjectById,
  getProjectAttachments,
  createProjectAttachment,
  getProjectAttachmentById,
  getLatestProjectAttachmentVersion,
  deleteProjectAttachment,
  hasModuleAccess,
} from '@/lib/db/queries';
import { projectDocumentKindSchema } from '@/lib/validations';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const documents = await getProjectAttachments(id);
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Error fetching project documents:', error);
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

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const kindResult = projectDocumentKindSchema.safeParse(
      formData.get('documentKind') || 'supporting',
    );
    const versionGroupIdParam = formData.get('versionGroupId');

    if (!kindResult.success) {
      return NextResponse.json({ error: 'Invalid document kind' }, { status: 400 });
    }

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
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    const versionGroupId =
      typeof versionGroupIdParam === 'string' && versionGroupIdParam
        ? versionGroupIdParam
        : randomUUID();

    const latestVersion = versionGroupIdParam
      ? await getLatestProjectAttachmentVersion(versionGroupId)
      : 0;

    const filename = `projects/${id}/docs/${Date.now()}-${file.name}`;
    const blob = await put(filename, await file.arrayBuffer(), {
      access: 'public',
      contentType: file.type,
    });

    const attachment = await createProjectAttachment({
      projectId: id,
      fileName: file.name,
      fileSizeKb: Math.round(file.size / 1024),
      fileUrl: blob.url,
      documentKind: kindResult.data,
      version: latestVersion + 1,
      versionGroupId,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error uploading project document:', error);
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
    const { id: projectId } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
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

    const existing = await getProjectAttachmentById(documentId);
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (existing.fileUrl) {
      try {
        await del(existing.fileUrl);
      } catch {
        // non-fatal
      }
    }

    await deleteProjectAttachment(documentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 },
    );
  }
}

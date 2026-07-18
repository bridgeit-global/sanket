import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
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
import {
  projectDocumentLinkSchema,
  validateForm,
} from '@/lib/validations';
import { randomUUID } from 'crypto';

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

/** Link an inward register entry as a project document (no direct file upload). */
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

    const body = await request.json();
    const validation = validateForm(projectDocumentLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors[Object.keys(validation.errors)[0]] },
        { status: 400 },
      );
    }

    const versionGroupId =
      validation.data.versionGroupId && validation.data.versionGroupId.length > 0
        ? validation.data.versionGroupId
        : randomUUID();

    const latestVersion = validation.data.versionGroupId
      ? await getLatestProjectAttachmentVersion(versionGroupId)
      : 0;

    const attachment = await createProjectAttachment({
      projectId: id,
      registerEntryId: validation.data.registerEntryId,
      documentKind: validation.data.documentKind,
      version: latestVersion + 1,
      versionGroupId,
      uploadedBy: session.user.id,
    });

    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error('Error linking project document:', error);
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

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getProjectById,
  getRegisterEntriesByProjectId,
  createRegisterEntry,
  getRegisterAttachments,
  getDocumentTypeByCode,
  resolveDocumentTypeReferenceForSave,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';
import { parseReference } from '@/lib/letters/reference-sequence';
import { registerEntryFormSchema, validateForm } from '@/lib/validations';

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

    // Check module access for projects
    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify project exists
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch all register entries for this project
    const entries = await getRegisterEntriesByProjectId(id);

    // Fetch attachments for each entry
    const entriesWithAttachments = await Promise.all(
      entries.map(async (entry) => {
        const attachments = await getRegisterAttachments(entry.id);
        return { ...entry, attachments };
      }),
    );

    return NextResponse.json(entriesWithAttachments);
  } catch (error) {
    console.error('Error fetching project register entries:', error);
    return NextResponse.json(
      { error: 'Failed to fetch register entries' },
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

    // Check module access for projects
    const hasProjectAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasProjectAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify project exists
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      type,
      documentType,
      date,
      fromTo,
      subject,
      mode,
      refNo,
      officer,
      autoSequence,
    } = body;

    // Validate required fields
    if (!type || !date || !fromTo || !subject) {
      return NextResponse.json(
        { error: 'type, date, fromTo, and subject are required' },
        { status: 400 },
      );
    }

    const requestedType = String(documentType || 'General').trim();
    const docType = await getDocumentTypeByCode(requestedType, {
      activeOnly: true,
    });
    if (!docType) {
      return NextResponse.json(
        { error: 'documentType is invalid or inactive' },
        { status: 400 },
      );
    }

    // Check module access for the specific register type
    const registerModuleKey = type === 'inward' ? 'inward' : 'outward';
    const hasRegisterAccess = await hasModuleAccess(
      session.user.id,
      registerModuleKey,
    );
    if (!hasRegisterAccess) {
      return NextResponse.json(
        { error: `No access to ${type} register` },
        { status: 403 },
      );
    }

    let resolvedRefNo = refNo ? String(refNo).trim() || undefined : undefined;
    if (type === 'outward') {
      const parsed = parseReference(resolvedRefNo ?? '');
      const resolved = await resolveDocumentTypeReferenceForSave({
        code: docType.code,
        autoSequence: autoSequence !== false,
        clientNumber: parsed.number || undefined,
      });
      resolvedRefNo = resolved.fullReference;
    }

    const validation = validateForm(registerEntryFormSchema, {
      date,
      fromTo,
      subject,
      mode: mode || undefined,
      refNo: resolvedRefNo,
      officer: officer || undefined,
    });
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const entry = await createRegisterEntry({
      type,
      documentType: docType.code,
      date,
      fromTo: validation.data.fromTo,
      subject: validation.data.subject,
      projectId: id,
      mode: validation.data.mode,
      refNo: validation.data.refNo,
      officer: validation.data.officer,
      createdBy: session.user.id,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error('Error creating register entry:', error);
    const message = error instanceof Error ? error.message : '';
    const cause =
      error instanceof Error && 'cause' in error && typeof error.cause === 'string'
        ? error.cause
        : '';
    const detail = `${message} ${cause}`;
    if (
      detail.includes('Document type not found') ||
      detail.includes('inactive') ||
      detail.includes('Reference number is required')
    ) {
      return NextResponse.json(
        { error: cause || message || 'Invalid document type or reference' },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: 'Failed to create register entry' },
      { status: 500 },
    );
  }
}


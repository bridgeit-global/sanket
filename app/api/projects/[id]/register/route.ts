import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getProjectById,
  getRegisterEntriesByProjectId,
  createRegisterEntry,
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
    const { type, date, fromTo, subject, mode, refNo, officer } = body;

    // Validate required fields
    if (!type || !date || !fromTo || !subject) {
      return NextResponse.json(
        { error: 'type, date, fromTo, and subject are required' },
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

    const entry = await createRegisterEntry({
      type,
      date,
      fromTo,
      subject,
      projectId: id,
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


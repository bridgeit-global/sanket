import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getProjects, createProject } from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as
      | 'Concept'
      | 'Proposal'
      | 'In Progress'
      | 'Completed'
      | null;

    const projects = await getProjects({
      status: status || undefined,
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(session.user.id, 'projects');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, ward, type, status } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 },
      );
    }

    const project = await createProject({
      name,
      ward,
      type,
      status,
      createdBy: session.user.id,
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 },
    );
  }
}


import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getProjects, hasModuleAccess } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [hasAdm, hasProjects] = await Promise.all([
      hasModuleAccess(session.user.id, 'adm'),
      hasModuleAccess(session.user.id, 'projects'),
    ]);

    if (!hasAdm && !hasProjects) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const projects = await getProjects({ limit: 500 });
    return NextResponse.json(
      projects.map((p) => ({ id: p.id, name: p.name, ward: p.ward, status: p.status })),
    );
  } catch (error) {
    console.error('Error fetching ADM projects list:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { getCadreConfig } from '@/lib/db/cadre-queries';
import { PROJECT_HIERARCHY_CONSTITUENCY_ID } from '@/lib/projects/hierarchy-geo';

/**
 * Hierarchy geography for project location pickers.
 * Same CadreGeographicUnit data as cadre/hierarchy; accessible to projects or ADM.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [hasProjects, hasAdm] = await Promise.all([
      hasModuleAccess(session.user.id, 'projects'),
      hasModuleAccess(session.user.id, 'adm'),
    ]);
    if (!hasProjects && !hasAdm) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const config = await getCadreConfig();
    return NextResponse.json({
      success: true,
      constituencyId: PROJECT_HIERARCHY_CONSTITUENCY_ID,
      geoUnits: config.geoUnits,
    });
  } catch (error) {
    console.error('Error fetching project hierarchy geo:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geography' },
      { status: 500 },
    );
  }
}

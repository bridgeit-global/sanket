import { type NextRequest, NextResponse } from 'next/server';
import { getCadreConfig, getCadreConstituencyLeadership } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';

  try {
    const config = await getCadreConfig();
    const verticalIds = config.verticals
      .filter((vertical) => vertical.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((vertical) => vertical.id);
    const wardGeoIds = config.geoUnits
      .filter((unit) => unit.type === 'ward' && unit.isActive)
      .map((unit) => unit.id);

    const { entries, wardSummaries } = await getCadreConstituencyLeadership(
      constituencyId,
      verticalIds,
      wardGeoIds,
      config.geoUnits,
    );

    return NextResponse.json({ success: true, entries, wardSummaries });
  } catch (error) {
    console.error('Taluka leadership failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load taluka leadership';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

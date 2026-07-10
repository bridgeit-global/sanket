import { type NextRequest, NextResponse } from 'next/server';
import {
  getCadreConfig,
  getCadreTalukaLeadershipAllWings,
} from '@/lib/db/cadre-queries';
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

    const entries = await getCadreTalukaLeadershipAllWings(
      constituencyId,
      verticalIds,
    );

    return NextResponse.json({ success: true, entries });
  } catch (error) {
    console.error('Taluka leadership failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load taluka leadership';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

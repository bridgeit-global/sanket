import { type NextRequest, NextResponse } from 'next/server';
import { getCadreConfig, getCadreHierarchyCanvasData } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';
import type { CanvasLoadScope } from '@/lib/hierarchy/canvas-data';

type CanvasRequestBody = {
  constituencyId?: string;
  verticalId?: string;
  scope?: string;
  wardGeoId?: string;
  boothNo?: string;
};

function parseScope(body: CanvasRequestBody): CanvasLoadScope | { error: string } {
  const scope = body.scope?.trim() || 'taluka';
  if (scope === 'taluka') return { level: 'taluka' };

  const wardGeoId = body.wardGeoId?.trim() ?? '';
  if (scope === 'ward') {
    if (!wardGeoId) return { error: 'wardGeoId is required' };
    return { level: 'ward', wardGeoId };
  }

  if (scope === 'booth') {
    const boothNo = body.boothNo?.trim() ?? '';
    if (!wardGeoId || !boothNo) {
      return { error: 'wardGeoId and boothNo are required' };
    }
    return { level: 'booth', wardGeoId, boothNo };
  }

  return { error: 'Invalid scope' };
}

export async function POST(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: CanvasRequestBody;
  try {
    body = (await request.json()) as CanvasRequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const constituencyId = body.constituencyId?.trim() || '172';
  const verticalId = body.verticalId?.trim() ?? '';
  if (!verticalId) {
    return NextResponse.json({ error: 'verticalId is required' }, { status: 400 });
  }

  const scope = parseScope(body);
  if ('error' in scope) {
    return NextResponse.json({ error: scope.error }, { status: 400 });
  }

  try {
    const config = await getCadreConfig();
    const wardGeoIds = config.geoUnits
      .filter((unit) => unit.type === 'ward' && unit.isActive)
      .map((unit) => unit.id);

    const canvas = await getCadreHierarchyCanvasData({
      constituencyId,
      verticalId,
      wardGeoIds,
      geoUnits: config.geoUnits,
      scope,
    });

    return NextResponse.json({ success: true, scope: scope.level, canvas });
  } catch (error) {
    console.error('Hierarchy canvas failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load hierarchy canvas';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

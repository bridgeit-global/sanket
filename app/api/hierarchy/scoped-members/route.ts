import { type NextRequest, NextResponse } from 'next/server';
import {
  getCadreCommitteeMembers,
  getCadreMembersForWardScope,
} from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

const COMMITTEE_LEVELS = new Set([
  'taluka_committee',
  'ward_committee',
  'booth_committee',
]);

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';
  const scope = searchParams.get('scope')?.trim() ?? '';
  const verticalId = searchParams.get('verticalId')?.trim() ?? '';
  const wardGeoId = searchParams.get('wardGeoId')?.trim() ?? '';
  const boothNo = searchParams.get('boothNo')?.trim() ?? '';

  try {
    if (scope === 'ward') {
      if (!wardGeoId) {
        return NextResponse.json({ error: 'wardGeoId is required' }, { status: 400 });
      }
      const members = await getCadreMembersForWardScope(constituencyId, wardGeoId);
      return NextResponse.json({ success: true, members });
    }

    if (!COMMITTEE_LEVELS.has(scope)) {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }
    if (!verticalId) {
      return NextResponse.json({ error: 'verticalId is required' }, { status: 400 });
    }
    if (scope === 'ward_committee' && !wardGeoId) {
      return NextResponse.json({ error: 'wardGeoId is required' }, { status: 400 });
    }
    if (scope === 'booth_committee' && (!wardGeoId || !boothNo)) {
      return NextResponse.json(
        { error: 'wardGeoId and boothNo are required' },
        { status: 400 },
      );
    }

    const members = await getCadreCommitteeMembers({
      constituencyId,
      verticalId,
      committeeLevel: scope as 'taluka_committee' | 'ward_committee' | 'booth_committee',
      wardGeoId: wardGeoId || undefined,
      boothNo: boothNo || undefined,
    });

    return NextResponse.json({ success: true, members });
  } catch (error) {
    console.error('Scoped members failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load members';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

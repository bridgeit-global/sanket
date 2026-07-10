import { type NextRequest, NextResponse } from 'next/server';
import {
  createCadreMember,
  getCadreConfig,
  getCadreMembersPage,
} from '@/lib/db/cadre-queries';
import {
  DEFAULT_MEMBER_PAGE_SIZE,
  parseMemberPageParam,
  parseMemberPageSizeParam,
} from '@/lib/hierarchy/member-list';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';
  const query = searchParams.get('q')?.trim() ?? '';
  const page = parseMemberPageParam(searchParams.get('page'));
  const pageSize = parseMemberPageSizeParam(
    searchParams.get('pageSize') ?? String(DEFAULT_MEMBER_PAGE_SIZE),
  );
  const verticalId = searchParams.get('verticalId')?.trim() ?? '';
  const positionId = searchParams.get('positionId')?.trim() ?? '';
  const wardGeoId = searchParams.get('wardGeoId')?.trim() ?? '';
  const boothNo = searchParams.get('boothNo')?.trim() ?? '';
  const memberId = searchParams.get('memberId')?.trim() ?? '';

  try {
    const config = await getCadreConfig();
    const membersPage = await getCadreMembersPage({
      constituencyId,
      query,
      page,
      pageSize,
      verticalId: verticalId || undefined,
      positionId: positionId || undefined,
      wardGeoId: wardGeoId || undefined,
      boothNo: boothNo || undefined,
      memberId: memberId || undefined,
      geoUnits: config.geoUnits,
    });

    return NextResponse.json({
      success: true,
      members: membersPage.members,
      pagination: {
        page: membersPage.page,
        pageSize: membersPage.pageSize,
        total: membersPage.total,
        totalPages: membersPage.totalPages,
      },
    });
  } catch (error) {
    console.error('Hierarchy members search failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load members';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const member = await createCadreMember(body, access.userId);
    return NextResponse.json({ success: true, member });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import {
  getCadreConfig,
  getCadreMembersPaginated,
} from '@/lib/db/cadre-queries';
import { getBoothsForElection, getElectionMasters } from '@/lib/db/queries';
import { extractBoothNumber } from '@/lib/hierarchy/booth-geo-units';
import { BOOTSTRAP_MEMBER_PAGE_SIZE } from '@/lib/hierarchy/member-list';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

function resolveDefaultElectionId(
  elections: Awaited<ReturnType<typeof getElectionMasters>>,
  constituencyId: string,
) {
  const assembly = elections.find(
    (e) =>
      e.constituencyType === 'assembly' && e.constituencyId === constituencyId,
  );
  return assembly?.electionId ?? elections[0]?.electionId ?? '';
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? String(fallback), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';
  const memberPage = parsePositiveInt(searchParams.get('memberPage'), 1);
  const memberPageSize = parsePositiveInt(
    searchParams.get('memberPageSize'),
    BOOTSTRAP_MEMBER_PAGE_SIZE,
  );
  const membersOnly = searchParams.get('membersOnly') === 'true';

  try {
    const membersPage = await getCadreMembersPaginated({
      constituencyId,
      page: memberPage,
      pageSize: memberPageSize,
    });

    if (membersOnly) {
      return NextResponse.json({
        success: true,
        members: membersPage.members,
        membersPagination: {
          page: membersPage.page,
          pageSize: membersPage.pageSize,
          total: membersPage.total,
          totalPages: membersPage.totalPages,
        },
      });
    }

    const elections = await getElectionMasters();
    const defaultElectionId = resolveDefaultElectionId(elections, constituencyId);

    const config = await getCadreConfig();
    const booths = defaultElectionId
      ? await getBoothsForElection(defaultElectionId)
      : [];

    const boothNosFromGeo = [
      ...new Set(
        config.geoUnits
          .filter((g) => g.type === 'booth' && g.isActive)
          .map((g) => extractBoothNumber(g.name))
          .filter((n): n is string => Boolean(n)),
      ),
    ];

    return NextResponse.json({
      success: true,
      config,
      members: membersPage.members,
      membersPagination: {
        page: membersPage.page,
        pageSize: membersPage.pageSize,
        total: membersPage.total,
        totalPages: membersPage.totalPages,
      },
      elections,
      defaultElectionId,
      boothNos: boothNosFromGeo.length > 0 ? boothNosFromGeo : booths.map((b) => b.boothNo),
    });
  } catch (error) {
    console.error('Hierarchy bootstrap failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to load hierarchy data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

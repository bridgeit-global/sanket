import { type NextRequest, NextResponse } from 'next/server';
import {
  getCadreConfig,
  getCadreConfigReferenceCounts,
  getCadreTree,
} from '@/lib/db/cadre-queries';
import { getBoothsForElection, getElectionMasters } from '@/lib/db/queries';
import { extractBoothNumber } from '@/lib/hierarchy/booth-geo-units';
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

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const constituencyId = searchParams.get('constituencyId') ?? '172';

  const elections = await getElectionMasters();
  const defaultElectionId = resolveDefaultElectionId(elections, constituencyId);

  const [config, referenceCounts, nodes, booths] = await Promise.all([
    getCadreConfig(),
    getCadreConfigReferenceCounts(),
    getCadreTree({ constituencyId }),
    defaultElectionId ? getBoothsForElection(defaultElectionId) : Promise.resolve([]),
  ]);

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
    referenceCounts,
    nodes,
    elections,
    defaultElectionId,
    boothNos: boothNosFromGeo.length > 0 ? boothNosFromGeo : booths.map((b) => b.boothNo),
  });
}

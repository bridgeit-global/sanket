import { type NextRequest, NextResponse } from 'next/server';
import { communityServiceAreas, BoothMaster } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { db, getCurrentElectionId } from '@/lib/db/queries';
import { asc, and, eq, inArray, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const wardNos = searchParams.getAll('wardNo');
        const electionId =
            searchParams.get('electionId') ?? (await getCurrentElectionId());

        const partsByWard: Record<string, string[]> = {};
        const allPartsSet = new Set<string>();

        if (wardNos.length > 0) {
            const csaParts = await db
                .select({
                    boothNo: communityServiceAreas.boothNo,
                    wardNo: communityServiceAreas.wardNo,
                })
                .from(communityServiceAreas)
                .where(
                    and(
                        isNotNull(communityServiceAreas.boothNo),
                        inArray(communityServiceAreas.wardNo, wardNos),
                    ),
                )
                .orderBy(asc(communityServiceAreas.wardNo), asc(communityServiceAreas.boothNo));

            for (const part of csaParts) {
                if (!part.wardNo || !part.boothNo) continue;
                if (!partsByWard[part.wardNo]) partsByWard[part.wardNo] = [];
                partsByWard[part.wardNo].push(part.boothNo);
                allPartsSet.add(part.boothNo);
            }
        }

        const boothRows = await db
            .select({ boothNo: BoothMaster.boothNo })
            .from(BoothMaster)
            .where(eq(BoothMaster.electionId, electionId))
            .orderBy(asc(BoothMaster.boothNo));

        for (const row of boothRows) {
            if (row.boothNo) allPartsSet.add(row.boothNo);
        }

        const allParts = Array.from(allPartsSet).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );

        return NextResponse.json({
            success: true,
            data: {
                partsByWard,
                allParts,
                electionId,
            },
        });
    } catch (error) {
        console.error('Parts by wards fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch booth/part numbers by ward' },
            { status: 500 },
        );
    }
}

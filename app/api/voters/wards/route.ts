import { type NextRequest, NextResponse } from 'next/server';
import { communityServiceAreas, ElectionMaster } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { asc, eq, and, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const boothNo = searchParams.get('boothNo') ?? searchParams.get('partNo');

        const csaConditions = [isNotNull(communityServiceAreas.wardNo)];
        if (boothNo) {
            csaConditions.push(eq(communityServiceAreas.boothNo, boothNo));
        }

        const wardFromServiceAreas = await db
            .select({ wardNo: communityServiceAreas.wardNo })
            .from(communityServiceAreas)
            .where(and(...csaConditions))
            .groupBy(communityServiceAreas.wardNo)
            .orderBy(asc(communityServiceAreas.wardNo));

        const wardFromElections = await db
            .select({ wardNo: ElectionMaster.constituencyId })
            .from(ElectionMaster)
            .where(
                and(
                    eq(ElectionMaster.constituencyType, 'ward'),
                    isNotNull(ElectionMaster.constituencyId),
                ),
            )
            .groupBy(ElectionMaster.constituencyId)
            .orderBy(asc(ElectionMaster.constituencyId));

        const wardSet = new Set<string>();
        for (const row of [...wardFromServiceAreas, ...wardFromElections]) {
            if (row.wardNo) wardSet.add(row.wardNo);
        }

        const wardNumbers = Array.from(wardSet).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );

        return NextResponse.json({
            success: true,
            data: {
                wardNumbers,
                totalWards: wardNumbers.length,
            },
        });
    } catch (error) {
        console.error('Wards fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ward numbers' },
            { status: 500 },
        );
    }
}

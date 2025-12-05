import { type NextRequest, NextResponse } from 'next/server';
import { PartNo } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { asc, eq, and, isNotNull, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const wardNos = searchParams.getAll('wardNo');

        // Build query conditions
        const conditions = [isNotNull(PartNo.partNo)];
        if (wardNos.length > 0) {
            conditions.push(inArray(PartNo.wardNo, wardNos));
        }

        // Get part numbers from PartNo table filtered by ward numbers
        const parts = await db
            .select({ partNo: PartNo.partNo, wardNo: PartNo.wardNo })
            .from(PartNo)
            .where(and(...conditions))
            .orderBy(asc(PartNo.wardNo), asc(PartNo.partNo));

        // Group by ward number
        const partsByWard: Record<string, string[]> = {};
        parts.forEach((part) => {
            if (part.wardNo && part.partNo) {
                if (!partsByWard[part.wardNo]) {
                    partsByWard[part.wardNo] = [];
                }
                partsByWard[part.wardNo].push(part.partNo);
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                partsByWard,
                allParts: parts.map(p => p.partNo).filter((p): p is string => p !== null)
            }
        });

    } catch (error) {
        console.error('Parts by wards fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch part numbers by ward' },
            { status: 500 }
        );
    }
}


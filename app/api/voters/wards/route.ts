import { type NextRequest, NextResponse } from 'next/server';
import { PartNo } from '@/lib/db/schema';
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
        const partNo = searchParams.get('partNo');

        // Build query conditions
        const conditions = [isNotNull(PartNo.wardNo)];
        if (partNo) {
            conditions.push(eq(PartNo.partNo, partNo));
        }

        // Get distinct ward numbers from PartNo table
        const wards = await db
            .select({ wardNo: PartNo.wardNo })
            .from(PartNo)
            .where(and(...conditions))
            .groupBy(PartNo.wardNo)
            .orderBy(asc(PartNo.wardNo));

        const wardNumbers = wards
            .map((ward: { wardNo: string | null }) => ward.wardNo)
            .filter((wardNo): wardNo is string => wardNo !== null);

        return NextResponse.json({
            success: true,
            data: {
                wardNumbers,
                totalWards: wardNumbers.length
            }
        });

    } catch (error) {
        console.error('Wards fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ward numbers' },
            { status: 500 }
        );
    }
}


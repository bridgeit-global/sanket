import { type NextRequest, NextResponse } from 'next/server';
import { PartNo } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { asc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get distinct part numbers from PartNo table
        const parts = await db
            .select({ partNo: PartNo.partNo })
            .from(PartNo)
            .orderBy(asc(PartNo.partNo));

        const partNumbers = parts
            .map((part: { partNo: string | null }) => part.partNo)
            .filter((partNo): partNo is string => partNo !== null);

        return NextResponse.json({
            success: true,
            data: {
                partNumbers,
                totalParts: partNumbers.length
            }
        });

    } catch (error) {
        console.error('Parts fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch part numbers' },
            { status: 500 }
        );
    }
} 
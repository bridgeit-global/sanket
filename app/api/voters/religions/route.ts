import { type NextRequest, NextResponse } from 'next/server';
import { VoterMaster } from '@/lib/db/schema';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { asc, isNotNull } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get distinct religions from VoterMaster table
        const religions = await db
            .select({ religion: VoterMaster.religion })
            .from(VoterMaster)
            .where(isNotNull(VoterMaster.religion))
            .groupBy(VoterMaster.religion)
            .orderBy(asc(VoterMaster.religion));

        const religionList = religions
            .map((r: { religion: string | null }) => r.religion)
            .filter((religion): religion is string => religion !== null && religion.trim() !== '');

        return NextResponse.json({
            success: true,
            data: {
                religions: religionList,
                totalReligions: religionList.length
            }
        });

    } catch (error) {
        console.error('Religions fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch religions' },
            { status: 500 }
        );
    }
}


import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getDistinctReligions } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const religionList = await getDistinctReligions();

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

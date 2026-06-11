import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getCurrentElectionId, getPartsByWards } from '@/lib/db/queries';

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

        const { partsByWard, allParts } = await getPartsByWards(wardNos, electionId);

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

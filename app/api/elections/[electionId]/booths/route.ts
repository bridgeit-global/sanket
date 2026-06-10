import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getBoothsForElection } from '@/lib/db/queries';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ electionId: string }> },
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { electionId } = await params;
        const booths = await getBoothsForElection(electionId);

        return NextResponse.json({
            success: true,
            electionId,
            booths,
        });
    } catch (error) {
        console.error('Booths fetch error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch booths' },
            { status: 500 },
        );
    }
}

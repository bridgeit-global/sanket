import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVotersByFamilyGrouping, getVoterByEpicNumber } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { epicNumber } = await request.json();

        if (!epicNumber || typeof epicNumber !== 'string') {
            return NextResponse.json({ error: 'EPIC Number is required' }, { status: 400 });
        }

        // Get the voter to find their familyGrouping
        const voters = await getVoterByEpicNumber(epicNumber);
        if (voters.length === 0) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        const voter = voters[0];

        // Get all family members with the same familyGrouping and part number
        const familyMembers = await getVotersByFamilyGrouping(voter.familyGrouping);

        // Filter out the primary voter from family members
        const relatedVoters = familyMembers.filter(f => f.epicNumber !== epicNumber);

        return NextResponse.json({
            relatedVoters,
            primaryVoter: voter
        });
    } catch (error) {
        console.error('Error getting family members:', error);
        return NextResponse.json(
            { error: 'Failed to get family members' },
            { status: 500 }
        );
    }
}


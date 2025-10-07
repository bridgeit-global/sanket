import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateVoterMobileNumber } from '@/lib/db/queries';

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator', 'back-office'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { epicNumber, mobileNoPrimary, mobileNoSecondary } = await request.json();

        if (!epicNumber || typeof epicNumber !== 'string') {
            return NextResponse.json({ error: 'EPIC number is required' }, { status: 400 });
        }

        const updatedVoter = await updateVoterMobileNumber(
            epicNumber,
            mobileNoPrimary,
            mobileNoSecondary
        );

        if (!updatedVoter) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        return NextResponse.json({ voter: updatedVoter });
    } catch (error) {
        console.error('Error updating voter mobile:', error);
        return NextResponse.json(
            { error: 'Failed to update voter mobile number' },
            { status: 500 }
        );
    }
}

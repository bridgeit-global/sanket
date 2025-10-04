import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { updateVoterMobileNumber } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { epicNumber, mobileNoPrimary, mobileNoSecondary } = await request.json();

        if (!epicNumber || typeof epicNumber !== 'string') {
            return NextResponse.json({ error: 'EPIC Number is required' }, { status: 400 });
        }

        if (!mobileNoPrimary || typeof mobileNoPrimary !== 'string') {
            return NextResponse.json({ error: 'Primary mobile number is required' }, { status: 400 });
        }

        // Validate phone number format (basic validation)
        const phoneRegex = /^[\d\s\-\(\)]{7,15}$/;
        if (!phoneRegex.test(mobileNoPrimary)) {
            return NextResponse.json({ error: 'Invalid primary mobile number format' }, { status: 400 });
        }

        if (mobileNoSecondary && !phoneRegex.test(mobileNoSecondary)) {
            return NextResponse.json({ error: 'Invalid secondary mobile number format' }, { status: 400 });
        }

        const updatedVoter = await updateVoterMobileNumber(
            epicNumber,
            mobileNoPrimary,
            mobileNoSecondary
        );

        if (!updatedVoter) {
            return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
        }

        return NextResponse.json(updatedVoter);
    } catch (error) {
        console.error('Error updating voter phone number:', error);
        return NextResponse.json(
            { error: 'Failed to update voter phone number' },
            { status: 500 }
        );
    }
}

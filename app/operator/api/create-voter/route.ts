import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createVoter } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator', 'back-office'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const voterData = await request.json();

        // Validate required fields
        if (!voterData.epicNumber || !voterData.fullName) {
            return NextResponse.json({
                error: 'EPIC Number and Full Name are required'
            }, { status: 400 });
        }

        const voter = await createVoter(voterData);

        return NextResponse.json({ voter });
    } catch (error) {
        console.error('Error creating voter:', error);
        return NextResponse.json(
            { error: 'Failed to create voter' },
            { status: 500 }
        );
    }
}

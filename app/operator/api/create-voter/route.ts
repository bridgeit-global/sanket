import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { createVoter } from '@/lib/db/queries';
import {
    EPIC_NUMBER_INVALID_MESSAGE,
    EPIC_NUMBER_PATTERN,
    normalizeEpicNumber,
} from '@/lib/epic/normalize-epic';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const voterData = await request.json();

        // Validate required fields
        if (!voterData.epicNumber || !voterData.fullName) {
            return NextResponse.json({
                error: 'EPIC Number and Full Name are required'
            }, { status: 400 });
        }

        const epicNumber = normalizeEpicNumber(String(voterData.epicNumber));
        if (!EPIC_NUMBER_PATTERN.test(epicNumber)) {
            return NextResponse.json(
                { error: EPIC_NUMBER_INVALID_MESSAGE },
                { status: 400 },
            );
        }

        const voter = await createVoter({ ...voterData, epicNumber });

        return NextResponse.json({ voter });
    } catch (error) {
        console.error('Error creating voter:', error);
        return NextResponse.json(
            { error: 'Failed to create voter' },
            { status: 500 }
        );
    }
}

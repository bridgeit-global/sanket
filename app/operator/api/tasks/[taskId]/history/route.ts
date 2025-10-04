import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getTaskHistory } from '@/lib/db/queries';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await params;
        const history = await getTaskHistory(taskId);
        return NextResponse.json({ history });
    } catch (error) {
        console.error('Error fetching task history:', error);
        return NextResponse.json(
            { error: 'Failed to fetch task history' },
            { status: 500 }
        );
    }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    getTasksWithFilters,
    createVoterTask
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);

        // Extract filter parameters
        const status = searchParams.get('status');
        const priority = searchParams.get('priority');
        const token = searchParams.get('token');
        const mobileNo = searchParams.get('mobileNo');
        const voterId = searchParams.get('voterId');
        const page = Number.parseInt(searchParams.get('page') || '1');
        const limit = Number.parseInt(searchParams.get('limit') || '10');
        const assignedTo = searchParams.get('assignedTo');

        // Validate pagination parameters
        if (page < 1) {
            return NextResponse.json({ error: 'Page must be greater than 0' }, { status: 400 });
        }
        if (limit < 1 || limit > 100) {
            return NextResponse.json({ error: 'Limit must be between 1 and 100' }, { status: 400 });
        }

        const result = await getTasksWithFilters({
            status: status || undefined,
            priority: priority || undefined,
            token: token || undefined,
            mobileNo: mobileNo || undefined,
            voterId: voterId || undefined,
            page,
            limit,
            assignedTo: assignedTo || undefined,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { serviceId, voterId, taskType, description, priority, notes } = body;

        if (!serviceId || !voterId || !taskType) {
            return NextResponse.json(
                { error: 'Missing required fields: serviceId, voterId, taskType' },
                { status: 400 }
            );
        }

        const task = await createVoterTask({
            serviceId,
            voterId,
            taskType,
            description,
            priority: priority || 'medium',
            assignedTo: session.user.id,
            notes,
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (error) {
        console.error('Error creating task:', error);
        return NextResponse.json(
            { error: 'Failed to create task' },
            { status: 500 }
        );
    }
}

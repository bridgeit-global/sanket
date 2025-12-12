import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    updateVoterTaskStatus,
    getVoterTaskById
} from '@/lib/db/queries';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { taskId } = await params;
        const task = await getVoterTaskById(taskId);

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ task });
    } catch (error) {
        console.error('Error fetching task:', error);
        return NextResponse.json(
            { error: 'Failed to fetch task' },
            { status: 500 }
        );
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { status, notes, assignedTo } = body;

        if (!status) {
            return NextResponse.json(
                { error: 'Status is required' },
                { status: 400 }
            );
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status. Must be one of: pending, in_progress, completed, cancelled' },
                { status: 400 }
            );
        }

        const { taskId } = await params;
        const updatedTask = await updateVoterTaskStatus({
            id: taskId,
            status,
            notes,
            assignedTo: assignedTo || session.user.id,
            performedBy: session.user.id,
            updatedBy: session.user.id,
        });

        if (!updatedTask) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        return NextResponse.json({ task: updatedTask });
    } catch (error) {
        console.error('Error updating task:', error);
        return NextResponse.json(
            { error: 'Failed to update task' },
            { status: 500 }
        );
    }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    updateVoterTaskStatus,
    updateBeneficiaryServiceStatus,
    getVoterTaskById,
    getBeneficiaryServiceById,
    createTaskHistoryEntry
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Validate that user ID exists and is a valid UUID
        if (!session.user.id) {
            console.error('User ID is missing from session:', session.user);
            return NextResponse.json({ error: 'User ID not found in session' }, { status: 400 });
        }

        const body = await request.json();
        const { taskId, serviceId, reason, priority = 'high' } = body;

        if (!taskId && !serviceId) {
            return NextResponse.json(
                { error: 'Either taskId or serviceId is required' },
                { status: 400 }
            );
        }

        if (!reason) {
            return NextResponse.json(
                { error: 'Escalation reason is required' },
                { status: 400 }
            );
        }

        const escalationNote = `ESCALATION REQUEST: ${reason}\nRequested by: ${session.user.userId ?? session.user.id}\nPriority: ${priority}\nTimestamp: ${new Date().toISOString()}`;

        const result: { task?: any; service?: any } = {};

        // Escalate task if taskId provided
        if (taskId) {
            const task = await getVoterTaskById(taskId);
            if (!task) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }

            // Update task with increased priority and escalation notes
            const updatedTask = await updateVoterTaskStatus({
                id: taskId,
                status: 'in_progress', // Move to in_progress when escalated
                priority: priority, // Update priority to escalated level
                notes: escalationNote,
                assignedTo: session.user.id,
                performedBy: session.user.id,
            });

            // Create escalation history entry
            await createTaskHistoryEntry({
                taskId,
                action: 'escalated',
                oldValue: task.priority,
                newValue: `Priority: ${priority}, Reason: ${reason}`,
                performedBy: session.user.id,
                notes: escalationNote,
            });

            result.task = updatedTask;
        }

        // Escalate service if serviceId provided
        if (serviceId) {
            const service = await getBeneficiaryServiceById(serviceId);
            if (!service) {
                return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            }

            // Update service with increased priority and escalation notes
            const updatedService = await updateBeneficiaryServiceStatus({
                id: serviceId,
                status: 'in_progress', // Move to in_progress when escalated
                priority: priority, // Update priority to escalated level
                notes: escalationNote,
                assignedTo: session.user.id,
            });

            result.service = updatedService;
        }

        // TODO: Send notification to admin users about escalation
        // This could be implemented with email notifications, in-app notifications, etc.

        return NextResponse.json({
            message: 'Escalation request submitted successfully',
            ...result
        }, { status: 200 });
    } catch (error) {
        console.error('Error escalating request:', error);
        return NextResponse.json(
            { error: 'Failed to escalate request' },
            { status: 500 }
        );
    }
}

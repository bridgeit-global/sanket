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
import { notifyPush, sendPushToModule } from '@/lib/push/send';

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

        const escalateService = async (id: string) => {
            const service = await getBeneficiaryServiceById(id);
            if (!service) {
                return null;
            }

            const updatedService = await updateBeneficiaryServiceStatus({
                id,
                status: 'in_progress',
                priority,
                notes: escalationNote,
                assignedTo: session.user.id,
            });

            result.service = updatedService;
            return updatedService;
        };

        // Escalate by taskId — individual services use beneficiary service ID as task ID
        if (taskId) {
            const escalatedAsService = await escalateService(taskId);
            if (!escalatedAsService) {
                const task = await getVoterTaskById(taskId);
                if (!task) {
                    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
                }

                const updatedTask = await updateVoterTaskStatus({
                    id: taskId,
                    status: 'in_progress',
                    priority,
                    notes: escalationNote,
                    assignedTo: session.user.id,
                    performedBy: session.user.id,
                });

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
        }

        // Escalate linked service when distinct from taskId (e.g. community tasks)
        if (serviceId && serviceId !== taskId) {
            const updatedService = await escalateService(serviceId);
            if (!updatedService) {
                return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            }
        }

        const escalationTarget = result.task ? 'Task' : 'Service';
        const escalationId = taskId ?? serviceId;
        notifyPush(() =>
            sendPushToModule('user-management', {
                title: `${escalationTarget} escalated`,
                body: reason.length > 120 ? `${reason.slice(0, 117)}...` : reason,
                url: result.task
                    ? `/modules/operator?taskId=${taskId}`
                    : `/modules/operator?serviceId=${serviceId ?? taskId}`,
                tag: `escalation-${escalationId}`,
            }, { excludeUserId: session.user.id }),
        );

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

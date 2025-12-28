import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    updateBeneficiaryServiceStatus,
    getBeneficiaryServiceById,
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
        
        // Try service first (for individual services)
        const service = await getBeneficiaryServiceById(taskId);
        if (service) {
            // Return in task-like format for compatibility
            return NextResponse.json({ 
                task: {
                    id: service.id,
                    serviceId: service.id,
                    voterId: service.voterId || '',
                    taskType: 'service_request',
                    description: service.description,
                    status: service.status,
                    priority: service.priority,
                    assignedTo: service.assignedTo,
                    createdBy: service.requestedBy,
                    updatedBy: null,
                    createdAt: service.createdAt,
                    updatedAt: service.updatedAt,
                    completedAt: service.completedAt,
                    notes: service.notes,
                    service: service,
                }
            });
        }

        // Fallback to legacy VoterTask for backward compatibility
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
        
        // Try service first (for individual services)
        const service = await getBeneficiaryServiceById(taskId);
        if (service) {
            const updatedService = await updateBeneficiaryServiceStatus({
                id: taskId,
                status: status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
                notes,
                assignedTo: assignedTo || session.user.id,
            });

            if (!updatedService) {
                return NextResponse.json({ error: 'Service not found' }, { status: 404 });
            }

            // Return in task-like format for compatibility
            return NextResponse.json({ 
                task: {
                    id: updatedService.id,
                    serviceId: updatedService.id,
                    voterId: updatedService.voterId || '',
                    taskType: 'service_request',
                    description: updatedService.description,
                    status: updatedService.status,
                    priority: updatedService.priority,
                    assignedTo: updatedService.assignedTo,
                    createdBy: updatedService.requestedBy,
                    updatedBy: null,
                    createdAt: updatedService.createdAt,
                    updatedAt: updatedService.updatedAt,
                    completedAt: updatedService.completedAt,
                    notes: updatedService.notes,
                    service: updatedService,
                }
            });
        }

        // Fallback to legacy VoterTask for backward compatibility
        const updatedTask = await updateVoterTaskStatus({
            id: taskId,
            status: status as 'pending' | 'in_progress' | 'completed' | 'cancelled',
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

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    createVoterTask,
    getBeneficiaryServiceById
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator'].includes(session.user.role)) {
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

        // Verify the service exists
        const service = await getBeneficiaryServiceById(serviceId);
        if (!service) {
            return NextResponse.json({ error: 'Service not found' }, { status: 404 });
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
        console.error('Error adding task:', error);
        return NextResponse.json(
            { error: 'Failed to add task' },
            { status: 500 }
        );
    }
}

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    createBeneficiaryService,
    createVoterTask,
    createCommunityServiceAreas
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user || !['admin', 'operator'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const {
            serviceType,
            serviceName,
            description,
            priority,
            notes,
            voterId,
            serviceAreas
        } = await request.json();

        // Validate required fields
        if (!serviceType || !serviceName || !voterId) {
            return NextResponse.json({
                error: 'Service type, service name, and voter ID are required'
            }, { status: 400 });
        }

        // Create the beneficiary service
        const service = await createBeneficiaryService({
            serviceType,
            serviceName,
            description,
            priority,
            requestedBy: session.user.id,
            notes,
        });

        // Create voter task for individual service
        if (serviceType === 'individual') {
            await createVoterTask({
                serviceId: service.id,
                voterId,
                taskType: 'service_request',
                description: `Service request: ${serviceName}`,
                priority,
                notes,
            });
        }

        // Create community service areas for community service
        if (serviceType === 'community' && serviceAreas && serviceAreas.length > 0) {
            await createCommunityServiceAreas({
                serviceId: service.id,
                areas: serviceAreas,
            });
        }

        return NextResponse.json({
            serviceId: service.id,
            service
        });
    } catch (error) {
        console.error('Error creating beneficiary service:', error);
        return NextResponse.json(
            { error: 'Failed to create beneficiary service' },
            { status: 500 }
        );
    }
}

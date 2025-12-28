import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    createBeneficiaryService,
    createCommunityServiceAreas
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        const modules = (session?.user?.modules as string[]) || [];
        if (!session?.user || !modules.includes('operator')) {
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
            voterId: serviceType === 'individual' ? voterId : undefined,
            notes,
        });

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

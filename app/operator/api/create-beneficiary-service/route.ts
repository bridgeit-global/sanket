import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
    createBeneficiaryService,
    createCommunityServiceAreas,
    getDailyProgrammeItemById,
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
            serviceAreas,
            programmeId,
        } = await request.json();

        if (programmeId != null && programmeId !== '') {
            const programme = await getDailyProgrammeItemById(String(programmeId));
            if (!programme) {
                return NextResponse.json({ error: 'Programme not found' }, { status: 400 });
            }
        }

        // Validate required fields
        if (!serviceType || !serviceName) {
            return NextResponse.json({
                error: 'Service type and service name are required'
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
            programmeId:
                programmeId != null && programmeId !== '' ? String(programmeId) : undefined,
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

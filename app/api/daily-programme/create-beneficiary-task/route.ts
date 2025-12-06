import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import {
  getDailyProgrammeItemById,
  createBeneficiaryService,
  createVoterTask,
  getVoterByEpicNumber,
} from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      programmeItemId,
      voterEpicNumber,
      voterName,
      programmeTitle,
      programmeDate,
    } = body;

    if (!programmeItemId || !voterEpicNumber) {
      return NextResponse.json(
        { error: 'programmeItemId and voterEpicNumber are required' },
        { status: 400 },
      );
    }

    // Verify the programme item exists
    const programmeItem = await getDailyProgrammeItemById(programmeItemId);
    if (!programmeItem) {
      return NextResponse.json(
        { error: 'Programme item not found' },
        { status: 404 },
      );
    }

    // Verify the voter exists
    const voters = await getVoterByEpicNumber(voterEpicNumber);
    if (!voters || voters.length === 0) {
      return NextResponse.json(
        { error: 'Voter not found with the provided EPIC number' },
        { status: 404 },
      );
    }
    const voter = voters[0];

    // Create beneficiary service for "Token of Gratitude"
    const service = await createBeneficiaryService({
      serviceType: 'individual',
      serviceName: 'Token of Gratitude',
      description: `Token of gratitude for not attending programme: ${programmeTitle}${programmeDate ? ` on ${programmeDate}` : ''}`,
      priority: 'medium',
      requestedBy: session.user.id,
      notes: `Created automatically from daily programme item: ${programmeItem.title}`,
    });

    // Create voter task linked to the service
    const task = await createVoterTask({
      serviceId: service.id,
      voterId: voterEpicNumber,
      taskType: 'Token of Gratitude',
      description: `Token of gratitude for not attending programme: ${programmeTitle}${programmeDate ? ` on ${programmeDate}` : ''}`,
      priority: 'medium',
      notes: `Programme: ${programmeItem.title} at ${programmeItem.location}`,
    });

    return NextResponse.json(
      {
        success: true,
        serviceId: service.id,
        taskId: task.id,
        token: service.token,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Error creating beneficiary task:', error);
    return NextResponse.json(
      { error: 'Failed to create beneficiary task' },
      { status: 500 },
    );
  }
}


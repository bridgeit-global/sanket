import { type NextRequest, NextResponse } from 'next/server';
import { createVisitorService, getVisitorById } from '@/lib/db/queries';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const visitor = await getVisitorById(id);
    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    const body = await request.json();
    const { serviceName, serviceNames, programmeId, description, notes } = body ?? {};

    const resolvedServiceNames = Array.from(
      new Set(
        [
          ...(Array.isArray(serviceNames) ? serviceNames : []),
          ...(typeof serviceName === 'string' ? [serviceName] : []),
        ]
          .map((s) => (typeof s === 'string' ? s.trim() : ''))
          .filter(Boolean),
      ),
    );

    if (resolvedServiceNames.length === 0) {
      return NextResponse.json({ error: 'At least one service is required' }, { status: 400 });
    }

    const programme =
      programmeId != null && programmeId !== '' ? String(programmeId) : null;
    const desc = typeof description === 'string' ? description : null;
    const noteText = typeof notes === 'string' ? notes : null;

    const services = [];
    const beneficiaryServices = [];
    for (const resolvedName of resolvedServiceNames) {
      const created = await createVisitorService({
        visitorId: visitor.id,
        serviceName: resolvedName,
        programmeId: programme,
        description: desc,
        notes: noteText,
        createdBy: session.user.id,
      });
      services.push(created.visitorService);
      beneficiaryServices.push(created.beneficiaryService);
    }

    return NextResponse.json({
      services,
      service: services[0] ?? null,
      beneficiaryServices,
      beneficiaryService: beneficiaryServices[0] ?? null,
    });
  } catch (error) {
    console.error('Error creating visitor service:', error);
    return NextResponse.json(
      { error: 'Failed to create visitor service' },
      { status: 500 },
    );
  }
}

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
    const { serviceName, programmeId, description, notes } = body ?? {};

    if (!serviceName || typeof serviceName !== 'string' || !serviceName.trim()) {
      return NextResponse.json({ error: 'Service is required' }, { status: 400 });
    }

    const service = await createVisitorService({
      visitorId: visitor.id,
      serviceName: serviceName.trim(),
      programmeId:
        programmeId != null && programmeId !== '' ? String(programmeId) : null,
      description: typeof description === 'string' ? description : null,
      notes: typeof notes === 'string' ? notes : null,
      createdBy: session.user.id,
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error creating visitor service:', error);
    return NextResponse.json(
      { error: 'Failed to create visitor service' },
      { status: 500 },
    );
  }
}

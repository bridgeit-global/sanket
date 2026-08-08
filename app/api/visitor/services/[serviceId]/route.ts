import { type NextRequest, NextResponse } from 'next/server';
import { updateVisitorServiceName } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId } = await params;
    const body = await request.json();
    const serviceName =
      typeof body?.serviceName === 'string' ? body.serviceName.trim() : '';

    if (!serviceName) {
      return NextResponse.json({ error: 'Service name is required' }, { status: 400 });
    }

    const result = await updateVisitorServiceName({
      visitorServiceId: serviceId,
      serviceName,
      performedBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating visitor service name:', error);
    if (error instanceof ChatSDKError) {
      const cause = typeof error.cause === 'string' ? error.cause : error.message;
      return NextResponse.json(
        { error: cause || 'Failed to update visitor service' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'Failed to update visitor service' },
      { status: 500 },
    );
  }
}

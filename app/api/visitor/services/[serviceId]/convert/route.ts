import { type NextRequest, NextResponse } from 'next/server';
import { convertVisitorServiceToBeneficiary } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { serviceId } = await params;
    const result = await convertVisitorServiceToBeneficiary({
      visitorServiceId: serviceId,
      requestedBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error converting visitor service:', error);
    if (error instanceof ChatSDKError) {
      const cause = typeof error.cause === 'string' ? error.cause : error.message;
      return NextResponse.json(
        { error: cause || 'Failed to convert visitor service' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'Failed to convert visitor service' },
      { status: 500 },
    );
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { tagBeneficiaryServiceToVoter } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('operator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = await params;
    const body = await request.json().catch(() => null);
    const voterId = typeof body?.voterId === 'string' ? body.voterId : '';
    if (!voterId.trim()) {
      return NextResponse.json({ error: 'Voter ID is required' }, { status: 400 });
    }

    const result = await tagBeneficiaryServiceToVoter({
      serviceId: taskId,
      voterId,
      performedBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error tagging task to voter:', error);
    if (error instanceof ChatSDKError) {
      const cause = typeof error.cause === 'string' ? error.cause : error.message;
      return NextResponse.json(
        { error: cause || 'Failed to tag task to voter' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json({ error: 'Failed to tag task to voter' }, { status: 500 });
  }
}

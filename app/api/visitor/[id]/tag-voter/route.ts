import { type NextRequest, NextResponse } from 'next/server';
import { tagVisitorToVoter } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
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
    const body = await request.json().catch(() => null);
    const voterId = typeof body?.voterId === 'string' ? body.voterId : '';
    if (!voterId.trim()) {
      return NextResponse.json({ error: 'Voter ID is required' }, { status: 400 });
    }

    const result = await tagVisitorToVoter({
      visitorId: id,
      voterId,
      performedBy: session.user.id,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error tagging visitor to voter:', error);
    if (error instanceof ChatSDKError) {
      const cause = typeof error.cause === 'string' ? error.cause : error.message;
      return NextResponse.json(
        { error: cause || 'Failed to tag visitor to voter' },
        { status: error.statusCode },
      );
    }
    return NextResponse.json(
      { error: 'Failed to tag visitor to voter' },
      { status: 500 },
    );
  }
}

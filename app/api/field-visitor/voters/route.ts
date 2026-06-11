import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getFieldVisitorVoters } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const boothNo = searchParams.get('boothNo');
    const electionId = searchParams.get('electionId');
    const profiledFilter = searchParams.get('profiled') as
      | 'true'
      | 'false'
      | null;

    if (!boothNo) {
      return NextResponse.json(
        { error: 'Booth number is required' },
        { status: 400 },
      );
    }

    const result = await getFieldVisitorVoters({
      userId: session.user.id,
      boothNo,
      electionId,
      profiledFilter,
    });

    if (!result.electionId) {
      return NextResponse.json({
        success: true,
        voters: [],
        message: 'No election found for this booth',
      });
    }

    return NextResponse.json({
      success: true,
      voters: result.voters,
      stats: result.stats,
      electionId: result.electionId,
      boothNo,
    });
  } catch (error) {
    if (error instanceof ChatSDKError && error.statusCode === 403) {
      return NextResponse.json({ error: error.cause ?? error.message }, { status: 403 });
    }
    console.error('Error getting voters:', error);
    return NextResponse.json(
      { error: 'Failed to get voters' },
      { status: 500 },
    );
  }
}

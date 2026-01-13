import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVoterVotingHistory } from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ epicNumber: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { epicNumber } = await params;
    const decodedEpicNumber = decodeURIComponent(epicNumber);

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    const history = await getVoterVotingHistory(
      decodedEpicNumber,
      electionId || undefined
    );

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error('Error getting voter voting history:', error);
    return NextResponse.json(
      { error: 'Failed to get voter voting history' },
      { status: 500 }
    );
  }
}

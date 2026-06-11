import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVotingParticipationParts } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 },
      );
    }

    const parts = await getVotingParticipationParts(electionId);

    return NextResponse.json({
      success: true,
      parts,
    });
  } catch (error) {
    console.error('Error getting part numbers:', error);
    return NextResponse.json(
      { error: 'Failed to get part numbers' },
      { status: 500 },
    );
  }
}

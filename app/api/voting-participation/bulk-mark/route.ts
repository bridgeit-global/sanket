import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { bulkMarkVoterVotes } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modules = (session?.user?.modules as string[]) || [];
    if (!modules.includes('voting-participation')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { votes } = body;

    if (!Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { error: 'Votes array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each vote
    for (const vote of votes) {
      if (!vote.epicNumber || typeof vote.epicNumber !== 'string') {
        return NextResponse.json(
          { error: 'Each vote must have a valid EPIC number' },
          { status: 400 }
        );
      }
      if (!vote.electionId || typeof vote.electionId !== 'string') {
        return NextResponse.json(
          { error: 'Each vote must have a valid election ID' },
          { status: 400 }
        );
      }
      if (typeof vote.hasVoted !== 'boolean') {
        return NextResponse.json(
          { error: 'Each vote must have a valid hasVoted boolean' },
          { status: 400 }
        );
      }
    }

    const results = await bulkMarkVoterVotes(votes);

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (error) {
    console.error('Error bulk marking voter votes:', error);
    return NextResponse.json(
      { error: 'Failed to bulk mark voter votes' },
      { status: 500 }
    );
  }
}

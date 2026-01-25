import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { markVoterVote } from '@/lib/db/queries';

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
    const { epicNumber, electionId, hasVoted } = body;

    if (!epicNumber || typeof epicNumber !== 'string') {
      return NextResponse.json(
        { error: 'EPIC number is required' },
        { status: 400 }
      );
    }

    if (!electionId || typeof electionId !== 'string') {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    if (typeof hasVoted !== 'boolean') {
      return NextResponse.json(
        { error: 'hasVoted must be a boolean' },
        { status: 400 }
      );
    }

    const electionMapping = await markVoterVote(
      epicNumber,
      electionId,
      hasVoted
    );

    return NextResponse.json({
      success: true,
      electionMapping,
    });
  } catch (error) {
    console.error('Error marking voter vote:', error);
    return NextResponse.json(
      { error: 'Failed to mark voter vote' },
      { status: 500 }
    );
  }
}

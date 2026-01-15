import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVotingPatterns } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const partNo = searchParams.get('partNo');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const patterns = await getVotingPatterns(electionId, {
      partNo: partNo || undefined,
    });

    return NextResponse.json({
      success: true,
      patterns,
    });
  } catch (error) {
    console.error('Error getting voting patterns:', error);
    return NextResponse.json(
      { error: 'Failed to get voting patterns' },
      { status: 500 }
    );
  }
}
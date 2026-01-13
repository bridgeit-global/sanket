import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getVotingStatistics } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');
    const acNo = searchParams.get('acNo');
    const wardNo = searchParams.get('wardNo');
    const partNo = searchParams.get('partNo');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const stats = await getVotingStatistics(electionId, {
      acNo: acNo || undefined,
      wardNo: wardNo || undefined,
      partNo: partNo || undefined,
    });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Error getting voting statistics:', error);
    return NextResponse.json(
      { error: 'Failed to get voting statistics' },
      { status: 500 }
    );
  }
}

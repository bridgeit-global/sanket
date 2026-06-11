import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getFieldVisitorAssignments } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    const result = await getFieldVisitorAssignments({
      userId: session.user.id,
      electionId,
    });

    if (!result.electionId) {
      return NextResponse.json({
        success: true,
        assignments: [],
        message: 'No elections found',
      });
    }

    return NextResponse.json({
      success: true,
      assignments: result.assignments,
      electionId: result.electionId,
    });
  } catch (error) {
    console.error('Error getting user assignments:', error);
    return NextResponse.json(
      { error: 'Failed to get assignments' },
      { status: 500 },
    );
  }
}

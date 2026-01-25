import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { userPartAssignment, BoothMaster, ElectionMaster } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// GET: Get user's assigned part numbers for the latest election
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get('electionId');

    // If no electionId provided, get the latest election
    let targetElectionId = electionId;
    if (!targetElectionId) {
      const [latestElection] = await db
        .select({ electionId: ElectionMaster.electionId })
        .from(ElectionMaster)
        .orderBy(desc(ElectionMaster.year))
        .limit(1);
      
      if (!latestElection) {
        return NextResponse.json({ 
          success: true, 
          assignments: [],
          message: 'No elections found'
        });
      }
      targetElectionId = latestElection.electionId;
    }

    // Get user's assigned parts with booth details
    const assignments = await db
      .select({
        id: userPartAssignment.id,
        boothNo: userPartAssignment.boothNo,
        electionId: userPartAssignment.electionId,
        boothName: BoothMaster.boothName,
        boothAddress: BoothMaster.boothAddress,
        createdAt: userPartAssignment.createdAt,
      })
      .from(userPartAssignment)
      .leftJoin(
        BoothMaster,
        and(
          eq(userPartAssignment.electionId, BoothMaster.electionId),
          eq(userPartAssignment.boothNo, BoothMaster.boothNo)
        )
      )
      .where(
        and(
          eq(userPartAssignment.userId, session.user.id),
          eq(userPartAssignment.electionId, targetElectionId)
        )
      );

    return NextResponse.json({
      success: true,
      assignments,
      electionId: targetElectionId,
    });
  } catch (error) {
    console.error('Error getting user assignments:', error);
    return NextResponse.json(
      { error: 'Failed to get assignments' },
      { status: 500 }
    );
  }
}

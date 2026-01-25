import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { userPartAssignment, user, BoothMaster, ElectionMaster } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hasModuleAccess } from '@/lib/db/queries';

// GET: Get user's part assignments (admin view)
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasModuleAccess(session.user.id, 'user-management');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const electionId = searchParams.get('electionId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get latest election if not provided
    let targetElectionId = electionId;
    if (!targetElectionId) {
      const [latestElection] = await db
        .select({ electionId: ElectionMaster.electionId })
        .from(ElectionMaster)
        .orderBy(desc(ElectionMaster.year))
        .limit(1);
      
      if (latestElection) {
        targetElectionId = latestElection.electionId;
      }
    }

    // Get user's assignments
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
        targetElectionId
          ? and(
              eq(userPartAssignment.userId, userId),
              eq(userPartAssignment.electionId, targetElectionId)
            )
          : eq(userPartAssignment.userId, userId)
      );

    // Get available booths for the election
    let availableBooths: Array<{ boothNo: string; boothName: string | null }> = [];
    if (targetElectionId) {
      availableBooths = await db
        .select({
          boothNo: BoothMaster.boothNo,
          boothName: BoothMaster.boothName,
        })
        .from(BoothMaster)
        .where(eq(BoothMaster.electionId, targetElectionId));
    }

    return NextResponse.json({
      success: true,
      assignments,
      availableBooths,
      electionId: targetElectionId,
    });
  } catch (error) {
    console.error('Error getting user part assignments:', error);
    return NextResponse.json(
      { error: 'Failed to get assignments' },
      { status: 500 }
    );
  }
}

// POST: Assign parts to user
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasModuleAccess(session.user.id, 'user-management');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, electionId, boothNos } = body;

    if (!userId || !electionId || !Array.isArray(boothNos)) {
      return NextResponse.json(
        { error: 'User ID, election ID, and booth numbers are required' },
        { status: 400 }
      );
    }

    // Verify user exists
    const [targetUser] = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete existing assignments for this user and election
    await db
      .delete(userPartAssignment)
      .where(
        and(
          eq(userPartAssignment.userId, userId),
          eq(userPartAssignment.electionId, electionId)
        )
      );

    // Insert new assignments
    if (boothNos.length > 0) {
      await db.insert(userPartAssignment).values(
        boothNos.map((boothNo: string) => ({
          userId,
          electionId,
          boothNo,
        }))
      );
    }

    return NextResponse.json({
      success: true,
      message: `Assigned ${boothNos.length} booth(s) to user`,
    });
  } catch (error) {
    console.error('Error assigning parts to user:', error);
    return NextResponse.json(
      { error: 'Failed to assign parts' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a specific assignment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasModuleAccess(session.user.id, 'user-management');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json(
        { error: 'Assignment ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(userPartAssignment)
      .where(eq(userPartAssignment.id, assignmentId));

    return NextResponse.json({
      success: true,
      message: 'Assignment removed',
    });
  } catch (error) {
    console.error('Error removing assignment:', error);
    return NextResponse.json(
      { error: 'Failed to remove assignment' },
      { status: 500 }
    );
  }
}

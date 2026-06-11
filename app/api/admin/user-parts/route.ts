import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  deleteUserPartAssignment,
  getAdminUserPartAssignments,
  getUserById,
  hasModuleAccess,
  replaceUserPartAssignments,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const { assignments, availableBooths, electionId: targetElectionId } =
      await getAdminUserPartAssignments({ userId, electionId });

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

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const targetUser = await getUserById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await replaceUserPartAssignments({ userId, electionId, boothNos });

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

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    await deleteUserPartAssignment(assignmentId);

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

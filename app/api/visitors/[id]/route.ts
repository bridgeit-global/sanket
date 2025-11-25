import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getVisitorById,
  updateVisitor,
  deleteVisitor,
  hasModuleAccess,
} from '@/lib/db/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'visitor-management',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const visitor = await getVisitorById(id);

    if (!visitor) {
      return NextResponse.json({ error: 'Visitor not found' }, { status: 404 });
    }

    return NextResponse.json(visitor);
  } catch (error) {
    console.error('Error fetching visitor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitor' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'visitor-management',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, contactNumber, purpose, programmeEventId, visitDate } = body;

    const visitor = await updateVisitor({
      id,
      name,
      contactNumber,
      purpose,
      programmeEventId,
      visitDate: visitDate ? new Date(visitDate) : undefined,
    });

    return NextResponse.json(visitor);
  } catch (error) {
    console.error('Error updating visitor:', error);
    return NextResponse.json(
      { error: 'Failed to update visitor' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'visitor-management',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteVisitor(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting visitor:', error);
    return NextResponse.json(
      { error: 'Failed to delete visitor' },
      { status: 500 },
    );
  }
}


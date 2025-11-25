import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getVisitors,
  createVisitor,
  hasModuleAccess,
} from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const programmeEventId = searchParams.get('programmeEventId') || undefined;

    const visitors = await getVisitors({
      startDate,
      endDate,
      programmeEventId,
    });

    return NextResponse.json(visitors);
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch visitors' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

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

    if (!name || !contactNumber || !purpose || !visitDate) {
      return NextResponse.json(
        { error: 'name, contactNumber, purpose, and visitDate are required' },
        { status: 400 },
      );
    }

    const visitor = await createVisitor({
      name,
      contactNumber,
      purpose,
      programmeEventId: programmeEventId || undefined,
      visitDate: new Date(visitDate),
      createdBy: session.user.id,
    });

    return NextResponse.json(visitor, { status: 201 });
  } catch (error) {
    console.error('Error creating visitor:', error);
    return NextResponse.json(
      { error: 'Failed to create visitor' },
      { status: 500 },
    );
  }
}


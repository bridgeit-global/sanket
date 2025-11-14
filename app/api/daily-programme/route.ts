import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getDailyProgrammeItems,
  createDailyProgrammeItem,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check module access
    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(startDateParam) : undefined;
    const endDate = endDateParam ? new Date(endDateParam) : undefined;

    const items = await getDailyProgrammeItems({
      startDate,
      endDate,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching daily programme items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily programme items' },
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
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { date, startTime, endTime, title, location, remarks } = body;

    if (!date || !startTime || !title || !location) {
      return NextResponse.json(
        { error: 'date, startTime, title, and location are required' },
        { status: 400 },
      );
    }

    const item = await createDailyProgrammeItem({
      date: new Date(date),
      startTime,
      endTime,
      title,
      location,
      remarks,
      createdBy: session.user.id,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating daily programme item:', error);
    return NextResponse.json(
      { error: 'Failed to create daily programme item' },
      { status: 500 },
    );
  }
}


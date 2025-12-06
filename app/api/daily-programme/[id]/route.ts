import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getDailyProgrammeItemById,
  updateDailyProgrammeItem,
  deleteDailyProgrammeItem,
} from '@/lib/db/queries';
import { hasModuleAccess } from '@/lib/db/queries';

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

    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const item = await getDailyProgrammeItemById(id);
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching daily programme item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily programme item' },
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

    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.date) updateData.date = new Date(body.date);
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.endTime !== undefined) updateData.endTime = body.endTime;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.remarks !== undefined) updateData.remarks = body.remarks;
    if (body.attended !== undefined) updateData.attended = body.attended;

    const updated = await updateDailyProgrammeItem(id, updateData);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating daily programme item:', error);
    return NextResponse.json(
      { error: 'Failed to update daily programme item' },
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

    const hasAccess = await hasModuleAccess(
      session.user.id,
      'daily-programme',
    );
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteDailyProgrammeItem(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting daily programme item:', error);
    return NextResponse.json(
      { error: 'Failed to delete daily programme item' },
      { status: 500 },
    );
  }
}


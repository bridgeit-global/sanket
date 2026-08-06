import { type NextRequest, NextResponse } from 'next/server';
import { getDailyProgrammeItems } from '@/lib/db/queries';
import { getTodayDateStringIST } from '@/lib/ist-date';
import { requireVisitorSession } from '@/lib/visitor/auth';

export async function GET(_request: NextRequest) {
  try {
    const session = await requireVisitorSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = getTodayDateStringIST();
    const items = await getDailyProgrammeItems({
      startDate: today,
      endDate: today,
      limit: 200,
    });

    const body = items.map((row) => ({
      id: row.id,
      startTime: row.startTime,
      endTime: row.endTime,
      title: row.title,
      location: row.location,
      programmeType: row.programmeType,
      date: row.date,
    }));

    return NextResponse.json(body);
  } catch (error) {
    console.error('Error fetching today programmes for visitor:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today programmes' },
      { status: 500 },
    );
  }
}

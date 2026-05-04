import { format, startOfToday } from 'date-fns';
import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getDailyProgrammeItems } from '@/lib/db/queries';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    const modules = (session?.user?.modules as string[]) || [];
    if (!session?.user || !modules.includes('operator')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = format(startOfToday(), 'yyyy-MM-dd');
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
    console.error('Error fetching today programmes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today programmes' },
      { status: 500 },
    );
  }
}

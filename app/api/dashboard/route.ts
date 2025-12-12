import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db, getPhoneUpdateStats } from '@/lib/db/queries';
import { dailyProgramme, registerEntry, mlaProject } from '@/lib/db/schema';
import { eq, and, gte, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calculate date range for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Run all queries in parallel
    const [
      programmeItems,
      inwardCount,
      outwardCount,
      projectsCount,
      phoneUpdateStats,
    ] = await Promise.all([
      // Today's programme items
      db
        .select()
        .from(dailyProgramme)
        .where(eq(dailyProgramme.date, todayStr))
        .orderBy(dailyProgramme.startTime)
        .limit(5),

      // Today's inward count
      db
        .select({ count: count() })
        .from(registerEntry)
        .where(
          and(
            eq(registerEntry.type, 'inward'),
            gte(registerEntry.date, todayStr)
          )
        ),

      // Today's outward count
      db
        .select({ count: count() })
        .from(registerEntry)
        .where(
          and(
            eq(registerEntry.type, 'outward'),
            gte(registerEntry.date, todayStr)
          )
        ),

      // Total active projects
      db
        .select({ count: count() })
        .from(mlaProject)
        .where(eq(mlaProject.status, 'In Progress')),

      // Phone update statistics
      getPhoneUpdateStats(),
    ]);

    return NextResponse.json({
      stats: {
        meetings: programmeItems.length,
        inward: inwardCount[0]?.count || 0,
        outward: outwardCount[0]?.count || 0,
        projects: projectsCount[0]?.count || 0,
        phoneUpdates: phoneUpdateStats.phoneUpdatesToday,
      },
      phoneUpdates: {
        today: phoneUpdateStats.phoneUpdatesToday,
        bySource: phoneUpdateStats.phoneUpdatesBySource,
        byUser: phoneUpdateStats.phoneUpdatesByUser,
        recent: phoneUpdateStats.recentPhoneUpdates,
      },
      upcoming: programmeItems.slice(0, 3).map((item) => ({
        id: item.id,
        date: item.date,
        startTime: item.startTime,
        title: item.title,
        location: item.location,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 },
    );
  }
}


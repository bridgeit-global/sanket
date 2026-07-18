import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import {
  getDashboardCounts,
  getPhoneUpdateStats,
  getBeneficiaryServiceStats,
} from '@/lib/db/queries';
import { getTodayDateStringIST } from '@/lib/ist-date';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const todayStr = getTodayDateStringIST();

    const [
      dashboardCounts,
      phoneUpdateStats,
      beneficiaryServiceStats,
    ] = await Promise.all([
      getDashboardCounts(todayStr),
      getPhoneUpdateStats(),
      getBeneficiaryServiceStats(),
    ]);

    const { programmeItems, programmeCount, inwardCount, outwardCount, projectsCount } =
      dashboardCounts;

    return NextResponse.json({
      stats: {
        meetings: programmeCount,
        inward: inwardCount,
        outward: outwardCount,
        projects: projectsCount,
        phoneUpdates: phoneUpdateStats.phoneUpdatesToday,
      },
      phoneUpdates: {
        today: phoneUpdateStats.phoneUpdatesToday,
        totalVotersWithPhone: phoneUpdateStats.totalVotersWithPhone,
        bySource: phoneUpdateStats.phoneUpdatesBySource,
        byUser: phoneUpdateStats.phoneUpdatesByUser,
        recent: phoneUpdateStats.recentPhoneUpdates,
      },
      beneficiaryServices: {
        servicesCreatedToday: beneficiaryServiceStats.servicesCreatedToday,
        totalServices: beneficiaryServiceStats.totalServices,
        byStatus: beneficiaryServiceStats.byStatus,
        byType: beneficiaryServiceStats.byType,
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

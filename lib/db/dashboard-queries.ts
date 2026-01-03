import 'server-only';

import { db, getPhoneUpdateStats, getBeneficiaryServiceStats } from './queries';
import { dailyProgramme, registerEntry, mlaProject } from './schema';
import { eq, and, gte, count } from 'drizzle-orm';

export interface DashboardData {
  stats: {
    meetings: number;
    inward: number;
    outward: number;
    projects: number;
    phoneUpdates: number;
  };
  phoneUpdates: {
    today: number;
    totalVotersWithPhone: number;
    bySource: Record<string, number>;
    byUser: Array<{ userId: string | null; count: number }>;
    recent: Array<{
      id: string;
      epicNumber: string;
      voterFullName: string | null;
      oldMobileNoPrimary: string | null;
      newMobileNoPrimary: string | null;
      oldMobileNoSecondary: string | null;
      newMobileNoSecondary: string | null;
      sourceModule: string;
      createdAt: Date | string;
      updatedBy: string | null;
    }>;
  };
  beneficiaryServices: {
    servicesCreatedToday: number;
    totalServices: number;
    byStatus: {
      pending: number;
      in_progress: number;
      completed: number;
      cancelled: number;
    };
    byType: {
      individual: number;
      community: number;
    };
  };
  upcoming: Array<{
    id: string;
    date: string;
    startTime: string;
    title: string;
    location: string;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
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
    beneficiaryServiceStats,
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

    // Beneficiary service statistics
    getBeneficiaryServiceStats(),
  ]);

  return {
    stats: {
      meetings: programmeItems.length,
      inward: inwardCount[0]?.count || 0,
      outward: outwardCount[0]?.count || 0,
      projects: projectsCount[0]?.count || 0,
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
      byStatus: {
        pending: beneficiaryServiceStats.byStatus.pending || 0,
        in_progress: beneficiaryServiceStats.byStatus.in_progress || 0,
        completed: beneficiaryServiceStats.byStatus.completed || 0,
        cancelled: beneficiaryServiceStats.byStatus.cancelled || 0,
      },
      byType: {
        individual: beneficiaryServiceStats.byType.individual || 0,
        community: beneficiaryServiceStats.byType.community || 0,
      },
    },
    upcoming: programmeItems.slice(0, 3).map((item) => ({
      id: item.id,
      date: item.date,
      startTime: item.startTime,
      title: item.title,
      location: item.location,
    })),
  };
}


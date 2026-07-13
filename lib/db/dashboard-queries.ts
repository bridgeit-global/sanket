import 'server-only';

import { getPhoneUpdateStats, getBeneficiaryServiceStats, getDashboardCounts, getSirActivityStats } from './queries';
import type { SirActivityStats } from './sir-queries';

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
  sirActivity: SirActivityStats;
  upcoming: Array<{
    id: string;
    date: string;
    startTime: string;
    title: string;
    location: string;
  }>;
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [
    dashboardCounts,
    phoneUpdateStats,
    beneficiaryServiceStats,
    sirActivity,
  ] = await Promise.all([
    getDashboardCounts(todayStr),
    getPhoneUpdateStats(),
    getBeneficiaryServiceStats(),
    getSirActivityStats(),
  ]);

  return {
    stats: {
      meetings: dashboardCounts.programmeItems.length,
      inward: dashboardCounts.inwardCount,
      outward: dashboardCounts.outwardCount,
      projects: dashboardCounts.projectsCount,
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
    sirActivity,
    upcoming: dashboardCounts.programmeItems.slice(0, 3).map((item) => ({
      id: item.id,
      date: item.date,
      startTime: item.startTime,
      title: item.title,
      location: item.location,
    })),
  };
}

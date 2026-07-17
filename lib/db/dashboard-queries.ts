import 'server-only';

import { format, differenceInCalendarDays, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import {
  isValidIndianMobile,
  normalizeIndianMobileDigits,
} from '@/lib/indian-mobile';
import { TABLES } from './schema';
import { getPhoneUpdateStats, getBeneficiaryServiceStats, getDashboardCounts, getSirActivityStats } from './queries';
import type { SirActivityStats } from './sir-queries';

const BIRTHDAY_WINDOW_DAYS = 7;
const BIRTHDAY_LIST_LIMIT = 15;
const EPIC_FETCH_CHUNK = 100;

export type UpcomingCadreBirthday = {
  memberId: string;
  personName: string;
  personPhone: string | null;
  /** Unique valid Indian mobiles (WhatsApp, person phone, linked voter mobiles). */
  phones: string[];
  epicNumber: string;
  dob: string;
  nextBirthday: string;
  daysUntil: number;
  turningAge: number | null;
  primaryPostLabel: string | null;
};

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
  upcomingBirthdays: UpcomingCadreBirthday[];
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) {
    chunks.push(ids.slice(index, index + size));
  }
  return chunks;
}

/** Parse DOB into month/day (1-based). Supports YYYY-MM-DD and DD-MM-YYYY. */
export function parseDobParts(
  dob: string,
): { month: number; day: number; year: number | null } | null {
  const trimmed = dob.trim();
  if (!trimmed) return null;

  const ymd = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) {
    const year = Number(ymd[1]);
    const month = Number(ymd[2]);
    const day = Number(ymd[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { month, day, year };
  }

  const dmy = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { month, day, year };
  }

  return null;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function birthdayDateInYear(year: number, month: number, day: number): Date {
  let safeDay = day;
  if (month === 2 && day === 29 && !isLeapYear(year)) {
    safeDay = 28;
  }
  return startOfDay(new Date(year, month - 1, safeDay));
}

function nextBirthdayOccurrence(
  month: number,
  day: number,
  from: Date,
): { date: Date; daysUntil: number } {
  const today = startOfDay(from);
  const thisYear = birthdayDateInYear(today.getFullYear(), month, day);
  const next =
    thisYear.getTime() >= today.getTime()
      ? thisYear
      : birthdayDateInYear(today.getFullYear() + 1, month, day);
  return {
    date: next,
    daysUntil: differenceInCalendarDays(next, today),
  };
}

export async function getUpcomingCadreBirthdays(
  daysAhead: number = BIRTHDAY_WINDOW_DAYS,
  limit: number = BIRTHDAY_LIST_LIMIT,
): Promise<UpcomingCadreBirthday[]> {
  const membersRes = await supabase
    .from(TABLES.cadreMember)
    .select('id, person_name, person_phone, epic_number')
    .eq('is_active', true)
    .not('epic_number', 'is', null);

  throwOnSupabaseError(membersRes.error, 'Failed to load cadre members for birthdays');

  const members = (membersRes.data ?? []).filter(
    (row) => row.epic_number != null && String(row.epic_number).trim() !== '',
  );

  if (members.length === 0) return [];

  const epicNumbers = [
    ...new Set(members.map((row) => String(row.epic_number).trim())),
  ];

  const voterByEpic = new Map<string, { fullName: string; dob: string }>();
  for (const chunk of chunkIds(epicNumbers, EPIC_FETCH_CHUNK)) {
    const votersRes = await supabase
      .from(TABLES.voterMaster)
      .select('epic_number, full_name, dob')
      .in('epic_number', chunk)
      .not('dob', 'is', null);

    throwOnSupabaseError(votersRes.error, 'Failed to load voter DOBs for birthdays');

    for (const row of votersRes.data ?? []) {
      const dob = row.dob != null ? String(row.dob).trim() : '';
      if (!dob) continue;
      voterByEpic.set(String(row.epic_number), {
        fullName: String(row.full_name ?? ''),
        dob,
      });
    }
  }

  const membersWithDob = members.filter((row) =>
    voterByEpic.has(String(row.epic_number).trim()),
  );
  if (membersWithDob.length === 0) return [];

  const memberIds = membersWithDob.map((row) => String(row.id));
  const primaryPostLabelByMember = new Map<string, string>();

  const firstPostByMember = new Map<
    string,
    { positionId: string; label: string | null }
  >();
  for (const chunk of chunkIds(memberIds, EPIC_FETCH_CHUNK)) {
    const postsRes = await supabase
      .from(TABLES.cadreMemberPost)
      .select('member_id, position_id, label, is_primary, sort_order')
      .in('member_id', chunk)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true });

    throwOnSupabaseError(postsRes.error, 'Failed to load cadre posts for birthdays');

    for (const row of postsRes.data ?? []) {
      const memberId = String(row.member_id);
      if (firstPostByMember.has(memberId)) continue;
      firstPostByMember.set(memberId, {
        positionId: String(row.position_id),
        label: row.label != null ? String(row.label) : null,
      });
    }
  }

  const positionIds = [
    ...new Set(
      [...firstPostByMember.values()].map((post) => post.positionId),
    ),
  ];

  const positionNameById = new Map<string, string>();
  if (positionIds.length > 0) {
    for (const chunk of chunkIds(positionIds, EPIC_FETCH_CHUNK)) {
      const positionsRes = await supabase
        .from(TABLES.cadrePosition)
        .select('id, name')
        .in('id', chunk);
      throwOnSupabaseError(positionsRes.error, 'Failed to load positions for birthdays');
      for (const row of positionsRes.data ?? []) {
        positionNameById.set(String(row.id), String(row.name));
      }
    }
  }

  for (const [memberId, post] of firstPostByMember) {
    const positionName = positionNameById.get(post.positionId) ?? null;
    const label = post.label?.trim() || positionName;
    if (label) primaryPostLabelByMember.set(memberId, label);
  }

  const whatsappByMember = new Map<string, string>();
  for (const chunk of chunkIds(memberIds, EPIC_FETCH_CHUNK)) {
    const whatsappRes = await supabase
      .from(TABLES.cadreMemberWhatsApp)
      .select('member_id, whatsapp_phone')
      .in('member_id', chunk);
    throwOnSupabaseError(whatsappRes.error, 'Failed to load WhatsApp numbers for birthdays');
    for (const row of whatsappRes.data ?? []) {
      const phone = row.whatsapp_phone != null ? String(row.whatsapp_phone).trim() : '';
      if (!phone) continue;
      whatsappByMember.set(String(row.member_id), phone);
    }
  }

  const voterMobilesByEpic = new Map<string, string[]>();
  const epicsWithDob = [
    ...new Set(membersWithDob.map((row) => String(row.epic_number).trim())),
  ];
  for (const chunk of chunkIds(epicsWithDob, EPIC_FETCH_CHUNK)) {
    const mobilesRes = await supabase
      .from(TABLES.voterMobileNumber)
      .select('epic_number, mobile_number, sort_order')
      .in('epic_number', chunk)
      .order('sort_order', { ascending: true });
    throwOnSupabaseError(mobilesRes.error, 'Failed to load voter mobiles for birthdays');
    for (const row of mobilesRes.data ?? []) {
      const epic = String(row.epic_number);
      const mobile = row.mobile_number != null ? String(row.mobile_number).trim() : '';
      if (!mobile) continue;
      const list = voterMobilesByEpic.get(epic) ?? [];
      list.push(mobile);
      voterMobilesByEpic.set(epic, list);
    }
  }

  const today = new Date();
  const results: UpcomingCadreBirthday[] = [];

  for (const row of membersWithDob) {
    const epicNumber = String(row.epic_number).trim();
    const voter = voterByEpic.get(epicNumber);
    if (!voter) continue;

    const parts = parseDobParts(voter.dob);
    if (!parts) continue;

    const { date: nextDate, daysUntil } = nextBirthdayOccurrence(
      parts.month,
      parts.day,
      today,
    );
    if (daysUntil < 0 || daysUntil > daysAhead) continue;

    const turningAge =
      parts.year != null && parts.year > 1900
        ? nextDate.getFullYear() - parts.year
        : null;

    const personName =
      (row.person_name != null && String(row.person_name).trim()) ||
      voter.fullName ||
      epicNumber;

    const personPhone =
      row.person_phone != null ? String(row.person_phone).trim() || null : null;
    const memberId = String(row.id);
    const phoneCandidates = [
      whatsappByMember.get(memberId) ?? null,
      personPhone,
      ...(voterMobilesByEpic.get(epicNumber) ?? []),
    ];
    const phones: string[] = [];
    const seen = new Set<string>();
    for (const candidate of phoneCandidates) {
      if (!candidate) continue;
      if (!isValidIndianMobile(candidate)) continue;
      const digits = normalizeIndianMobileDigits(candidate);
      if (seen.has(digits)) continue;
      seen.add(digits);
      phones.push(digits);
    }

    results.push({
      memberId,
      personName,
      personPhone,
      phones,
      epicNumber,
      dob: voter.dob,
      nextBirthday: format(nextDate, 'yyyy-MM-dd'),
      daysUntil,
      turningAge:
        turningAge != null && turningAge > 0 && turningAge <= 150
          ? turningAge
          : null,
      primaryPostLabel: primaryPostLabelByMember.get(memberId) ?? null,
    });
  }

  results.sort((a, b) => {
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.personName.localeCompare(b.personName);
  });

  return results.slice(0, limit);
}

export async function getDashboardData(): Promise<DashboardData> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const [
    dashboardCounts,
    phoneUpdateStats,
    beneficiaryServiceStats,
    sirActivity,
    upcomingBirthdays,
  ] = await Promise.all([
    getDashboardCounts(todayStr),
    getPhoneUpdateStats(),
    getBeneficiaryServiceStats(),
    getSirActivityStats(),
    getUpcomingCadreBirthdays(),
  ]);

  return {
    stats: {
      meetings: dashboardCounts.programmeCount,
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
    upcomingBirthdays,
  };
}

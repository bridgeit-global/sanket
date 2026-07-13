import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { ChatSDKError } from '../errors';
import { TABLES } from './schema';
import { SIR_ELECTION_ID } from '@/lib/sir/constants';
import type { SirActivityAction } from './schema';

export type SirPartAndSerial = {
  partNo: string | null;
  srNo: string | null;
};

/**
 * Resolve Part Number (booth_no) and Part Serial Number (sr_no) for a voter from
 * the SIR election's ElectionMapping row. Uses the Supabase client only.
 */
export async function getSirPartAndSerial(
  epicNumber: string,
  electionId: string = SIR_ELECTION_ID,
): Promise<SirPartAndSerial> {
  try {
    const { data, error } = await supabase
      .from(TABLES.electionMapping)
      .select('booth_no, sr_no')
      .eq('epic_number', epicNumber)
      .eq('election_id', electionId)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to get SIR part and serial');
    return {
      partNo: data?.booth_no != null ? String(data.booth_no) : null,
      srNo: data?.sr_no != null ? String(data.sr_no) : null,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get SIR part and serial',
    );
  }
}

/** Record a SIR activity (search / download / share) for a voter by a user. */
export async function logSirActivity(
  action: SirActivityAction,
  epicNumber: string,
  performedBy: string,
): Promise<void> {
  try {
    const { error } = await supabase.from(TABLES.sirActivityLog).insert({
      epic_number: epicNumber,
      action,
      performed_by: performedBy,
    });
    throwOnSupabaseError(error, 'Failed to log SIR activity');
  } catch (error) {
    // Activity logging must never break the primary flow.
    console.error('Error logging SIR activity:', error);
  }
}

export type SirActivityUserStat = {
  userId: string;
  searchedToday: number;
  searchedWeek: number;
  downloadedToday: number;
  downloadedWeek: number;
};

export type SirActivityStats = {
  searchedToday: number;
  searchedWeek: number;
  downloadedToday: number;
  downloadedWeek: number;
  byUser: SirActivityUserStat[];
};

type SirActivityRow = {
  epic_number: string;
  action: SirActivityAction;
  performed_by: string;
  created_at: string;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Monday 00:00 of the current week. */
function startOfWeek(): Date {
  const d = startOfToday();
  const day = d.getDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  return d;
}

/**
 * Per-user SIR activity, counting DISTINCT voter ids (epic_number) so repeated
 * searches/downloads of the same voter count once. Split into search vs
 * download (download + share) for today and this week. Supabase client only.
 */
export async function getSirActivityStats(): Promise<SirActivityStats> {
  try {
    const weekStart = startOfWeek();
    const todayStart = startOfToday();

    const { data, error } = await supabase
      .from(TABLES.sirActivityLog)
      .select('epic_number, action, performed_by, created_at')
      .gte('created_at', weekStart.toISOString());
    throwOnSupabaseError(error, 'Failed to get SIR activity stats');

    const rows = (data ?? []) as SirActivityRow[];

    // Map performed_by (User.id) -> human-readable user_id for display.
    const userIds = Array.from(new Set(rows.map((r) => r.performed_by)));
    const userIdMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from(TABLES.user)
        .select('id, user_id')
        .in('id', userIds);
      throwOnSupabaseError(usersError, 'Failed to resolve SIR activity users');
      for (const u of users ?? []) {
        userIdMap.set(String(u.id), String(u.user_id));
      }
    }

    type Sets = {
      searchedToday: Set<string>;
      searchedWeek: Set<string>;
      downloadedToday: Set<string>;
      downloadedWeek: Set<string>;
    };
    const makeSets = (): Sets => ({
      searchedToday: new Set(),
      searchedWeek: new Set(),
      downloadedToday: new Set(),
      downloadedWeek: new Set(),
    });

    const perUser = new Map<string, Sets>();
    const overall = makeSets();

    for (const row of rows) {
      const createdAt = new Date(row.created_at);
      const isToday = createdAt >= todayStart;
      const isDownload = row.action === 'download' || row.action === 'share';
      const isSearch = row.action === 'search';
      const epic = row.epic_number;

      let sets = perUser.get(row.performed_by);
      if (!sets) {
        sets = makeSets();
        perUser.set(row.performed_by, sets);
      }

      if (isSearch) {
        sets.searchedWeek.add(epic);
        overall.searchedWeek.add(epic);
        if (isToday) {
          sets.searchedToday.add(epic);
          overall.searchedToday.add(epic);
        }
      }
      if (isDownload) {
        sets.downloadedWeek.add(epic);
        overall.downloadedWeek.add(epic);
        if (isToday) {
          sets.downloadedToday.add(epic);
          overall.downloadedToday.add(epic);
        }
      }
    }

    const byUser: SirActivityUserStat[] = Array.from(perUser.entries())
      .map(([performedBy, sets]) => ({
        userId: userIdMap.get(performedBy) ?? 'Unknown',
        searchedToday: sets.searchedToday.size,
        searchedWeek: sets.searchedWeek.size,
        downloadedToday: sets.downloadedToday.size,
        downloadedWeek: sets.downloadedWeek.size,
      }))
      .sort((a, b) => b.downloadedWeek - a.downloadedWeek);

    return {
      searchedToday: overall.searchedToday.size,
      searchedWeek: overall.searchedWeek.size,
      downloadedToday: overall.downloadedToday.size,
      downloadedWeek: overall.downloadedWeek.size,
      byUser,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get SIR activity stats',
    );
  }
}

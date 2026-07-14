import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { ChatSDKError } from '../errors';
import { TABLES } from './schema';
import { SIR_ELECTION_ID, wardNoFromElectionId } from '@/lib/sir/constants';
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

export type SirActivityBucket = {
  count: number;
  /** Distinct voter IDs (EPIC numbers) in this bucket, sorted. */
  voterIds: string[];
};

export type SirActivityGroupStat = {
  /** Display key: user id, ward no, or part no. */
  label: string;
  searchedToday: SirActivityBucket;
  searchedWeek: SirActivityBucket;
  downloadedToday: SirActivityBucket;
  downloadedWeek: SirActivityBucket;
};

/** @deprecated Prefer SirActivityGroupStat; kept for existing callers. */
export type SirActivityUserStat = SirActivityGroupStat & {
  userId: string;
};

export type SirActivityStats = {
  searchedToday: SirActivityBucket;
  searchedWeek: SirActivityBucket;
  downloadedToday: SirActivityBucket;
  downloadedWeek: SirActivityBucket;
  byUser: SirActivityUserStat[];
  byWard: SirActivityGroupStat[];
  byPart: SirActivityGroupStat[];
};

type SirActivityRow = {
  epic_number: string;
  action: SirActivityAction;
  performed_by: string;
  created_at: string;
};

type ElectionMappingLookupRow = {
  epic_number: string;
  election_id: string;
  booth_no: string | null;
};

type VoterGeo = {
  wardNo: string;
  partNo: string;
};

type VoterGeoResolved = VoterGeo & {
  wardYear: number;
};

const UNKNOWN_GEO = '—';

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

type ActivitySets = {
  searchedToday: Set<string>;
  searchedWeek: Set<string>;
  downloadedToday: Set<string>;
  downloadedWeek: Set<string>;
};

const makeSets = (): ActivitySets => ({
  searchedToday: new Set(),
  searchedWeek: new Set(),
  downloadedToday: new Set(),
  downloadedWeek: new Set(),
});

const toBucket = (ids: Set<string>): SirActivityBucket => ({
  count: ids.size,
  voterIds: Array.from(ids).sort((a, b) => a.localeCompare(b)),
});

function addToSets(
  sets: ActivitySets,
  epic: string,
  isSearch: boolean,
  isDownload: boolean,
  isToday: boolean,
): void {
  if (isSearch) {
    sets.searchedWeek.add(epic);
    if (isToday) sets.searchedToday.add(epic);
  }
  if (isDownload) {
    sets.downloadedWeek.add(epic);
    if (isToday) sets.downloadedToday.add(epic);
  }
}

function setsToGroupStat(
  label: string,
  sets: ActivitySets,
): SirActivityGroupStat {
  return {
    label,
    searchedToday: toBucket(sets.searchedToday),
    searchedWeek: toBucket(sets.searchedWeek),
    downloadedToday: toBucket(sets.downloadedToday),
    downloadedWeek: toBucket(sets.downloadedWeek),
  };
}

function sortGroups(groups: SirActivityGroupStat[]): SirActivityGroupStat[] {
  return groups.sort((a, b) => {
    const byDownloads = b.downloadedWeek.count - a.downloadedWeek.count;
    if (byDownloads !== 0) return byDownloads;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });
}

/**
 * Resolve ward (BMC election_id leading digits) and part (SIR election booth_no)
 * for a batch of voter EPICs via ElectionMapping.
 */
async function resolveVoterGeo(
  epicNumbers: string[],
): Promise<Map<string, VoterGeo>> {
  const geoByEpic = new Map<string, VoterGeoResolved>();
  if (epicNumbers.length === 0) return geoByEpic;

  for (const epic of epicNumbers) {
    geoByEpic.set(epic, {
      wardNo: UNKNOWN_GEO,
      partNo: UNKNOWN_GEO,
      wardYear: -1,
    });
  }

  // Supabase `.in()` stays reliable in moderate batches.
  const CHUNK = 200;
  for (let i = 0; i < epicNumbers.length; i += CHUNK) {
    const chunk = epicNumbers.slice(i, i + CHUNK);
    const { data, error } = await supabase
      .from(TABLES.electionMapping)
      .select('epic_number, election_id, booth_no')
      .in('epic_number', chunk);
    throwOnSupabaseError(error, 'Failed to resolve SIR activity geography');

    const rows = (data ?? []) as ElectionMappingLookupRow[];
    for (const row of rows) {
      const geo = geoByEpic.get(row.epic_number);
      if (!geo) continue;

      const ward = wardNoFromElectionId(row.election_id);
      if (ward) {
        const yearMatch = /(\d{4})\s*$/.exec(row.election_id);
        const year = yearMatch ? Number(yearMatch[1]) : 0;
        if (geo.wardNo === UNKNOWN_GEO || year >= geo.wardYear) {
          geo.wardNo = ward;
          geo.wardYear = year;
        }
      }

      if (
        row.election_id === SIR_ELECTION_ID &&
        row.booth_no != null &&
        String(row.booth_no).trim() !== ''
      ) {
        geo.partNo = String(row.booth_no);
      }
    }
  }

  return geoByEpic;
}

/**
 * Per-user / per-ward / per-part SIR activity, counting DISTINCT voter ids
 * (epic_number) so repeated searches/downloads of the same voter count once.
 * Ward comes from ElectionMapping BMC election ids (e.g. 140BMC2026 → 140).
 * Part comes from ElectionMapping booth_no for SIR_ELECTION_ID (172VS2024).
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

    const uniqueEpics = Array.from(new Set(rows.map((r) => r.epic_number)));
    const geoByEpic = await resolveVoterGeo(uniqueEpics);

    const perUser = new Map<string, ActivitySets>();
    const perWard = new Map<string, ActivitySets>();
    const perPart = new Map<string, ActivitySets>();
    const overall = makeSets();

    for (const row of rows) {
      const createdAt = new Date(row.created_at);
      const isToday = createdAt >= todayStart;
      const isDownload = row.action === 'download' || row.action === 'share';
      const isSearch = row.action === 'search';
      const epic = row.epic_number;
      const geo = geoByEpic.get(epic) ?? {
        wardNo: UNKNOWN_GEO,
        partNo: UNKNOWN_GEO,
      };

      let userSets = perUser.get(row.performed_by);
      if (!userSets) {
        userSets = makeSets();
        perUser.set(row.performed_by, userSets);
      }

      let wardSets = perWard.get(geo.wardNo);
      if (!wardSets) {
        wardSets = makeSets();
        perWard.set(geo.wardNo, wardSets);
      }

      let partSets = perPart.get(geo.partNo);
      if (!partSets) {
        partSets = makeSets();
        perPart.set(geo.partNo, partSets);
      }

      addToSets(userSets, epic, isSearch, isDownload, isToday);
      addToSets(wardSets, epic, isSearch, isDownload, isToday);
      addToSets(partSets, epic, isSearch, isDownload, isToday);
      addToSets(overall, epic, isSearch, isDownload, isToday);
    }

    const byUser: SirActivityUserStat[] = Array.from(perUser.entries())
      .map(([performedBy, sets]) => {
        const userId = userIdMap.get(performedBy) ?? 'Unknown';
        return { userId, ...setsToGroupStat(userId, sets) };
      })
      .sort((a, b) => b.downloadedWeek.count - a.downloadedWeek.count);

    const byWard = sortGroups(
      Array.from(perWard.entries()).map(([wardNo, sets]) =>
        setsToGroupStat(wardNo, sets),
      ),
    );

    const byPart = sortGroups(
      Array.from(perPart.entries()).map(([partNo, sets]) =>
        setsToGroupStat(partNo, sets),
      ),
    );

    return {
      searchedToday: toBucket(overall.searchedToday),
      searchedWeek: toBucket(overall.searchedWeek),
      downloadedToday: toBucket(overall.downloadedToday),
      downloadedWeek: toBucket(overall.downloadedWeek),
      byUser,
      byWard,
      byPart,
    };
  } catch (error) {
    if (error instanceof ChatSDKError) throw error;
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get SIR activity stats',
    );
  }
}

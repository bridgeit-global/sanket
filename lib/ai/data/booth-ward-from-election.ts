import 'server-only';

import { supabase } from '@/lib/supabase/server';
import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from '@/lib/db/schema';
import { SIR_ELECTION_ID, wardNoFromElectionId } from '@/lib/sir/constants';
import { getCadreConfig } from '@/lib/db/cadre-queries';
import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import { extractWardNumber } from '@/lib/hierarchy/member-list';
import { normalizePartNo } from '@/lib/ai/data/form20-172-2024';

const PAGE_SIZE = 1000;
const CONSTITUENCY_AC = '172';

export type BoothWardEntry = {
  boothNo: string;
  wardNo: string;
  voterCount: number;
  cadreWardNo: string | null;
  cadreMatch: boolean | null;
};

export type BoothWardMapResult = {
  mappingSource: 'ElectionMapping';
  partElectionId: string;
  boothToWard: Map<string, string>;
  entries: BoothWardEntry[];
  partsByWard: Map<string, string[]>;
  cadreMismatchCount: number;
  builtAt: string;
};

let cached: BoothWardMapResult | null = null;
let inflight: Promise<BoothWardMapResult> | null = null;

type MappingRow = {
  epic_number: string;
  election_id: string;
  booth_no: string | null;
};

async function fetchAllElectionMappingRows(
  filter: { electionId?: string; electionIds?: string[] },
): Promise<MappingRow[]> {
  const rows: MappingRow[] = [];
  let from = 0;

  for (;;) {
    let query = supabase
      .from(TABLES.electionMapping)
      .select('epic_number, election_id, booth_no')
      .range(from, from + PAGE_SIZE - 1);

    if (filter.electionId) {
      query = query.eq('election_id', filter.electionId);
    } else if (filter.electionIds && filter.electionIds.length > 0) {
      query = query.in('election_id', filter.electionIds);
    }

    const { data, error } = await query;
    throwOnSupabaseError(error, 'Failed to load ElectionMapping for booth→ward');

    const batch = (data ?? []) as MappingRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function listBmcElectionIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from(TABLES.electionMaster)
    .select('election_id');
  throwOnSupabaseError(error, 'Failed to list elections for BMC ward ids');

  const ids: string[] = [];
  for (const row of data ?? []) {
    const electionId = String(row.election_id);
    if (wardNoFromElectionId(electionId)) {
      ids.push(electionId);
    }
  }
  return ids;
}

function pickWardForEpic(
  bmcRows: Array<{ election_id: string }>,
): string | null {
  let bestWard: string | null = null;
  let bestYear = -1;
  for (const row of bmcRows) {
    const ward = wardNoFromElectionId(row.election_id);
    if (!ward) continue;
    const yearMatch = /(\d{4})\s*$/.exec(row.election_id);
    const year = yearMatch ? Number(yearMatch[1]) : 0;
    if (bestWard === null || year >= bestYear) {
      bestWard = ward;
      bestYear = year;
    }
  }
  return bestWard;
}

function modeWard(
  counts: Map<string, number>,
): { wardNo: string; voterCount: number } | null {
  let best: string | null = null;
  let bestCount = 0;
  let total = 0;
  for (const [ward, count] of counts) {
    total += count;
    if (count > bestCount) {
      best = ward;
      bestCount = count;
    }
  }
  if (!best) return null;
  return { wardNo: best, voterCount: total };
}

function buildCadreBoothToWard(
  geoUnits: Awaited<ReturnType<typeof getCadreConfig>>['geoUnits'],
): Map<string, string> {
  const cadreMap = new Map<string, string>();
  const wards = geoUnits.filter((g) => g.type === 'ward' && g.isActive);

  for (const ward of wards) {
    const wardNumber = extractWardNumber(ward.name);
    if (!Number.isFinite(wardNumber) || wardNumber === Number.MAX_SAFE_INTEGER) {
      continue;
    }
    const wardNo = String(wardNumber);
    const booths = getBoothGeoUnits(geoUnits, CONSTITUENCY_AC, ward.id);
    for (const booth of booths) {
      const boothNo = extractBoothNumber(booth.name);
      if (!boothNo) continue;
      cadreMap.set(normalizePartNo(boothNo), wardNo);
    }
  }
  return cadreMap;
}

async function buildBoothWardMap(): Promise<BoothWardMapResult> {
  const partElectionId = process.env.FORM20_PART_ELECTION_ID || SIR_ELECTION_ID;

  const bmcElectionIds = await listBmcElectionIds();
  const [partRows, bmcRows, cadreConfig] = await Promise.all([
    fetchAllElectionMappingRows({ electionId: partElectionId }),
    bmcElectionIds.length > 0
      ? fetchAllElectionMappingRows({ electionIds: bmcElectionIds })
      : Promise.resolve([] as MappingRow[]),
    getCadreConfig().catch((err) => {
      console.warn('Cadre config unavailable for booth→ward cross-check:', err);
      return null;
    }),
  ]);

  const wardByEpic = new Map<string, string>();
  const bmcByEpic = new Map<string, Array<{ election_id: string }>>();
  for (const row of bmcRows) {
    const list = bmcByEpic.get(row.epic_number) ?? [];
    list.push({ election_id: row.election_id });
    bmcByEpic.set(row.epic_number, list);
  }
  for (const [epic, rows] of bmcByEpic) {
    const ward = pickWardForEpic(rows);
    if (ward) wardByEpic.set(epic, ward);
  }

  /** booth → Map<ward, voterCount> */
  const boothWardCounts = new Map<string, Map<string, number>>();
  for (const row of partRows) {
    if (row.booth_no == null || String(row.booth_no).trim() === '') continue;
    const boothNo = normalizePartNo(row.booth_no);
    const ward = wardByEpic.get(row.epic_number);
    if (!ward) continue;
    let wardCounts = boothWardCounts.get(boothNo);
    if (!wardCounts) {
      wardCounts = new Map();
      boothWardCounts.set(boothNo, wardCounts);
    }
    wardCounts.set(ward, (wardCounts.get(ward) ?? 0) + 1);
  }

  const cadreBoothToWard = cadreConfig
    ? buildCadreBoothToWard(cadreConfig.geoUnits)
    : new Map<string, string>();

  const boothToWard = new Map<string, string>();
  const entries: BoothWardEntry[] = [];
  let cadreMismatchCount = 0;

  const boothKeys = Array.from(boothWardCounts.keys()).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );

  for (const boothNo of boothKeys) {
    const wardCounts = boothWardCounts.get(boothNo);
    if (!wardCounts) continue;
    const picked = modeWard(wardCounts);
    if (!picked) continue;
    boothToWard.set(boothNo, picked.wardNo);
    const cadreWardNo = cadreBoothToWard.get(boothNo) ?? null;
    const cadreMatch =
      cadreWardNo == null ? null : cadreWardNo === picked.wardNo;
    if (cadreMatch === false) cadreMismatchCount += 1;
    entries.push({
      boothNo,
      wardNo: picked.wardNo,
      voterCount: picked.voterCount,
      cadreWardNo,
      cadreMatch,
    });
  }

  // Include cadre-only booths that Form 20 may reference but ElectionMapping missed
  for (const [boothNo, cadreWard] of cadreBoothToWard) {
    if (!boothToWard.has(boothNo)) {
      boothToWard.set(boothNo, cadreWard);
      entries.push({
        boothNo,
        wardNo: cadreWard,
        voterCount: 0,
        cadreWardNo: cadreWard,
        cadreMatch: true,
      });
    }
  }

  entries.sort((a, b) =>
    a.boothNo.localeCompare(b.boothNo, undefined, { numeric: true }),
  );

  const partsByWard = new Map<string, string[]>();
  for (const entry of entries) {
    const list = partsByWard.get(entry.wardNo) ?? [];
    list.push(entry.boothNo);
    partsByWard.set(entry.wardNo, list);
  }
  for (const [, list] of partsByWard) {
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  if (cadreMismatchCount > 0) {
    console.warn(
      `booth→ward: ${cadreMismatchCount} booth(s) disagree between ElectionMapping and CadreGeographicUnit`,
    );
  }

  return {
    mappingSource: 'ElectionMapping',
    partElectionId,
    boothToWard,
    entries,
    partsByWard,
    cadreMismatchCount,
    builtAt: new Date().toISOString(),
  };
}

export async function getBoothWardMap(): Promise<BoothWardMapResult> {
  if (cached) return cached;
  if (!inflight) {
    inflight = buildBoothWardMap()
      .then((result) => {
        cached = result;
        inflight = null;
        return result;
      })
      .catch((err) => {
        inflight = null;
        throw err;
      });
  }
  return inflight;
}

export async function getBoothToWardMap(): Promise<Map<string, string>> {
  const result = await getBoothWardMap();
  return result.boothToWard;
}

export async function getPartsByWard(
  wardNo: string,
): Promise<string[]> {
  const result = await getBoothWardMap();
  const key = String(wardNo).trim().replace(/^0+(?=\d)/, '');
  return result.partsByWard.get(key) ?? [];
}

export async function getWardForPart(
  partNo: string | number,
): Promise<string | null> {
  const result = await getBoothWardMap();
  return result.boothToWard.get(normalizePartNo(partNo)) ?? null;
}

/** Test helper / cache bust for long-running servers after data imports. */
export function clearBoothWardMapCache(): void {
  cached = null;
  inflight = null;
}

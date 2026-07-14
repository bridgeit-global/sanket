import { extractBoothNumber } from './booth-geo-units';
import { extractWardNumber } from './member-list';
import type { CadreConfig } from './types';

export type HierarchyGeoNavigation =
  | { type: 'ward'; wardGeoId: string }
  | { type: 'booth'; wardGeoId: string; boothNo: string };

type WardOption = { id: string; name: string };

type BoothOption = { boothNo: string; wardGeoId: string };

function normalizeBoothNo(value: string): string {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? String(parsed) : value.trim();
}

function findWardByNumber(
  wards: WardOption[],
  wardNumber: number,
): WardOption | null {
  return (
    wards.find((ward) => extractWardNumber(ward.name) === wardNumber) ?? null
  );
}

function findBoothMatches(
  booths: BoothOption[],
  boothNo: string,
  preferredWardGeoId?: string,
): BoothOption[] {
  const normalized = normalizeBoothNo(boothNo);
  const matches = booths.filter(
    (booth) => normalizeBoothNo(booth.boothNo) === normalized,
  );
  if (!preferredWardGeoId) return matches;
  const inPreferred = matches.filter((booth) => booth.wardGeoId === preferredWardGeoId);
  return inPreferred.length > 0 ? inPreferred : matches;
}

function pickBoothNavigation(
  matches: BoothOption[],
): HierarchyGeoNavigation | null {
  if (matches.length !== 1) return null;
  return {
    type: 'booth',
    wardGeoId: matches[0].wardGeoId,
    boothNo: matches[0].boothNo,
  };
}

/** Build booth options from cadre geo units for search navigation. */
export function buildBoothSearchOptions(
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
): BoothOption[] {
  return geoUnits
    .filter(
      (unit) =>
        unit.type === 'booth' &&
        unit.isActive &&
        Boolean(unit.parentId) &&
        ((unit.acNo?.trim() ?? '') === constituencyId || !unit.acNo?.trim()),
    )
    .map((unit) => {
      const boothNo = extractBoothNumber(unit.name);
      if (!boothNo || !unit.parentId) return null;
      return { boothNo, wardGeoId: unit.parentId };
    })
    .filter((booth): booth is BoothOption => booth !== null);
}

/**
 * Resolve a search query to a ward or booth panel navigation target.
 *
 * Supported examples:
 * - "140" / "ward 140" → ward panel
 * - "booth 12" → booth panel (unique booth, or booth in current/explicit ward)
 * - "ward 140 booth 12" → booth 12 inside ward 140
 */
export function resolveHierarchyGeoNavigation(
  query: string,
  options: {
    wards: WardOption[];
    booths: BoothOption[];
    currentWardGeoId?: string;
  },
): HierarchyGeoNavigation | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const { wards, booths, currentWardGeoId } = options;
  const labeledWard = trimmed.match(/ward\s*(\d+)/i);
  const labeledBooth = trimmed.match(/booth\s*(\d+)/i);
  const bareNumber = trimmed.match(/^\d{1,4}$/);

  const labeledWardNumber = labeledWard
    ? Number.parseInt(labeledWard[1], 10)
    : null;
  const labeledBoothNo = labeledBooth ? labeledBooth[1] : null;

  // "ward 140 booth 12" (or booth-first) — navigate to that booth in that ward.
  if (
    labeledWardNumber != null &&
    Number.isFinite(labeledWardNumber) &&
    labeledBoothNo
  ) {
    const ward = findWardByNumber(wards, labeledWardNumber);
    if (!ward) return null;
    return pickBoothNavigation(
      findBoothMatches(booths, labeledBoothNo, ward.id).filter(
        (booth) => booth.wardGeoId === ward.id,
      ),
    );
  }

  // Explicit booth label.
  if (labeledBoothNo) {
    return pickBoothNavigation(
      findBoothMatches(booths, labeledBoothNo, currentWardGeoId),
    );
  }

  // Explicit ward label.
  if (labeledWardNumber != null && Number.isFinite(labeledWardNumber)) {
    const ward = findWardByNumber(wards, labeledWardNumber);
    return ward ? { type: 'ward', wardGeoId: ward.id } : null;
  }

  // Bare number: ward first, then booth in current ward, then unique booth.
  if (bareNumber) {
    const number = Number.parseInt(bareNumber[0], 10);
    if (!Number.isFinite(number)) return null;

    const ward = findWardByNumber(wards, number);
    if (ward) return { type: 'ward', wardGeoId: ward.id };

    const boothMatches = findBoothMatches(
      booths,
      String(number),
      currentWardGeoId,
    );
    if (currentWardGeoId) {
      const inCurrent = boothMatches.find(
        (booth) => booth.wardGeoId === currentWardGeoId,
      );
      if (inCurrent) {
        return {
          type: 'booth',
          wardGeoId: inCurrent.wardGeoId,
          boothNo: inCurrent.boothNo,
        };
      }
    }
    return pickBoothNavigation(boothMatches);
  }

  return null;
}

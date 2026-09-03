import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import type { CadreConfig } from '@/lib/hierarchy/types';

/** Same AC scope as hierarchy module screens. */
export const PROJECT_HIERARCHY_CONSTITUENCY_ID = '172';

/** Catalog name for the overall constituency ward option. */
export const OVERALL_PROJECT_WARD_NAME = '172 - Anushakti Nagar';

export function isOverallProjectWard(
  unit: { name?: string | null } | null | undefined,
): boolean {
  return (unit?.name?.trim() ?? '') === OVERALL_PROJECT_WARD_NAME;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim() ?? '';
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function normalizeProjectGeoSelection(input: {
  wardGeoIds?: string[] | null;
  boothNos?: string[] | null;
  wardGeoId?: string | null;
  boothNo?: string | null;
}): {
  wardGeoIds: string[];
  boothNos: string[];
  wardGeoId: string | null;
  boothNo: string | null;
} {
  const wardGeoIds = uniqueStrings(
    Array.isArray(input.wardGeoIds)
      ? input.wardGeoIds
      : input.wardGeoId
        ? [input.wardGeoId]
        : [],
  );
  const boothNos = uniqueStrings(
    Array.isArray(input.boothNos)
      ? input.boothNos
      : input.boothNo
        ? [input.boothNo]
        : [],
  );
  return {
    wardGeoIds,
    boothNos,
    wardGeoId: wardGeoIds[0] ?? null,
    boothNo: boothNos[0] ?? null,
  };
}

function formatBoothLabel(booth: string): string {
  const trimmed = booth.trim();
  if (!trimmed) return '';
  return trimmed.toLowerCase().startsWith('booth') ? trimmed : `Booth ${trimmed}`;
}

export function formatProjectHierarchyLocation(parts: {
  wardGeoNames?: string[] | null;
  wardGeoName?: string | null;
  ward?: string | null;
  boothNos?: string[] | null;
  boothNo?: string | null;
}): string {
  const names = uniqueStrings(
    parts.wardGeoNames?.length
      ? parts.wardGeoNames
      : parts.wardGeoName
        ? [parts.wardGeoName]
        : [],
  );
  const booths = uniqueStrings(
    parts.boothNos?.length
      ? parts.boothNos
      : parts.boothNo
        ? [parts.boothNo]
        : [],
  );
  if (names.length > 0) {
    const boothLabel = booths.map(formatBoothLabel).filter(Boolean).join(', ');
    return [names.join(', '), boothLabel].filter(Boolean).join(' · ') || '—';
  }
  if (parts.ward?.trim()) return parts.ward.trim();
  if (booths.length > 0) {
    return booths.map(formatBoothLabel).filter(Boolean).join(', ') || '—';
  }
  return '—';
}

export function buildProjectWardDisplay(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoIds: string[] | string | null | undefined,
  boothNos: string[] | string | null | undefined,
): string {
  const ids = uniqueStrings(Array.isArray(wardGeoIds) ? wardGeoIds : [wardGeoIds]);
  const booths = uniqueStrings(Array.isArray(boothNos) ? boothNos : [boothNos]);
  const wardNames = ids
    .map(
      (id) =>
        geoUnits.find((g) => g.id === id && g.type === 'ward')?.name?.trim() ||
        null,
    )
    .filter((name): name is string => Boolean(name));
  const boothLabels = booths.map(formatBoothLabel).filter(Boolean);
  return [...wardNames, ...boothLabels].join(', ');
}

export function wardOptionsFromGeoUnits(
  geoUnits: CadreConfig['geoUnits'],
  constituencyId = PROJECT_HIERARCHY_CONSTITUENCY_ID,
) {
  return geoUnits
    .filter(
      (g) =>
        g.type === 'ward' &&
        g.isActive &&
        ((g.acNo?.trim() ?? '') === constituencyId || !g.acNo?.trim()),
    )
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.name.localeCompare(b.name);
    });
}

export function boothOptionsForWard(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoId: string | null | undefined,
  constituencyId = PROJECT_HIERARCHY_CONSTITUENCY_ID,
) {
  return boothOptionsForWards(
    geoUnits,
    wardGeoId?.trim() ? [wardGeoId] : [],
    constituencyId,
  );
}

export function boothOptionsForWards(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoIds: string[] | null | undefined,
  constituencyId = PROJECT_HIERARCHY_CONSTITUENCY_ID,
) {
  const ids = uniqueStrings(wardGeoIds ?? []);
  if (ids.length === 0) return [];

  const selectedWards = geoUnits.filter(
    (g) => g.type === 'ward' && ids.includes(g.id),
  );
  const includeAllBooths = selectedWards.some((ward) =>
    isOverallProjectWard(ward),
  );

  const boothUnits = includeAllBooths
    ? getBoothGeoUnits(geoUnits, constituencyId)
    : ids.flatMap((id) => getBoothGeoUnits(geoUnits, constituencyId, id));

  const seen = new Set<string>();
  const options: Array<{ boothNo: string; label: string }> = [];
  for (const unit of boothUnits) {
    const boothNo = extractBoothNumber(unit.name) ?? unit.name.trim();
    if (!boothNo || seen.has(boothNo)) continue;
    seen.add(boothNo);
    options.push({ boothNo, label: unit.name });
  }
  return options;
}

export function retainValidBoothNos(
  selectedBoothNos: string[],
  options: Array<{ boothNo: string }>,
): string[] {
  const allowed = new Set(options.map((option) => option.boothNo));
  return uniqueStrings(selectedBoothNos).filter((boothNo) => allowed.has(boothNo));
}

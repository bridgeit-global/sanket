import {
  extractBoothNumber,
  getBoothGeoUnits,
} from '@/lib/hierarchy/booth-geo-units';
import type { CadreConfig } from '@/lib/hierarchy/types';

/** Same AC scope as hierarchy module screens. */
export const PROJECT_HIERARCHY_CONSTITUENCY_ID = '172';

export function formatProjectHierarchyLocation(parts: {
  wardGeoName?: string | null;
  ward?: string | null;
  boothNo?: string | null;
}): string {
  const wardLabel = parts.wardGeoName?.trim() || parts.ward?.trim() || '';
  const booth = parts.boothNo?.trim();
  const boothLabel = booth
    ? booth.toLowerCase().startsWith('booth')
      ? booth
      : `Booth ${booth}`
    : '';
  const joined = [wardLabel, boothLabel].filter(Boolean).join(' · ');
  return joined || '—';
}

export function buildProjectWardDisplay(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoId: string | null | undefined,
  boothNo: string | null | undefined,
): string {
  const wardId = wardGeoId?.trim() ?? '';
  const ward = wardId
    ? geoUnits.find((g) => g.id === wardId && g.type === 'ward')
    : undefined;
  const booth = boothNo?.trim() ?? '';
  const parts = [
    ward?.name?.trim() || null,
    booth ? `Booth ${booth}` : null,
  ].filter(Boolean);
  return parts.join(', ');
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
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function boothOptionsForWard(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoId: string | null | undefined,
  constituencyId = PROJECT_HIERARCHY_CONSTITUENCY_ID,
) {
  if (!wardGeoId?.trim()) return [];
  return getBoothGeoUnits(geoUnits, constituencyId, wardGeoId).map((g) => ({
    boothNo: extractBoothNumber(g.name) ?? g.name.trim(),
    label: g.name,
  }));
}

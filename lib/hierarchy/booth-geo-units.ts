import type { CadreConfig } from './types';

/** Parse booth/part number from a geographic unit name (e.g. "Booth 42", "Part 12"). */
export function extractBoothNumber(name: string): string | null {
  const labeled = name.match(/(?:Booth|Part(?:\s*No)?\.?)\s*(\d+)/i);
  if (labeled) return labeled[1] ?? null;
  const leading = name.match(/^(\d+)\b/);
  return leading?.[1] ?? null;
}

export function getBoothGeoUnits(
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
  wardGeoId?: string | null,
): CadreConfig['geoUnits'] {
  const wardId = wardGeoId?.trim() ?? '';
  return geoUnits
    .filter(
      (g) =>
        g.type === 'booth' &&
        g.isActive &&
        ((g.acNo?.trim() ?? '') === constituencyId || !g.acNo?.trim()) &&
        (!wardId || g.parentId === wardId),
    )
    .sort((a, b) => {
      const na = Number(extractBoothNumber(a.name) ?? 0);
      const nb = Number(extractBoothNumber(b.name) ?? 0);
      if (na !== nb) return na - nb;
      return a.name.localeCompare(b.name);
    });
}

export function resolveBoothGeoId(
  geoUnits: CadreConfig['geoUnits'],
  wardGeoId: string | null | undefined,
  boothNo: string | null | undefined,
): string {
  const booth = boothNo?.trim() ?? '';
  if (!booth) return '';
  const wardId = wardGeoId?.trim() ?? '';
  const match = geoUnits.find(
    (g) =>
      g.type === 'booth' &&
      g.isActive &&
      extractBoothNumber(g.name) === booth &&
      (!wardId || g.parentId === wardId),
  );
  return match?.id ?? '';
}

export function boothNoFromGeoUnit(
  geoUnits: CadreConfig['geoUnits'],
  boothGeoId: string | null | undefined,
): string | null {
  const id = boothGeoId?.trim() ?? '';
  if (!id) return null;
  const unit = geoUnits.find((g) => g.id === id && g.type === 'booth');
  if (!unit) return null;
  return extractBoothNumber(unit.name) ?? (unit.name.trim() || null);
}

export function wardGeoIdFromBoothGeoUnit(
  geoUnits: CadreConfig['geoUnits'],
  boothGeoId: string | null | undefined,
): string | null {
  const id = boothGeoId?.trim() ?? '';
  if (!id) return null;
  return geoUnits.find((g) => g.id === id && g.type === 'booth')?.parentId ?? null;
}

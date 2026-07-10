import type { CadreConfig, CadreMemberPostDetail } from './types';

export type GeoUnitMeta = {
  id: string;
  type: string;
  name: string;
  parentId: string | null;
};

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

/**
 * Imported booth posts store the booth CadreGeographicUnit id in ward_geo_id with booth_no unset.
 * Normalize to ward id + booth number so filters and leader resolution work consistently.
 */
export function normalizeBoothScopedPostGeo(
  post: CadreMemberPostDetail,
  geoById: Map<string, GeoUnitMeta>,
): CadreMemberPostDetail {
  if (!post.wardGeoId) return post;
  const geo = geoById.get(post.wardGeoId);
  if (!geo || geo.type !== 'booth') return post;

  const wardGeoId = geo.parentId;
  const ward = wardGeoId ? geoById.get(wardGeoId) : null;
  const boothNo = post.boothNo ?? extractBoothNumber(geo.name);

  return {
    ...post,
    wardGeoId,
    wardGeoName: ward?.name ?? post.wardGeoName,
    boothNo,
  };
}

/** Match a post to a ward + booth, including legacy booth geo ids in ward_geo_id. */
export function postMatchesBoothScope(
  post: Pick<CadreMemberPostDetail, 'wardGeoId' | 'boothNo'>,
  wardGeoId: string,
  boothNo: string,
  boothGeoId?: string,
): boolean {
  if (post.wardGeoId === wardGeoId && post.boothNo === boothNo) return true;
  if (boothGeoId && post.wardGeoId === boothGeoId) return true;
  return false;
}

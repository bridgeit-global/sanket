import type { CadreConfig } from './types';

/** Geo depth a wing may reach. */
export const CADRE_MAX_GEO_LEVELS = ['ward', 'booth'] as const;
export type CadreMaxGeoLevel = (typeof CADRE_MAX_GEO_LEVELS)[number];

export function isCadreMaxGeoLevel(value: unknown): value is CadreMaxGeoLevel {
  return (
    typeof value === 'string' &&
    (CADRE_MAX_GEO_LEVELS as readonly string[]).includes(value)
  );
}

/** Rank for comparing position levels against a wing's max_geo_level. */
export function geoRankForLevelKey(levelKey: string | null | undefined): number {
  if (!levelKey) return 0;
  if (levelKey === 'taluka' || levelKey === 'taluka_committee') return 1;
  if (levelKey === 'ward' || levelKey === 'ward_committee') return 2;
  if (
    levelKey === 'booth' ||
    levelKey === 'booth_committee' ||
    levelKey === 'booth_bla'
  ) {
    return 3;
  }
  return 0;
}

export function geoRankForMaxGeoLevel(maxGeoLevel: CadreMaxGeoLevel): number {
  return maxGeoLevel === 'booth' ? 3 : 2;
}

export function verticalAllowsLevel(
  maxGeoLevel: CadreMaxGeoLevel,
  levelKey: string | null | undefined,
): boolean {
  return geoRankForLevelKey(levelKey) <= geoRankForMaxGeoLevel(maxGeoLevel);
}

export function verticalAllowsBooth(maxGeoLevel: CadreMaxGeoLevel): boolean {
  return maxGeoLevel === 'booth';
}

export type VerticalWithMaxGeo = {
  id: string;
  maxGeoLevel: CadreMaxGeoLevel;
};

/** Active positions allowed for a wing given its max geo depth. */
export function positionsForVertical(
  positions: CadreConfig['positions'],
  maxGeoLevel: CadreMaxGeoLevel,
): CadreConfig['positions'] {
  return positions.filter(
    (position) =>
      position.isActive && verticalAllowsLevel(maxGeoLevel, position.levelKey),
  );
}

export function resolveVerticalMaxGeoLevel(
  verticals: Array<{ id: string; maxGeoLevel?: CadreMaxGeoLevel }>,
  verticalId: string | null | undefined,
): CadreMaxGeoLevel {
  if (!verticalId) return 'ward';
  const vertical = verticals.find((v) => v.id === verticalId);
  return vertical?.maxGeoLevel ?? 'ward';
}

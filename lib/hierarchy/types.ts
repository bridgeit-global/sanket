/** Geographic unit types stored on CadreGeographicUnit.type (varchar, no DB enum). */
export const CADRE_GEOGRAPHIC_UNIT_TYPES = [
  'national',
  'state',
  'division',
  'district',
  'taluka',
  'ward',
  'booth',
] as const;

export type CadreGeographicUnitType = (typeof CADRE_GEOGRAPHIC_UNIT_TYPES)[number];

export const CADRE_GEOGRAPHIC_UNIT_TYPE_LABELS: Record<CadreGeographicUnitType, string> = {
  national: 'National',
  state: 'State',
  division: 'Division',
  district: 'District',
  taluka: 'Taluka / City',
  ward: 'Ward',
  booth: 'Booth',
};

export function isCadreGeographicUnitType(value: unknown): value is CadreGeographicUnitType {
  return (
    typeof value === 'string' &&
    (CADRE_GEOGRAPHIC_UNIT_TYPES as readonly string[]).includes(value)
  );
}

export type CadreNodeDetail = {
  id: string;
  parentId: string | null;
  verticalId: string;
  positionId: string;
  constituencyId: string | null;
  divisionId: string | null;
  districtId: string | null;
  talukaId: string | null;
  wardGeoId: string | null;
  electionId: string | null;
  boothNo: string | null;
  personName: string | null;
  personPhone: string | null;
  personEmail: string | null;
  photoUrl: string | null;
  userId: string | null;
  epicNumber: string | null;
  notes: string | null;
  isVacant: boolean;
  isActive: boolean;
  appointedAt: string | null;
  termEndsAt: string | null;
  positionName: string;
  /** Lower values rank higher in the org chart (from CadrePosition.sort_order). */
  positionSortOrder: number;
  positionLevelKey: string;
  positionLevelName: string;
  verticalName: string;
  divisionName: string | null;
  districtName: string | null;
  talukaName: string | null;
  wardGeoName: string | null;
  linkedUser: { id: string; userId: string } | null;
  linkedVoter: { epicNumber: string; fullName: string; mobile: string | null } | null;
};

export type CadreConfigReferenceCounts = {
  categories: Record<string, { verticalCount: number }>;
  verticals: Record<string, { nodeCount: number }>;
  levels: Record<string, { positionCount: number }>;
  positions: Record<string, { nodeCount: number }>;
  geoUnits: Record<string, { nodeCount: number; childGeoCount: number }>;
};

export type CadreConfig = {
  categories: Array<{ id: string; name: string; sortOrder: number; isActive: boolean }>;
  verticals: Array<{
    id: string;
    categoryId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    categoryName: string;
  }>;
  levels: Array<{ id: string; key: string; name: string; sortOrder: number }>;
  positions: Array<{
    id: string;
    levelId: string;
    name: string;
    sortOrder: number;
    isActive: boolean;
    levelKey: string;
    levelName: string;
  }>;
  geoUnits: Array<{
    id: string;
    type: CadreGeographicUnitType;
    name: string;
    parentId: string | null;
    acNo: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
};

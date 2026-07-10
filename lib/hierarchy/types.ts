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

/** A vertical a member belongs to (e.g. Basic, Mahila, Yuvti). */
export type CadreMemberVerticalRef = {
  id: string;
  name: string;
  isPrimary: boolean;
  sortOrder: number;
};

/** A post (position + geo context) held by a member. */
export type CadreMemberPostDetail = {
  id: string;
  positionId: string;
  positionName: string;
  positionLevelKey: string;
  positionLevelName: string;
  /** Lower values rank higher in the org chart (from CadrePosition.sort_order). */
  positionSortOrder: number;
  /** Lower values rank higher among siblings (from CadrePositionLevel.sort_order). */
  positionLevelSortOrder: number;
  talukaId: string | null;
  talukaName: string | null;
  wardGeoId: string | null;
  wardGeoName: string | null;
  electionId: string | null;
  boothNo: string | null;
  /** Optional custom title, e.g. "Mandal Head". */
  label: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

/** A member is a person who can hold multiple verticals and posts (one card). */
export type CadreMemberCard = {
  id: string;
  constituencyId: string | null;
  personName: string | null;
  personPhone: string | null;
  personEmail: string | null;
  photoUrl: string | null;
  userId: string | null;
  epicNumber: string | null;
  notes: string | null;
  isActive: boolean;
  verticals: CadreMemberVerticalRef[];
  posts: CadreMemberPostDetail[];
  linkedUser: { id: string; userId: string } | null;
  linkedVoter: { epicNumber: string; fullName: string; mobile: string | null } | null;
  /** WhatsApp number stored in CadreMemberWhatsApp. */
  whatsappPhone: string | null;
};

export type WardSummary = {
  wardGeoId: string;
  boothCount: number;
  wingsAssigned: number;
  wingsTotal: number;
  primaryHead: CadreMemberCard | null;
  allHeads: CadreMemberCard[];
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

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
    type: string;
    name: string;
    parentId: string | null;
    acNo: string | null;
    sortOrder: number;
    isActive: boolean;
  }>;
};

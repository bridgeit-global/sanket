import type { CadreConfig, CadreNodeDetail } from './types';

/** Ward numbers / labels that must have a Ward Adhyaksh slot for AC 172. */
export const REQUIRED_AC172_WARD_KEYS = [
  '140',
  '141',
  '143',
  '144',
  '145',
  '146',
  '147',
  '148',
  '144 BARC',
  '146 BARC',
] as const;

const BASIC_VERTICAL_NAME = 'Basic';

export function isPlaceholderNode(node: CadreNodeDetail): boolean {
  return node.id.startsWith('vacant:');
}

function wardKeyFromGeoName(name: string): string | null {
  const barc = name.match(/Ward\s+(\d+)\s+BARC/i);
  if (barc) return `${barc[1]} BARC`;
  const num = name.match(/Ward\s+(\d+)/i);
  return num?.[1] ?? null;
}

export function getRequiredWardGeoUnits(
  geoUnits: CadreConfig['geoUnits'],
  constituencyId: string,
): CadreConfig['geoUnits'] {
  const wards = geoUnits.filter(
    (g) =>
      g.type === 'ward' &&
      g.isActive &&
      ((g.acNo?.trim() ?? '') === constituencyId || !g.acNo?.trim()),
  );
  const byKey = new Map<string, (typeof wards)[number]>();
  for (const ward of wards) {
    const key = wardKeyFromGeoName(ward.name);
    if (key) byKey.set(key, ward);
  }
  return REQUIRED_AC172_WARD_KEYS.map((key) => byKey.get(key)).filter(
    (g): g is (typeof wards)[number] => g != null,
  );
}

function findPosition(
  positions: CadreConfig['positions'],
  levelKey: string,
): CadreConfig['positions'][number] | undefined {
  return positions.find((p) => p.isActive && p.levelKey === levelKey);
}

function findLevelSortOrder(
  levels: CadreConfig['levels'],
  levelKey: string,
): number {
  return levels.find((l) => l.key === levelKey)?.sortOrder ?? 999;
}

function makePlaceholder(
  id: string,
  partial: Pick<
    CadreNodeDetail,
    | 'parentId'
    | 'verticalId'
    | 'verticalName'
    | 'positionId'
    | 'positionName'
    | 'positionSortOrder'
    | 'positionLevelSortOrder'
    | 'positionLevelKey'
    | 'positionLevelName'
    | 'constituencyId'
    | 'wardGeoId'
    | 'wardGeoName'
    | 'electionId'
    | 'boothNo'
  >,
): CadreNodeDetail {
  return {
    id,
    parentId: partial.parentId,
    verticalId: partial.verticalId,
    positionId: partial.positionId,
    constituencyId: partial.constituencyId,
    divisionId: null,
    districtId: null,
    talukaId: null,
    wardGeoId: partial.wardGeoId,
    electionId: partial.electionId,
    boothNo: partial.boothNo,
    personName: null,
    personPhone: null,
    personEmail: null,
    photoUrl: null,
    userId: null,
    epicNumber: null,
    notes: null,
    isVacant: true,
    isActive: true,
    appointedAt: null,
    termEndsAt: null,
    positionName: partial.positionName,
    positionSortOrder: partial.positionSortOrder,
    positionLevelSortOrder: partial.positionLevelSortOrder,
    positionLevelKey: partial.positionLevelKey,
    positionLevelName: partial.positionLevelName,
    verticalName: partial.verticalName,
    divisionName: null,
    districtName: null,
    talukaName: null,
    wardGeoName: partial.wardGeoName,
    linkedUser: null,
    linkedVoter: null,
  };
}

export type ForestVacantSlotContext = Omit<
  VacantSlotContext,
  'verticalId' | 'verticalName'
> & {
  verticals: Array<{ id: string; name: string }>;
};

/**
 * Appends vacant slots for every vertical in the forest. Taluka/ward slots are
 * synthesized per vertical; booth slots remain Basic-vertical-only (see
 * appendVacantSlots).
 */
export function appendVacantSlotsForForest(
  nodes: CadreNodeDetail[],
  ctx: ForestVacantSlotContext,
): CadreNodeDetail[] {
  let result = nodes;
  for (const vertical of ctx.verticals) {
    const subset = result.filter((n) => n.verticalId === vertical.id);
    const enriched = appendVacantSlots(subset, {
      ...ctx,
      verticalId: vertical.id,
      verticalName: vertical.name,
    });
    const added = enriched.slice(subset.length);
    if (added.length > 0) result = [...result, ...added];
  }
  return result;
}

export type VacantSlotContext = {
  verticalId: string;
  verticalName: string;
  constituencyId: string;
  electionId: string;
  wardGeoId: string | null;
  config: CadreConfig;
  expectedBoothNos: string[];
  boothToWardGeoId: Map<string, string>;
};

/**
 * Adds synthetic vacant nodes for expected taluka / ward / booth slots that have no
 * CadreNode row yet. Existing DB rows (including is_vacant) are left unchanged.
 */
export function appendVacantSlots(
  nodes: CadreNodeDetail[],
  ctx: VacantSlotContext,
): CadreNodeDetail[] {
  const { config, verticalId, verticalName, constituencyId, electionId } = ctx;
  const posTaluka = findPosition(config.positions, 'taluka');
  const posWard = findPosition(config.positions, 'ward');
  const posBooth = findPosition(config.positions, 'booth');
  if (!posTaluka || !posWard) return nodes;

  const result = [...nodes];
  const byId = new Map(result.map((n) => [n.id, n]));

  const hasTaluka = result.some(
    (n) => n.verticalId === verticalId && n.positionLevelKey === 'taluka',
  );
  let talukaId = result.find(
    (n) => n.verticalId === verticalId && n.positionLevelKey === 'taluka',
  )?.id;

  if (!hasTaluka) {
    const placeholder = makePlaceholder(`vacant:taluka:${verticalId}`, {
      parentId: null,
      verticalId,
      verticalName,
      positionId: posTaluka.id,
      positionName: posTaluka.name,
      positionSortOrder: posTaluka.sortOrder,
      positionLevelSortOrder: findLevelSortOrder(config.levels, 'taluka'),
      positionLevelKey: 'taluka',
      positionLevelName: posTaluka.levelName,
      constituencyId,
      wardGeoId: null,
      wardGeoName: null,
      electionId: null,
      boothNo: null,
    });
    result.push(placeholder);
    byId.set(placeholder.id, placeholder);
    talukaId = placeholder.id;
  }

  const requiredWards = getRequiredWardGeoUnits(config.geoUnits, constituencyId);
  const wardsToFill =
    ctx.wardGeoId != null
      ? requiredWards.filter((w) => w.id === ctx.wardGeoId)
      : requiredWards;

  for (const ward of wardsToFill) {
    const exists = result.some(
      (n) =>
        n.verticalId === verticalId &&
        n.positionLevelKey === 'ward' &&
        n.wardGeoId === ward.id,
    );
    if (exists) continue;

    const placeholder = makePlaceholder(`vacant:ward:${verticalId}:${ward.id}`, {
      parentId: talukaId ?? null,
      verticalId,
      verticalName,
      positionId: posWard.id,
      positionName: posWard.name,
      positionSortOrder: posWard.sortOrder,
      positionLevelSortOrder: findLevelSortOrder(config.levels, 'ward'),
      positionLevelKey: 'ward',
      positionLevelName: posWard.levelName,
      constituencyId,
      wardGeoId: ward.id,
      wardGeoName: ward.name,
      electionId: null,
      boothNo: null,
    });
    result.push(placeholder);
    byId.set(placeholder.id, placeholder);
  }

  const isBasicVertical = verticalName === BASIC_VERTICAL_NAME;
  const includeBoothSlots = ctx.wardGeoId != null;
  if (!includeBoothSlots || !isBasicVertical || !posBooth || ctx.expectedBoothNos.length === 0) {
    return result;
  }

  const basicVerticalId =
    config.verticals.find((v) => v.isActive && v.name === BASIC_VERTICAL_NAME)?.id ?? verticalId;

  for (const boothNo of ctx.expectedBoothNos) {
    const exists = result.some(
      (n) =>
        n.verticalId === basicVerticalId &&
        n.positionLevelKey === 'booth' &&
        n.boothNo === boothNo,
    );
    if (exists) continue;

    let wardGeoId = ctx.boothToWardGeoId.get(boothNo) ?? ctx.wardGeoId ?? null;

    const wardParent = result.find(
      (n) =>
        n.verticalId === basicVerticalId &&
        n.positionLevelKey === 'ward' &&
        (wardGeoId ? n.wardGeoId === wardGeoId : ctx.wardGeoId ? n.wardGeoId === ctx.wardGeoId : false),
    );
    if (!wardGeoId && wardParent?.wardGeoId) {
      wardGeoId = wardParent.wardGeoId;
    }
    if (ctx.wardGeoId != null && wardGeoId !== ctx.wardGeoId) continue;
    const wardGeo = wardGeoId
      ? config.geoUnits.find((g) => g.id === wardGeoId)
      : undefined;

    const placeholder = makePlaceholder(`vacant:booth:${basicVerticalId}:${boothNo}`, {
      parentId: wardParent?.id ?? null,
      verticalId: basicVerticalId,
      verticalName: BASIC_VERTICAL_NAME,
      positionId: posBooth.id,
      positionName: posBooth.name,
      positionSortOrder: posBooth.sortOrder,
      positionLevelSortOrder: findLevelSortOrder(config.levels, 'booth'),
      positionLevelKey: 'booth',
      positionLevelName: posBooth.levelName,
      constituencyId,
      wardGeoId,
      wardGeoName: wardGeo?.name ?? null,
      electionId,
      boothNo,
    });
    result.push(placeholder);
  }

  return result;
}

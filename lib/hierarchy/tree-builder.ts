import type { CadreNodeDetail } from './types';

export const GROUP_LEVEL_KEYS = [
  'taluka_committee_group',
  'wards_group',
  'ward_committee_group',
  'booths_group',
  'booth_group',
] as const;

export type GroupLevelKey = (typeof GROUP_LEVEL_KEYS)[number];

const GROUP_PREFIX = 'group:';

const GROUP_META: Record<
  GroupLevelKey,
  { positionName: string; positionLevelName: string }
> = {
  taluka_committee_group: {
    positionName: 'Taluka Committee',
    positionLevelName: 'Taluka Committee',
  },
  wards_group: { positionName: 'Wards', positionLevelName: 'Wards' },
  ward_committee_group: {
    positionName: 'Ward Committee',
    positionLevelName: 'Ward Committee',
  },
  booths_group: { positionName: 'Booths', positionLevelName: 'Booths' },
  booth_group: { positionName: 'Booth', positionLevelName: 'Booth' },
};

export function talukaCommitteeGroupId(talukaNodeId: string): string {
  return `${GROUP_PREFIX}tc:${talukaNodeId}`;
}

export function wardsGroupId(talukaNodeId: string): string {
  return `${GROUP_PREFIX}wards:${talukaNodeId}`;
}

export function wardCommitteeGroupId(wardNodeId: string): string {
  return `${GROUP_PREFIX}wc:${wardNodeId}`;
}

export function boothsGroupId(wardNodeId: string): string {
  return `${GROUP_PREFIX}booths:${wardNodeId}`;
}

export function boothGroupId(wardNodeId: string, boothNo: string): string {
  return `${GROUP_PREFIX}booth:${wardNodeId}:${boothNo}`;
}

export function isGroupNode(node: Pick<CadreNodeDetail, 'id' | 'positionLevelKey'>): boolean {
  return (
    node.id.startsWith(GROUP_PREFIX) ||
    (GROUP_LEVEL_KEYS as readonly string[]).includes(node.positionLevelKey)
  );
}

function compareBoothNo(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
}

function matchesTalukaScope(
  node: CadreNodeDetail,
  taluka: CadreNodeDetail,
  talukaNodeId: string,
): boolean {
  if (node.verticalId !== taluka.verticalId) return false;
  if (node.parentId === talukaNodeId) return true;
  if (taluka.talukaId && node.talukaId === taluka.talukaId) return true;
  return false;
}

function makeGroupNode(
  id: string,
  parentId: string,
  contextNode: CadreNodeDetail,
  levelKey: GroupLevelKey,
  displayName: string,
  sortOrder: number,
  boothNo: string | null = null,
): CadreNodeDetail {
  const meta = GROUP_META[levelKey];
  return {
    id,
    parentId,
    verticalId: contextNode.verticalId,
    positionId: '',
    constituencyId: contextNode.constituencyId,
    divisionId: contextNode.divisionId,
    districtId: contextNode.districtId,
    talukaId: contextNode.talukaId,
    wardGeoId: contextNode.wardGeoId,
    electionId: contextNode.electionId,
    boothNo,
    personName: displayName,
    personPhone: null,
    personEmail: null,
    photoUrl: null,
    userId: null,
    epicNumber: null,
    notes: null,
    isVacant: false,
    isActive: true,
    appointedAt: null,
    termEndsAt: null,
    positionName:
      levelKey === 'booth_group' ? displayName : meta.positionName,
    positionSortOrder: sortOrder,
    positionLevelSortOrder: sortOrder,
    positionLevelKey: levelKey,
    positionLevelName:
      levelKey === 'booth_group' ? displayName : meta.positionLevelName,
    verticalName: contextNode.verticalName,
    divisionName: contextNode.divisionName,
    districtName: contextNode.districtName,
    talukaName: contextNode.talukaName,
    wardGeoName: contextNode.wardGeoName,
    linkedUser: null,
    linkedVoter: null,
  };
}

function buildTalukaGroups(
  nodes: CadreNodeDetail[],
  result: CadreNodeDetail[],
  resultById: Map<string, CadreNodeDetail>,
  groupNodes: CadreNodeDetail[],
): void {
  const talukaNodes = nodes.filter((n) => n.positionLevelKey === 'taluka');
  if (talukaNodes.length === 0) return;

  for (const taluka of talukaNodes) {
    const tcGroupId = talukaCommitteeGroupId(taluka.id);
    const wardsGroupNodeId = wardsGroupId(taluka.id);

    const tcGroup = makeGroupNode(
      tcGroupId,
      taluka.id,
      taluka,
      'taluka_committee_group',
      'Taluka Committee',
      10,
    );
    const wardsGroup = makeGroupNode(
      wardsGroupNodeId,
      taluka.id,
      taluka,
      'wards_group',
      'Wards',
      20,
    );
    groupNodes.push(tcGroup, wardsGroup);
    resultById.set(tcGroupId, tcGroup);
    resultById.set(wardsGroupNodeId, wardsGroup);

    for (const node of result) {
      if (!matchesTalukaScope(node, taluka, taluka.id)) continue;

      if (node.positionLevelKey === 'taluka_committee') {
        node.parentId = tcGroupId;
        continue;
      }

      if (node.positionLevelKey === 'ward') {
        node.parentId = wardsGroupNodeId;
      }
    }
  }
}

function buildWardGroups(
  nodes: CadreNodeDetail[],
  result: CadreNodeDetail[],
  resultById: Map<string, CadreNodeDetail>,
  groupNodes: CadreNodeDetail[],
): void {
  const wardNodes = nodes.filter((n) => n.positionLevelKey === 'ward');
  if (wardNodes.length === 0) return;

  for (const ward of wardNodes) {
    const wcGroupId = wardCommitteeGroupId(ward.id);
    const boothsGroupNodeId = boothsGroupId(ward.id);

    const wcGroup = makeGroupNode(
      wcGroupId,
      ward.id,
      ward,
      'ward_committee_group',
      'Ward Committee',
      10,
    );
    const boothsGroup = makeGroupNode(
      boothsGroupNodeId,
      ward.id,
      ward,
      'booths_group',
      'Booths',
      20,
    );
    groupNodes.push(wcGroup, boothsGroup);
    resultById.set(wcGroupId, wcGroup);
    resultById.set(boothsGroupNodeId, boothsGroup);

    const boothNos = new Set<string>();
    for (const node of result) {
      if (node.verticalId !== ward.verticalId) continue;
      if (node.wardGeoId !== ward.wardGeoId) continue;
      if (node.positionLevelKey === 'booth' && node.boothNo) {
        boothNos.add(node.boothNo);
      }
      if (node.positionLevelKey === 'booth_committee' && node.boothNo) {
        boothNos.add(node.boothNo);
      }
    }

    const sortedBoothNos = [...boothNos].sort(compareBoothNo);
    const boothGroupIdByNo = new Map<string, string>();
    for (const boothNo of sortedBoothNos) {
      const bgId = boothGroupId(ward.id, boothNo);
      boothGroupIdByNo.set(boothNo, bgId);
      const boothGroup = makeGroupNode(
        bgId,
        boothsGroupNodeId,
        ward,
        'booth_group',
        `Booth ${boothNo}`,
        100 + (Number(boothNo) || 0),
        boothNo,
      );
      groupNodes.push(boothGroup);
      resultById.set(bgId, boothGroup);
    }

    for (const node of result) {
      if (node.verticalId !== ward.verticalId) continue;
      if (node.wardGeoId !== ward.wardGeoId) continue;

      if (node.positionLevelKey === 'ward_committee') {
        node.parentId = wcGroupId;
        continue;
      }

      if (node.positionLevelKey === 'booth' && node.boothNo) {
        const bgId = boothGroupIdByNo.get(node.boothNo);
        if (bgId) node.parentId = bgId;
        continue;
      }

      if (node.positionLevelKey === 'booth_committee' && node.boothNo) {
        const bgId = boothGroupIdByNo.get(node.boothNo);
        if (bgId) node.parentId = bgId;
      }
    }
  }
}

/**
 * Restructures taluka and ward subtrees into navigable branches:
 * Taluka Adhyaksh → Taluka Committee (members) | Wards → Ward Adhyaksh → …
 * Ward Adhyaksh → Ward Committee (members) | Booths → Booth N → adhyaksh + committee.
 */
export function buildNavigableTree(nodes: CadreNodeDetail[]): CadreNodeDetail[] {
  if (nodes.length === 0) return nodes;

  const result = nodes.map((n) => ({ ...n }));
  const resultById = new Map(result.map((n) => [n.id, n]));
  const groupNodes: CadreNodeDetail[] = [];

  buildTalukaGroups(nodes, result, resultById, groupNodes);
  buildWardGroups(nodes, result, resultById, groupNodes);

  if (groupNodes.length === 0) return result;

  return [...result, ...groupNodes];
}

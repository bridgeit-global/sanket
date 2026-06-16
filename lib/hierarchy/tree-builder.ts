import type { CadreNodeDetail } from './types';

export const GROUP_LEVEL_KEYS = [
  'ward_committee_group',
  'booths_group',
  'booth_group',
] as const;

export type GroupLevelKey = (typeof GROUP_LEVEL_KEYS)[number];

const GROUP_PREFIX = 'group:';

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

function makeGroupNode(
  id: string,
  parentId: string,
  wardNode: CadreNodeDetail,
  levelKey: GroupLevelKey,
  displayName: string,
  sortOrder: number,
  boothNo: string | null = null,
): CadreNodeDetail {
  return {
    id,
    parentId,
    verticalId: wardNode.verticalId,
    positionId: '',
    constituencyId: wardNode.constituencyId,
    divisionId: wardNode.divisionId,
    districtId: wardNode.districtId,
    talukaId: wardNode.talukaId,
    wardGeoId: wardNode.wardGeoId,
    electionId: wardNode.electionId,
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
      levelKey === 'ward_committee_group'
        ? 'Ward Committee'
        : levelKey === 'booths_group'
          ? 'Booths'
          : displayName,
    positionSortOrder: sortOrder,
    positionLevelSortOrder: sortOrder,
    positionLevelKey: levelKey,
    positionLevelName:
      levelKey === 'ward_committee_group'
        ? 'Ward Committee'
        : levelKey === 'booths_group'
          ? 'Booths'
          : 'Booth',
    verticalName: wardNode.verticalName,
    divisionName: wardNode.divisionName,
    districtName: wardNode.districtName,
    talukaName: wardNode.talukaName,
    wardGeoName: wardNode.wardGeoName,
    linkedUser: null,
    linkedVoter: null,
  };
}

/**
 * Restructures ward subtrees into navigable branches:
 * Ward Adhyaksh → Ward Committee (members) | Booths → Booth N → adhyaksh + committee.
 */
export function buildNavigableTree(nodes: CadreNodeDetail[]): CadreNodeDetail[] {
  if (nodes.length === 0) return nodes;

  const wardNodes = nodes.filter((n) => n.positionLevelKey === 'ward');
  if (wardNodes.length === 0) return nodes;

  const result = nodes.map((n) => ({ ...n }));
  const resultById = new Map(result.map((n) => [n.id, n]));
  const groupNodes: CadreNodeDetail[] = [];

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

  return [...result, ...groupNodes];
}

import type { CadreConfig, CadreNodeDetail } from './types';
import { isPlaceholderNode } from './vacant-slots';

export const VERTICAL_HUB_PREFIX = 'vertical-hub:';
export const VERTICAL_LEVEL_KEY = 'vertical';

export function verticalHubId(verticalId: string): string {
  return `${VERTICAL_HUB_PREFIX}${verticalId}`;
}

export function isVerticalHubNode(node: Pick<CadreNodeDetail, 'id'>): boolean {
  return node.id.startsWith(VERTICAL_HUB_PREFIX);
}

/** Synthetic ids (hubs, vacant placeholders) must never be persisted as parentId. */
export function toPersistableParentId(id: string | null | undefined): string | null {
  if (!id) return null;
  if (
    id.startsWith(VERTICAL_HUB_PREFIX) ||
    id.startsWith('committee-hub:') ||
    id.startsWith('group:') ||
    id.startsWith('vacant:')
  ) {
    return null;
  }
  return id;
}

export type VerticalHubStats = {
  totalNodes: number;
  vacantNodes: number;
};

export type ForestResult = {
  nodes: CadreNodeDetail[];
  hubStats: Map<string, VerticalHubStats>;
};

function makeHubNode(vertical: CadreConfig['verticals'][number]): CadreNodeDetail {
  return {
    id: verticalHubId(vertical.id),
    parentId: null,
    verticalId: vertical.id,
    positionId: '',
    constituencyId: null,
    divisionId: null,
    districtId: null,
    talukaId: null,
    wardGeoId: null,
    electionId: null,
    boothNo: null,
    personName: vertical.name,
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
    positionName: vertical.categoryName,
    positionSortOrder: vertical.sortOrder,
    positionLevelSortOrder: 0,
    positionLevelKey: VERTICAL_LEVEL_KEY,
    positionLevelName: 'Vertical',
    verticalName: vertical.name,
    divisionName: null,
    districtName: null,
    talukaName: null,
    wardGeoName: null,
    linkedUser: null,
    linkedVoter: null,
  };
}

/**
 * Builds a single forest with one synthetic hub node per active vertical.
 * Nodes of collapsed verticals are hidden; roots of expanded verticals are
 * reparented (layout only) under their vertical hub.
 */
export function buildForest(
  allNodes: CadreNodeDetail[],
  verticals: CadreConfig['verticals'],
  expandedVerticalIds: ReadonlySet<string>,
): ForestResult {
  const activeVerticals = verticals.filter((v) => v.isActive);
  const hubStats = new Map<string, VerticalHubStats>();
  const nodeIds = new Set(allNodes.map((n) => n.id));

  for (const vertical of activeVerticals) {
    const own = allNodes.filter((n) => n.verticalId === vertical.id);
    hubStats.set(vertical.id, {
      totalNodes: own.filter((n) => !isPlaceholderNode(n)).length,
      vacantNodes: own.filter((n) => n.isVacant).length,
    });
  }

  const result: CadreNodeDetail[] = activeVerticals.map(makeHubNode);

  for (const node of allNodes) {
    if (!expandedVerticalIds.has(node.verticalId)) continue;
    const isRoot = !node.parentId || !nodeIds.has(node.parentId);
    result.push(
      isRoot ? { ...node, parentId: verticalHubId(node.verticalId) } : node,
    );
  }

  return { nodes: result, hubStats };
}

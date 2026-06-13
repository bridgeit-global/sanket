import { isVerticalHubNode, VERTICAL_LEVEL_KEY } from './forest-builder';
import type { CadreNodeDetail } from './types';

/**
 * Progressive map depth:
 * - ward: Taluka Adhyaksh → Ward Adhyaksh
 * - booth: + Booth Adhyaksh
 * - committee: + Booth Committee Member
 */
export type MapDepth = 'ward' | 'booth' | 'committee';

const DEPTH_LEVELS: Record<MapDepth, ReadonlySet<string>> = {
  ward: new Set([VERTICAL_LEVEL_KEY, 'taluka', 'ward', 'ward_committee']),
  /** Booth branch only — ward committee is a sibling under ward, not part of booth depth. */
  booth: new Set([VERTICAL_LEVEL_KEY, 'taluka', 'ward', 'booth']),
  committee: new Set([
    VERTICAL_LEVEL_KEY,
    'taluka',
    'ward',
    'ward_committee',
    'booth',
    'booth_committee',
  ]),
};

export const MAP_DEPTH_LABELS: Record<MapDepth, string> = {
  ward: 'Ward',
  booth: 'Booth',
  committee: 'Committee',
};

export const DEFAULT_MAP_DEPTH: MapDepth = 'ward';

/** Max nodes before prompting ward/booth drill-down instead of rendering the full tree. */
export const MAP_MAX_RENDER_NODES = 120;

/** Minimum zoom when fitting large trees so cards stay partially readable. */
export const MAP_MIN_FIT_SCALE = 0.42;

export type MapRenderGate = {
  render: boolean;
  message?: string;
  hint?: 'ward' | 'booth';
};

export function isDepthAllowed(depth: MapDepth, wardGeoId: string | null | undefined): boolean {
  if (depth === 'ward') return true;
  return Boolean(wardGeoId?.trim());
}

export function capDepthWithoutWard(
  depth: MapDepth,
  wardGeoId: string | null | undefined,
): MapDepth {
  if (wardGeoId?.trim()) return depth;
  if (depth === 'committee' || depth === 'booth') return 'ward';
  return depth;
}

export function getMapRenderGate(
  nodeCount: number,
  nav: NavFilterState,
  depth: MapDepth,
): MapRenderGate {
  if (nodeCount <= MAP_MAX_RENDER_NODES) {
    return { render: true };
  }
  if (nav.boothMemberId?.trim() || nav.wardMemberId?.trim()) {
    return { render: true };
  }
  if (!nav.wardGeoId?.trim()) {
    return {
      render: false,
      hint: 'ward',
      message: `${nodeCount.toLocaleString()} members — select a ward to view the hierarchy`,
    };
  }
  if (depth === 'committee' && !nav.boothNo?.trim()) {
    return {
      render: false,
      hint: 'booth',
      message: `${nodeCount.toLocaleString()} members — select a booth to view committee members`,
    };
  }
  return { render: true };
}

export const HIERARCHY_URL_PARAMS = {
  depth: 'depth',
  search: 'search',
  /** @deprecated Legacy text filter — prefer `ward` (geo id). */
  wardNo: 'wardNo',
  boothNo: 'boothNo',
  expand: 'expand',
  ward: 'ward',
  wardMember: 'wardMember',
  boothMember: 'boothMember',
} as const;

export type NavFilterState = {
  wardGeoId?: string;
  boothNo?: string;
  wardMemberId?: string;
  boothMemberId?: string;
};

/** Parse depth from URL; accepts legacy values from earlier filter UI. */
export function parseMapDepth(value: string | null | undefined): MapDepth {
  if (value === 'committee' || value === 'members' || value === 'full') return 'committee';
  if (value === 'booth' || value === 'booths') return 'booth';
  if (value === 'ward' || value === 'overview') return 'ward';
  return DEFAULT_MAP_DEPTH;
}

function includeAncestors(
  nodes: CadreNodeDetail[],
  visible: Map<string, CadreNodeDetail>,
): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of [...visible.values()]) {
    let parentId = node.parentId;
    while (parentId) {
      if (visible.has(parentId)) break;
      const parent = byId.get(parentId);
      if (!parent) break;
      visible.set(parent.id, parent);
      parentId = parent.parentId;
    }
  }
}

export function filterNodesForMap(
  nodes: CadreNodeDetail[],
  depth: MapDepth,
  wardGeoId: string | null,
): CadreNodeDetail[] {
  const allowedLevels = DEPTH_LEVELS[depth];
  const visible = new Map<string, CadreNodeDetail>();

  for (const node of nodes) {
    if (!allowedLevels.has(node.positionLevelKey)) continue;
    if (wardGeoId && node.positionLevelKey !== 'taluka' && node.wardGeoId !== wardGeoId) {
      continue;
    }
    visible.set(node.id, node);
  }

  includeAncestors(nodes, visible);
  return [...visible.values()];
}

export function extractWardNumber(wardGeoName: string | null): string | null {
  if (!wardGeoName) return null;
  const barc = wardGeoName.match(/Ward\s+(\d+)\s+BARC/i);
  if (barc) return barc[1] ?? null;
  const num = wardGeoName.match(/Ward\s+(\d+)/i);
  return num?.[1] ?? null;
}

export function getNodeDisplayName(node: CadreNodeDetail): string {
  if (node.isVacant) return '';
  return (
    node.personName ??
    node.linkedVoter?.fullName ??
    node.linkedUser?.userId ??
    ''
  );
}

export function nodeMatchesSearch(node: CadreNodeDetail, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getNodeDisplayName(node).toLowerCase().includes(q);
}

export function nodeMatchesWardNo(node: CadreNodeDetail, wardNo: string): boolean {
  const w = wardNo.trim();
  if (!w) return true;
  if (node.positionLevelKey === 'taluka' || isVerticalHubNode(node)) return true;
  return extractWardNumber(node.wardGeoName) === w;
}

export function nodeMatchesWardGeo(node: CadreNodeDetail, wardGeoId: string): boolean {
  const id = wardGeoId.trim();
  if (!id) return true;
  if (node.positionLevelKey === 'taluka' || isVerticalHubNode(node)) return true;
  return node.wardGeoId === id;
}

export function nodeMatchesBoothNo(node: CadreNodeDetail, boothNo: string): boolean {
  const b = boothNo.trim();
  if (!b) return true;
  if (!['booth', 'booth_committee'].includes(node.positionLevelKey)) return true;
  return node.boothNo === b;
}

export type SearchFilterResult = {
  nodes: CadreNodeDetail[];
  matchIds: Set<string>;
  hasActiveFilter: boolean;
};

function addAncestors(
  byId: Map<string, CadreNodeDetail>,
  visible: Map<string, CadreNodeDetail>,
  startId: string,
): void {
  let current: CadreNodeDetail | undefined = byId.get(startId);
  while (current) {
    visible.set(current.id, current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
}

function addDescendants(
  nodes: CadreNodeDetail[],
  visible: Map<string, CadreNodeDetail>,
  rootId: string,
): void {
  for (const node of nodes) {
    if (node.parentId === rootId) {
      visible.set(node.id, node);
      addDescendants(nodes, visible, node.id);
    }
  }
}

export function applyNavFilters(
  nodes: CadreNodeDetail[],
  nav: NavFilterState,
): SearchFilterResult {
  const wardGeoId = nav.wardGeoId?.trim() ?? '';
  const boothNo = nav.boothNo?.trim() ?? '';
  const wardMemberId = nav.wardMemberId?.trim() ?? '';
  const boothMemberId = nav.boothMemberId?.trim() ?? '';
  const hasActiveFilter = Boolean(wardGeoId || boothNo || wardMemberId || boothMemberId);

  if (!hasActiveFilter) {
    return { nodes, matchIds: new Set(), hasActiveFilter: false };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visible = new Map<string, CadreNodeDetail>();
  const matchIds = new Set<string>();

  if (boothMemberId && byId.has(boothMemberId)) {
    matchIds.add(boothMemberId);
    addAncestors(byId, visible, boothMemberId);
    addDescendants(nodes, visible, boothMemberId);
    return { nodes: [...visible.values()], matchIds, hasActiveFilter: true };
  }

  if (wardMemberId && byId.has(wardMemberId)) {
    matchIds.add(wardMemberId);
    addAncestors(byId, visible, wardMemberId);
    addDescendants(nodes, visible, wardMemberId);
    return { nodes: [...visible.values()], matchIds, hasActiveFilter: true };
  }

  for (const node of nodes) {
    if (isVerticalHubNode(node)) {
      visible.set(node.id, node);
      continue;
    }
    if (!nodeMatchesWardGeo(node, wardGeoId)) continue;
    if (!nodeMatchesBoothNo(node, boothNo)) continue;
    if (boothNo && !wardMemberId && node.positionLevelKey === 'ward_committee') continue;
    visible.set(node.id, node);
  }

  includeAncestors(nodes, visible);

  if (boothNo) {
    const pruned = new Map<string, CadreNodeDetail>();
    for (const node of visible.values()) {
      if (node.positionLevelKey === 'booth' && node.boothNo !== boothNo) continue;
      if (node.positionLevelKey === 'booth_committee' && node.boothNo !== boothNo) continue;
      if (!wardMemberId && node.positionLevelKey === 'ward_committee') continue;
      pruned.set(node.id, node);
    }
    includeAncestors(nodes, pruned);
    return { nodes: [...pruned.values()], matchIds, hasActiveFilter: true };
  }

  return { nodes: [...visible.values()], matchIds, hasActiveFilter: true };
}

export function applySearchFilters(
  nodes: CadreNodeDetail[],
  opts: {
    search?: string;
    wardNo?: string;
    wardGeoId?: string;
    boothNo?: string;
  },
): SearchFilterResult {
  const search = opts.search?.trim() ?? '';
  const wardNo = opts.wardNo?.trim() ?? '';
  const wardGeoId = opts.wardGeoId?.trim() ?? '';
  const boothNo = opts.boothNo?.trim() ?? '';
  const hasActiveFilter = Boolean(search || wardNo || wardGeoId || boothNo);

  if (!hasActiveFilter) {
    return { nodes, matchIds: new Set(), hasActiveFilter: false };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const matchIds = new Set<string>();

  for (const node of nodes) {
    if (isVerticalHubNode(node)) continue;
    if (
      nodeMatchesSearch(node, search) &&
      nodeMatchesWardNo(node, wardNo) &&
      nodeMatchesWardGeo(node, wardGeoId) &&
      nodeMatchesBoothNo(node, boothNo)
    ) {
      matchIds.add(node.id);
    }
  }

  const visible = new Map<string, CadreNodeDetail>();
  for (const id of matchIds) {
    addAncestors(byId, visible, id);
  }

  return {
    nodes: [...visible.values()],
    matchIds,
    hasActiveFilter: true,
  };
}

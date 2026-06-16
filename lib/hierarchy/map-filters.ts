import { isVerticalHubNode } from './forest-builder';
import type { CadreNodeDetail } from './types';

/** Minimum zoom when fitting large trees so cards stay partially readable. */
export const MAP_MIN_FIT_SCALE = 0.36;

/** Minimum zoom when fitting small trees (prevents over-zoom-out on few nodes). */
export const MAP_SMALL_TREE_MIN_FIT_SCALE = 0.55;

/** Minimum zoom when fitting small trees (prevents over-zoom-out on few visible nodes). */
export const SMALL_TREE_MIN_FIT_SCALE = 0.55;

export const HIERARCHY_URL_PARAMS = {
  search: 'search',
  /** @deprecated Legacy text filter — prefer `ward` (geo id). */
  wardNo: 'wardNo',
  boothNo: 'boothNo',
  expand: 'expand',
  ward: 'ward',
} as const;

export type NavFilterState = {
  /** When set, only this vertical's hub card is shown. */
  focusVerticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
};

/** Hide vertical hub cards that are not in focus. */
export function filterVerticalHubs(
  nodes: CadreNodeDetail[],
  focusVerticalId?: string,
): CadreNodeDetail[] {
  const verticalId = focusVerticalId?.trim() ?? '';
  if (!verticalId) return nodes;
  return nodes.filter(
    (node) => !isVerticalHubNode(node) || node.verticalId === verticalId,
  );
}

export type NavFocusInput = {
  selectedVerticalId?: string;
  wardGeoId?: string;
  boothNo?: string;
  verticalSelectOpen?: boolean;
  wardSelectOpen?: boolean;
  boothSelectOpen?: boolean;
  /** When false, a lone vertical never triggers hub filtering. */
  multipleVerticals?: boolean;
};

/**
 * Vertical hub focus: hide other vertical cards when a specific vertical is
 * selected, or when ward/booth nav is active (including open dropdowns).
 */
export function resolveFocusVerticalId(input: NavFocusInput): string {
  const selectedVerticalId = input.selectedVerticalId?.trim() ?? '';
  const wardGeoId = input.wardGeoId?.trim() ?? '';
  const boothNo = input.boothNo?.trim() ?? '';

  if (
    boothNo ||
    input.boothSelectOpen ||
    wardGeoId ||
    input.wardSelectOpen
  ) {
    return selectedVerticalId;
  }

  if (!selectedVerticalId) return '';

  if (input.multipleVerticals === false) return '';

  if (input.verticalSelectOpen || input.multipleVerticals) {
    return selectedVerticalId;
  }

  return '';
}

/** Walk parent chain when legacy rows omit ward_geo_id on booth nodes. */
export function resolveEffectiveWardGeoId(
  node: CadreNodeDetail,
  byId: Map<string, CadreNodeDetail>,
): string | null {
  if (node.wardGeoId) return node.wardGeoId;
  let parentId = node.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    if (parent.wardGeoId) return parent.wardGeoId;
    parentId = parent.parentId;
  }
  return null;
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

export function nodeMatchesWardGeo(
  node: CadreNodeDetail,
  wardGeoId: string,
  byId?: Map<string, CadreNodeDetail>,
): boolean {
  const id = wardGeoId.trim();
  if (!id) return true;
  if (node.positionLevelKey === 'taluka' || isVerticalHubNode(node)) return true;
  const effectiveWard = byId ? resolveEffectiveWardGeoId(node, byId) : node.wardGeoId;
  return effectiveWard === id;
}

export function nodeMatchesBoothNo(node: CadreNodeDetail, boothNo: string): boolean {
  const b = boothNo.trim();
  if (!b) return true;
  if (!['booth', 'booth_committee', 'booth_group'].includes(node.positionLevelKey)) {
    return true;
  }
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

export function applyNavFilters(
  nodes: CadreNodeDetail[],
  nav: NavFilterState,
): SearchFilterResult {
  const focusVerticalId = nav.focusVerticalId?.trim() ?? '';
  const wardGeoId = nav.wardGeoId?.trim() ?? '';
  const boothNo = nav.boothNo?.trim() ?? '';
  const hasActiveFilter = Boolean(focusVerticalId || wardGeoId || boothNo);

  if (!hasActiveFilter) {
    return { nodes, matchIds: new Set(), hasActiveFilter: false };
  }

  if (!wardGeoId && !boothNo) {
    return {
      nodes: filterVerticalHubs(nodes, focusVerticalId),
      matchIds: new Set(),
      hasActiveFilter: true,
    };
  }

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const visible = new Map<string, CadreNodeDetail>();
  const matchIds = new Set<string>();

  for (const node of nodes) {
    if (isVerticalHubNode(node)) {
      if (focusVerticalId && node.verticalId !== focusVerticalId) continue;
      visible.set(node.id, node);
      continue;
    }
    if (node.positionLevelKey === 'taluka') continue;
    if (!nodeMatchesWardGeo(node, wardGeoId, byId)) continue;
    if (!nodeMatchesBoothNo(node, boothNo)) continue;
    visible.set(node.id, node);
  }

  includeAncestors(nodes, visible);

  if (boothNo) {
    const pruned = new Map<string, CadreNodeDetail>();
    for (const node of visible.values()) {
      if (node.positionLevelKey === 'booth_group' && node.boothNo !== boothNo) continue;
      if (node.positionLevelKey === 'booth' && node.boothNo !== boothNo) continue;
      if (node.positionLevelKey === 'booth_committee' && node.boothNo !== boothNo) continue;
      pruned.set(node.id, node);
    }
    includeAncestors(nodes, pruned);
    return {
      nodes: filterVerticalHubs([...pruned.values()], focusVerticalId),
      matchIds,
      hasActiveFilter: true,
    };
  }

  return {
    nodes: filterVerticalHubs([...visible.values()], focusVerticalId),
    matchIds,
    hasActiveFilter: true,
  };
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

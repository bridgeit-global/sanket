import { isVerticalHubNode } from './forest-builder';
import type { CadreNodeDetail } from './types';

export type CollapseResult = {
  nodes: CadreNodeDetail[];
  childCountById: Map<string, number>;
  hasChildrenById: Map<string, boolean>;
};

function buildChildrenMap(nodes: CadreNodeDetail[]): Map<string, CadreNodeDetail[]> {
  const children = new Map<string, CadreNodeDetail[]>();
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    if (!node.parentId || !nodeIds.has(node.parentId)) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  return children;
}

function computeChildCounts(
  nodes: CadreNodeDetail[],
  childrenByParent: Map<string, CadreNodeDetail[]>,
): { childCountById: Map<string, number>; hasChildrenById: Map<string, boolean> } {
  const childCountById = new Map<string, number>();
  const hasChildrenById = new Map<string, boolean>();

  for (const node of nodes) {
    const kids = childrenByParent.get(node.id) ?? [];
    childCountById.set(node.id, kids.length);
    hasChildrenById.set(node.id, kids.length > 0);
  }

  return { childCountById, hasChildrenById };
}

function isAncestorExpanded(
  node: CadreNodeDetail,
  byId: Map<string, CadreNodeDetail>,
  expandedIds: ReadonlySet<string>,
): boolean {
  let parentId = node.parentId;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent) break;
    if (!expandedIds.has(parentId)) return false;
    parentId = parent.parentId;
  }
  return true;
}

/**
 * Returns only nodes visible when ancestors are expanded.
 */
export function applyCollapse(
  nodes: CadreNodeDetail[],
  expandedIds: ReadonlySet<string>,
): CollapseResult {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildChildrenMap(nodes);
  const { childCountById, hasChildrenById } = computeChildCounts(nodes, childrenByParent);

  const visible = nodes.filter((node) => {
    if (!node.parentId) return true;
    if (!byId.has(node.parentId)) return true;
    return isAncestorExpanded(node, byId, expandedIds);
  });

  return { nodes: visible, childCountById, hasChildrenById };
}

export function defaultExpandedIds(
  nodes: CadreNodeDetail[],
  selectedVerticalId?: string,
): Set<string> {
  const expanded = new Set<string>();

  for (const node of nodes) {
    if (isVerticalHubNode(node)) {
      if (!selectedVerticalId || node.verticalId === selectedVerticalId) {
        expanded.add(node.id);
      }
    }
    if (node.positionLevelKey === 'taluka') {
      if (!selectedVerticalId || node.verticalId === selectedVerticalId) {
        expanded.add(node.id);
      }
    }
  }

  return expanded;
}

/** Returns ancestor ids from target up to (but not including) the root. */
export function expandPathTo(
  nodes: CadreNodeDetail[],
  targetId: string,
): Set<string> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path = new Set<string>();

  let current = byId.get(targetId);
  while (current?.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent) break;
    path.add(parent.id);
    current = parent;
  }

  return path;
}

export function findWardNodeId(
  nodes: CadreNodeDetail[],
  wardGeoId: string,
  verticalId?: string,
): string | null {
  const match = nodes.find(
    (n) =>
      n.positionLevelKey === 'ward' &&
      n.wardGeoId === wardGeoId &&
      (!verticalId || n.verticalId === verticalId),
  );
  return match?.id ?? null;
}

export function findBoothGroupId(
  nodes: CadreNodeDetail[],
  wardNodeId: string,
  boothNo: string,
): string | null {
  const id = `group:booth:${wardNodeId}:${boothNo}`;
  return nodes.some((n) => n.id === id) ? id : null;
}

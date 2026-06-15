import { hierarchy, tree, type HierarchyPointNode } from 'd3';
import type { CadreNodeDetail } from './types';

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 96;
export const COMPACT_NODE_WIDTH = 188;
export const COMPACT_NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 16;
const COMPACT_HORIZONTAL_GAP = 10;
const VERTICAL_GAP = 14;
const SIBLING_GRID_THRESHOLD = 5;
const SIBLING_GRID_COLS = 4;

type TreeDatum = {
  id: string;
  cadre: CadreNodeDetail | null;
  children: TreeDatum[];
};

export type LayoutNode = {
  id: string;
  cadre: CadreNodeDetail;
  x: number;
  y: number;
  parentId: string | null;
  width: number;
  height: number;
  compact: boolean;
};

export type LayoutLink = {
  id: string;
  sourceId: string;
  targetId: string;
};

export type D3TreeLayout = {
  nodes: LayoutNode[];
  links: LayoutLink[];
  width: number;
  height: number;
};

export function getLayoutNodeDimensions(node: Pick<LayoutNode, 'width' | 'height'>): {
  width: number;
  height: number;
} {
  return { width: node.width, height: node.height };
}

function positionSortOrder(cadre: CadreNodeDetail): number {
  return cadre.positionSortOrder ?? 999;
}

function compareByPositionOrder(a: CadreNodeDetail, b: CadreNodeDetail): number {
  const order = positionSortOrder(a) - positionSortOrder(b);
  if (order !== 0) return order;
  const nameA = a.personName ?? a.linkedVoter?.fullName ?? a.positionName;
  const nameB = b.personName ?? b.linkedVoter?.fullName ?? b.positionName;
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base' });
}

function buildTreeData(nodes: CadreNodeDetail[]): TreeDatum {
  const byId = new Map<string, TreeDatum>();

  for (const cadre of nodes) {
    byId.set(cadre.id, { id: cadre.id, cadre, children: [] });
  }

  const roots: TreeDatum[] = [];
  for (const cadre of nodes) {
    const item = byId.get(cadre.id);
    if (!item) continue;
    if (cadre.parentId && byId.has(cadre.parentId)) {
      const parent = byId.get(cadre.parentId);
      if (parent) parent.children.push(item);
    } else {
      roots.push(item);
    }
  }

  if (roots.length === 1) {
    return roots[0] ?? { id: '__virtual_root__', cadre: null, children: [] };
  }

  return {
    id: '__virtual_root__',
    cadre: null,
    children: roots,
  };
}

function flattenHierarchy(
  root: HierarchyPointNode<TreeDatum>,
): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  root.each((d: HierarchyPointNode<TreeDatum>) => {
    if (!d.data.cadre) return;

    const parent = d.parent?.data.cadre ? d.parent : null;
    nodes.push({
      id: d.data.id,
      cadre: d.data.cadre,
      x: d.x,
      y: d.y,
      parentId: parent?.data.id ?? null,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
      compact: false,
    });

    if (parent?.data.cadre) {
      links.push({
        id: `${parent.data.id}::${d.data.id}`,
        sourceId: parent.data.id,
        targetId: d.data.id,
      });
    }
  });

  return { nodes, links };
}

function groupChildrenBySortOrder(children: LayoutNode[]): LayoutNode[][] {
  const sorted = [...children].sort((a, b) => compareByPositionOrder(a.cadre, b.cadre));
  const groups: LayoutNode[][] = [];
  let currentOrder: number | null = null;
  let currentGroup: LayoutNode[] = [];

  for (const child of sorted) {
    const order = positionSortOrder(child.cadre);
    if (currentOrder !== null && order !== currentOrder) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentOrder = order;
    currentGroup.push(child);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

function subtreeBottom(
  rootId: string,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): number {
  const node = nodeById.get(rootId);
  if (!node) return 0;

  let max = node.y + node.height / 2;
  for (const child of childrenByParent.get(rootId) ?? []) {
    max = Math.max(max, subtreeBottom(child.id, childrenByParent, nodeById));
  }
  return max;
}

function shiftSubtree(
  rootId: string,
  deltaX: number,
  deltaY: number,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): void {
  const node = nodeById.get(rootId);
  if (!node) return;

  node.x += deltaX;
  node.y += deltaY;
  for (const child of childrenByParent.get(rootId) ?? []) {
    shiftSubtree(child.id, deltaX, deltaY, childrenByParent, nodeById);
  }
}

function buildChildrenMap(nodes: LayoutNode[]): Map<string, LayoutNode[]> {
  const childrenByParent = new Map<string, LayoutNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }
  return childrenByParent;
}

/**
 * Stacks sibling subtrees vertically by position sort order. Lower sortOrder
 * tiers stay on the D3 row; each higher tier is shifted below the prior tier's
 * full subtree height.
 */
function applySortOrderOffsets(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildChildrenMap(nodes);
  const queue = nodes.filter((n) => !n.parentId).map((n) => n.id);

  while (queue.length > 0) {
    const parentId = queue.shift();
    if (!parentId) continue;

    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) queue.push(child.id);

    if (children.length <= 1) continue;

    const groups = groupChildrenBySortOrder(children);
    if (groups.length <= 1) continue;

    let cursorBottom = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const groupTop = Math.min(...group.map((n) => n.y - n.height / 2));

      if (i > 0) {
        const rowGap = Math.max(...group.map((n) => n.height)) + VERTICAL_GAP;
        const shift = cursorBottom + rowGap - groupTop;
        if (shift > 0) {
          for (const node of group) {
            shiftSubtree(node.id, 0, shift, childrenByParent, nodeById);
          }
        }
      }

      cursorBottom = Math.max(
        ...group.map((n) => subtreeBottom(n.id, childrenByParent, nodeById)),
      );
    }
  }
}

/**
 * Wraps wide sibling rows into a compact multi-row grid when a single sort-order
 * tier has more than {@link SIBLING_GRID_THRESHOLD} nodes.
 */
function applySiblingGridLayout(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildChildrenMap(nodes);

  for (const children of childrenByParent.values()) {
    if (children.length <= SIBLING_GRID_THRESHOLD) continue;

    const groups = groupChildrenBySortOrder(children);
    for (const group of groups) {
      if (group.length <= SIBLING_GRID_THRESHOLD) continue;

      const sorted = [...group].sort((a, b) => a.x - b.x);
      const anchorY = sorted[0]?.y ?? 0;
      const minX = Math.min(...sorted.map((n) => n.x));
      const compact = true;
      const nodeWidth = compact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
      const nodeHeight = compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
      const colWidth = nodeWidth + COMPACT_HORIZONTAL_GAP;
      const rowGap = nodeHeight + VERTICAL_GAP;

      for (let i = 0; i < sorted.length; i++) {
        const node = sorted[i];
        if (!node) continue;
        const row = Math.floor(i / SIBLING_GRID_COLS);
        const col = i % SIBLING_GRID_COLS;
        const targetX = minX + col * colWidth;
        const targetY = anchorY + row * rowGap;
        const deltaX = targetX - node.x;
        const deltaY = targetY - node.y;

        node.compact = compact;
        node.width = nodeWidth;
        node.height = nodeHeight;

        if (deltaX !== 0 || deltaY !== 0) {
          shiftSubtree(node.id, deltaX, deltaY, childrenByParent, nodeById);
        }
      }
    }
  }
}

/**
 * After sibling grid reflow, D3 parent x still reflects the pre-grid span. Re-center
 * each parent horizontally over its children's bounding box.
 */
function repositionParentsOverChildren(nodes: LayoutNode[]): void {
  const childrenByParent = buildChildrenMap(nodes);
  const depthById = new Map<string, number>();

  function depth(id: string, nodeById: Map<string, LayoutNode>): number {
    const cached = depthById.get(id);
    if (cached !== undefined) return cached;
    const node = nodeById.get(id);
    if (!node) return 0;
    const d = node.parentId ? depth(node.parentId, nodeById) + 1 : 0;
    depthById.set(id, d);
    return d;
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) depth(node.id, nodeById);

  const byDepthDesc = [...nodes].sort(
    (a, b) => (depthById.get(b.id) ?? 0) - (depthById.get(a.id) ?? 0),
  );

  for (const node of byDepthDesc) {
    const children = childrenByParent.get(node.id) ?? [];
    if (children.length === 0) continue;

    const minX = Math.min(...children.map((c) => c.x - c.width / 2));
    const maxX = Math.max(...children.map((c) => c.x + c.width / 2));
    node.x = (minX + maxX) / 2;
  }
}

export function computeD3TreeLayout(nodes: CadreNodeDetail[]): D3TreeLayout {
  if (nodes.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 };
  }

  const rootData = buildTreeData(nodes);
  const root = hierarchy(rootData, (d: TreeDatum) => d.children);
  const layout = tree<TreeDatum>().nodeSize([
    NODE_WIDTH + HORIZONTAL_GAP,
    NODE_HEIGHT + VERTICAL_GAP,
  ]);
  const laidOut = layout(root) as HierarchyPointNode<TreeDatum>;

  const { nodes: layoutNodes, links } = flattenHierarchy(laidOut);
  applySortOrderOffsets(layoutNodes);
  applySiblingGridLayout(layoutNodes);
  repositionParentsOverChildren(layoutNodes);

  const lefts = layoutNodes.map((n) => n.x - n.width / 2);
  const rights = layoutNodes.map((n) => n.x + n.width / 2);
  const tops = layoutNodes.map((n) => n.y - n.height / 2);
  const bottoms = layoutNodes.map((n) => n.y + n.height / 2);

  return {
    nodes: layoutNodes,
    links,
    width: Math.max(...rights) - Math.min(...lefts),
    height: Math.max(...bottoms) - Math.min(...tops),
  };
}

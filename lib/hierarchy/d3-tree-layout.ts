import { hierarchy, tree, type HierarchyPointNode } from 'd3';
import type { CadreNodeDetail } from './types';

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 104;
const HORIZONTAL_GAP = 20;
const VERTICAL_GAP = 16;

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

  let max = node.y + NODE_HEIGHT / 2;
  for (const child of childrenByParent.get(rootId) ?? []) {
    max = Math.max(max, subtreeBottom(child.id, childrenByParent, nodeById));
  }
  return max;
}

function shiftSubtree(
  rootId: string,
  deltaY: number,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): void {
  const node = nodeById.get(rootId);
  if (!node) return;

  node.y += deltaY;
  for (const child of childrenByParent.get(rootId) ?? []) {
    shiftSubtree(child.id, deltaY, childrenByParent, nodeById);
  }
}

/**
 * Stacks sibling subtrees vertically by position sort order. Lower sortOrder
 * tiers stay on the D3 row; each higher tier is shifted below the prior tier's
 * full subtree height.
 */
function applySortOrderOffsets(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, LayoutNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  const rowGap = NODE_HEIGHT + VERTICAL_GAP;
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
      const groupTop = Math.min(...group.map((n) => n.y - NODE_HEIGHT / 2));

      if (i > 0) {
        const shift = cursorBottom + rowGap - groupTop;
        if (shift > 0) {
          for (const node of group) {
            shiftSubtree(node.id, shift, childrenByParent, nodeById);
          }
        }
      }

      cursorBottom = Math.max(
        ...group.map((n) => subtreeBottom(n.id, childrenByParent, nodeById)),
      );
    }
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

  const xs = layoutNodes.map((n) => n.x);
  const ys = layoutNodes.map((n) => n.y);
  const minX = Math.min(...xs) - NODE_WIDTH / 2;
  const maxX = Math.max(...xs) + NODE_WIDTH / 2;
  const minY = Math.min(...ys) - NODE_HEIGHT / 2;
  const maxY = Math.max(...ys) + NODE_HEIGHT / 2;

  return {
    nodes: layoutNodes,
    links,
    width: maxX - minX,
    height: maxY - minY,
  };
}

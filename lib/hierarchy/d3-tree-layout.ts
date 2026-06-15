import { hierarchy, tree, type HierarchyPointNode } from 'd3';
import type { CadreNodeDetail } from './types';

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 96;
export const COMPACT_NODE_WIDTH = 188;
export const COMPACT_NODE_HEIGHT = 80;
const HORIZONTAL_GAP = 16;
const COMPACT_HORIZONTAL_GAP = 12;
const VERTICAL_GAP = 14;
const SUBTREE_HORIZONTAL_GAP = 20;
const DEFAULT_GRID_THRESHOLD = 5;
const DEFAULT_GRID_COLS = 4;

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

type BoundingBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type GridConfig = {
  threshold: number;
  cols: number;
  compact: boolean;
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

/**
 * Ward/booth committee members must be laid out under their ward/booth adhyaksh.
 * Data sometimes parents them to taluka (or another ancestor), which makes D3
 * treat them as siblings of ward nodes and fan them across the canvas.
 */
function normalizeCommitteeParentage(nodes: CadreNodeDetail[]): CadreNodeDetail[] {
  if (nodes.length === 0) return nodes;

  const byId = new Map(nodes.map((n) => [n.id, n]));
  const wardParentByKey = new Map<string, string>();
  const boothParentByKey = new Map<string, string>();

  for (const node of nodes) {
    if (node.positionLevelKey === 'ward' && node.wardGeoId) {
      wardParentByKey.set(`${node.verticalId}:${node.wardGeoId}`, node.id);
    }
    if (node.positionLevelKey === 'booth' && node.wardGeoId && node.boothNo) {
      boothParentByKey.set(
        `${node.verticalId}:${node.wardGeoId}:${node.boothNo}`,
        node.id,
      );
    }
  }

  return nodes.map((node) => {
    if (node.positionLevelKey === 'ward_committee' && node.wardGeoId) {
      const expectedParentId = wardParentByKey.get(`${node.verticalId}:${node.wardGeoId}`);
      if (!expectedParentId) return node;

      const currentParent = node.parentId ? byId.get(node.parentId) : undefined;
      const alreadyUnderWard =
        currentParent?.positionLevelKey === 'ward' &&
        currentParent.wardGeoId === node.wardGeoId;

      if (!alreadyUnderWard && node.parentId !== expectedParentId) {
        return { ...node, parentId: expectedParentId };
      }
    }

    if (node.positionLevelKey === 'booth_committee' && node.wardGeoId && node.boothNo) {
      const expectedParentId = boothParentByKey.get(
        `${node.verticalId}:${node.wardGeoId}:${node.boothNo}`,
      );
      if (!expectedParentId) return node;

      const currentParent = node.parentId ? byId.get(node.parentId) : undefined;
      const alreadyUnderBooth =
        currentParent?.positionLevelKey === 'booth' &&
        currentParent.wardGeoId === node.wardGeoId &&
        currentParent.boothNo === node.boothNo;

      if (!alreadyUnderBooth && node.parentId !== expectedParentId) {
        return { ...node, parentId: expectedParentId };
      }
    }

    return node;
  });
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

function subtreeBoundingBox(
  rootId: string,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): BoundingBox {
  const node = nodeById.get(rootId);
  if (!node) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  let minX = node.x - node.width / 2;
  let maxX = node.x + node.width / 2;
  let minY = node.y - node.height / 2;
  let maxY = node.y + node.height / 2;

  for (const child of childrenByParent.get(rootId) ?? []) {
    const childBox = subtreeBoundingBox(child.id, childrenByParent, nodeById);
    minX = Math.min(minX, childBox.minX);
    maxX = Math.max(maxX, childBox.maxX);
    minY = Math.min(minY, childBox.minY);
    maxY = Math.max(maxY, childBox.maxY);
  }

  return { minX, maxX, minY, maxY };
}

function subtreeSize(
  rootId: string,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): { width: number; height: number } {
  const box = subtreeBoundingBox(rootId, childrenByParent, nodeById);
  return {
    width: Math.max(box.maxX - box.minX, nodeById.get(rootId)?.width ?? 0),
    height: Math.max(box.maxY - box.minY, nodeById.get(rootId)?.height ?? 0),
  };
}

function getChildGridConfig(children: LayoutNode[]): GridConfig {
  const levelKey = children[0]?.cadre.positionLevelKey ?? '';
  if (levelKey === 'ward_committee' || levelKey === 'booth_committee') {
    return { threshold: 1, cols: 3, compact: true };
  }
  if (levelKey === 'ward' || levelKey === 'booth') {
    return { threshold: 4, cols: 4, compact: true };
  }
  return { threshold: DEFAULT_GRID_THRESHOLD, cols: DEFAULT_GRID_COLS, compact: true };
}

function applyNodeSizing(node: LayoutNode, compact: boolean): void {
  node.compact = compact;
  node.width = compact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  node.height = compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
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

function groupAnchorTop(group: LayoutNode[]): number {
  return Math.min(...group.map((n) => n.y - n.height / 2));
}

function layoutHorizontalSiblingRow(
  parent: LayoutNode,
  group: LayoutNode[],
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
  compact: boolean,
): void {
  const nodeWidth = compact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  const nodeHeight = compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
  const rowTop = groupAnchorTop(group);
  const sizes = group.map((node) => {
    applyNodeSizing(node, compact);
    const measured = subtreeSize(node.id, childrenByParent, nodeById);
    return {
      width: Math.max(measured.width, nodeWidth),
      height: Math.max(measured.height, nodeHeight),
    };
  });

  const totalWidth =
    sizes.reduce((sum, size) => sum + size.width, 0) +
    Math.max(0, group.length - 1) * SUBTREE_HORIZONTAL_GAP;
  let cursorX = parent.x - totalWidth / 2;

  for (let i = 0; i < group.length; i++) {
    const node = group[i];
    if (!node) continue;
    const size = sizes[i];
    if (!size) continue;

    const targetX = cursorX + size.width / 2;
    const targetY = rowTop + size.height / 2;
    shiftSubtree(
      node.id,
      targetX - node.x,
      targetY - node.y,
      childrenByParent,
      nodeById,
    );
    cursorX += size.width + SUBTREE_HORIZONTAL_GAP;
  }
}

function layoutGridUnderParent(
  parent: LayoutNode,
  group: LayoutNode[],
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
  config: GridConfig,
): void {
  const compact = config.compact;
  const nodeWidth = compact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  const nodeHeight = compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
  const cols = config.cols;
  const sorted = [...group].sort((a, b) => compareByPositionOrder(a.cadre, b.cadre));
  const numRows = Math.ceil(sorted.length / cols);

  const assignments = sorted.map((node, index) => ({
    node,
    row: Math.floor(index / cols),
    col: index % cols,
  }));

  for (const { node } of assignments) {
    applyNodeSizing(node, compact);
  }

  const columnWidths = Array.from({ length: cols }, () => nodeWidth + COMPACT_HORIZONTAL_GAP);
  const rowHeights = Array.from({ length: numRows }, () => nodeHeight + VERTICAL_GAP);

  for (const { node, row, col } of assignments) {
    const size = subtreeSize(node.id, childrenByParent, nodeById);
    columnWidths[col] = Math.max(columnWidths[col], size.width);
    rowHeights[row] = Math.max(rowHeights[row], size.height);
  }

  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const startX = parent.x - totalWidth / 2;
  const startY = groupAnchorTop(group);

  for (const { node, row, col } of assignments) {
    let targetX = startX;
    for (let c = 0; c < col; c++) {
      targetX += columnWidths[c] ?? 0;
    }
    targetX += (columnWidths[col] ?? nodeWidth) / 2;

    let targetY = startY;
    for (let r = 0; r < row; r++) {
      targetY += rowHeights[r] ?? 0;
    }
    targetY += (rowHeights[row] ?? nodeHeight) / 2;

    shiftSubtree(
      node.id,
      targetX - node.x,
      targetY - node.y,
      childrenByParent,
      nodeById,
    );
  }
}

function layoutSingleChildUnderParent(
  parent: LayoutNode,
  child: LayoutNode,
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
  compact: boolean,
): void {
  applyNodeSizing(child, compact);
  const size = subtreeSize(child.id, childrenByParent, nodeById);
  const rowTop = groupAnchorTop([child]);
  const targetX = parent.x;
  const targetY = rowTop + Math.max(size.height, child.height) / 2;
  shiftSubtree(child.id, targetX - child.x, targetY - child.y, childrenByParent, nodeById);
}

/**
 * Bottom-up pass: each parent's children are laid out in a grid (or spaced row)
 * centered on the parent, with column widths derived from subtree bounds so
 * committee members stay under their ward parent without overlapping neighbors.
 */
function layoutChildrenUnderParents(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildChildrenMap(nodes);
  const depthById = new Map<string, number>();

  function depth(id: string): number {
    const cached = depthById.get(id);
    if (cached !== undefined) return cached;
    const node = nodeById.get(id);
    if (!node) return 0;
    const d = node.parentId ? depth(node.parentId) + 1 : 0;
    depthById.set(id, d);
    return d;
  }

  for (const node of nodes) depth(node.id);

  const parentIds = [...new Set(nodes.map((n) => n.parentId).filter(Boolean))] as string[];
  parentIds.sort((a, b) => depth(b) - depth(a));

  for (const parentId of parentIds) {
    const parent = nodeById.get(parentId);
    if (!parent) continue;

    const children = childrenByParent.get(parentId) ?? [];
    if (children.length === 0) continue;

    const groups = groupChildrenBySortOrder(children);

    for (const group of groups) {
      const config = getChildGridConfig(group);

      if (group.length === 1) {
        const only = group[0];
        if (!only) continue;
        layoutSingleChildUnderParent(parent, only, childrenByParent, nodeById, config.compact);
      } else if (group.length > config.threshold) {
        layoutGridUnderParent(parent, group, childrenByParent, nodeById, config);
      } else {
        layoutHorizontalSiblingRow(parent, group, childrenByParent, nodeById, config.compact);
      }
    }
  }
}

/**
 * Ensures adjacent sibling subtrees under the same parent do not overlap
 * horizontally after grid reflow. Skips committee member rows — those are
 * already in a compact grid and share columns across rows.
 */
function resolveSiblingSubtreeOverlaps(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildChildrenMap(nodes);

  for (let pass = 0; pass < 8; pass++) {
    let shifted = false;

    for (const [parentId, children] of childrenByParent) {
      if (children.length <= 1) continue;

      const parent = nodeById.get(parentId);
      const levelKey = parent?.cadre.positionLevelKey ?? '';
      if (levelKey === 'ward' || levelKey === 'booth') {
        const childLevel = children[0]?.cadre.positionLevelKey ?? '';
        if (childLevel === 'ward_committee' || childLevel === 'booth_committee') {
          continue;
        }
      }

      const sorted = [...children].sort((a, b) => a.x - b.x);
      for (let i = 1; i < sorted.length; i++) {
        const left = sorted[i - 1];
        const right = sorted[i];
        if (!left || !right) continue;

        const leftBox = subtreeBoundingBox(left.id, childrenByParent, nodeById);
        const rightBox = subtreeBoundingBox(right.id, childrenByParent, nodeById);
        const overlap = leftBox.maxX + SUBTREE_HORIZONTAL_GAP - rightBox.minX;
        if (overlap > 0) {
          shiftSubtree(right.id, overlap, 0, childrenByParent, nodeById);
          shifted = true;
        }
      }
    }

    if (!shifted) break;
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

  const normalizedNodes = normalizeCommitteeParentage(nodes);
  const rootData = buildTreeData(normalizedNodes);
  const root = hierarchy(rootData, (d: TreeDatum) => d.children);
  const layout = tree<TreeDatum>().nodeSize([
    NODE_WIDTH + HORIZONTAL_GAP,
    NODE_HEIGHT + VERTICAL_GAP,
  ]);
  const laidOut = layout(root) as HierarchyPointNode<TreeDatum>;

  const { nodes: layoutNodes, links } = flattenHierarchy(laidOut);
  applySortOrderOffsets(layoutNodes);
  layoutChildrenUnderParents(layoutNodes);
  repositionParentsOverChildren(layoutNodes);
  resolveSiblingSubtreeOverlaps(layoutNodes);
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

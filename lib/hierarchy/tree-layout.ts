import ELK from 'elkjs/lib/elk.bundled.js';
import { VERTICAL_LEVEL_KEY } from './forest-builder';
import { GROUP_LEVEL_KEYS } from './tree-builder';
import type { CadreNodeDetail } from './types';

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 96;
export const COMPACT_NODE_WIDTH = 188;
export const COMPACT_NODE_HEIGHT = 80;

const VIRTUAL_ROOT_ID = '__virtual_root__';
const COMPACT_HORIZONTAL_GAP = 12;
const VERTICAL_GAP = 14;
const SUBTREE_HORIZONTAL_GAP = 20;
const DEFAULT_GRID_THRESHOLD = 5;
const DEFAULT_GRID_COLS = 4;

const ELK_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.spacing.nodeNode': '24',
  'elk.layered.spacing.nodeNodeBetweenLayers': '48',
  'elk.layered.spacing.edgeNodeBetweenLayers': '32',
  'elk.layered.compaction.postCompaction.strategy': 'EDGE_LENGTH',
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

export type TreeLayout = {
  nodes: LayoutNode[];
  links: LayoutLink[];
  width: number;
  height: number;
};

type ElkChild = {
  id: string;
  width: number;
  height: number;
  children?: ElkChild[];
  x?: number;
  y?: number;
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
  skipOverlap: boolean;
};

const COMMITTEE_MEMBER_LEVELS = ['ward_committee', 'booth_committee'] as const;
const COMPACT_GEO_LEVELS = ['ward', 'booth'] as const;
const WARD_BRANCH_GROUP_LEVELS = ['ward_committee_group', 'booths_group'] as const;

type ChildLayoutRule = {
  parentLevelKeys: readonly string[];
  childLevelKeys?: readonly string[];
  threshold: number;
  cols: number;
  compact: boolean;
  skipOverlap: boolean;
};

/**
 * Parent/child layout rules for every expandable branch on the canvas.
 * First matching rule wins; keep specific rules before wildcards.
 */
const CHILD_LAYOUT_RULES: ChildLayoutRule[] = [
  {
    parentLevelKeys: [VERTICAL_LEVEL_KEY],
    childLevelKeys: ['taluka'],
    threshold: 4,
    cols: 4,
    compact: false,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['taluka'],
    childLevelKeys: COMPACT_GEO_LEVELS,
    threshold: 4,
    cols: 4,
    compact: true,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['ward'],
    childLevelKeys: WARD_BRANCH_GROUP_LEVELS,
    threshold: 4,
    cols: 2,
    compact: false,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['ward_committee_group'],
    childLevelKeys: COMMITTEE_MEMBER_LEVELS,
    threshold: 1,
    cols: 3,
    compact: true,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['booths_group'],
    childLevelKeys: ['booth_group'],
    threshold: 4,
    cols: 4,
    compact: true,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['booth_group'],
    childLevelKeys: [...COMPACT_GEO_LEVELS, ...COMMITTEE_MEMBER_LEVELS],
    threshold: 1,
    cols: 3,
    compact: true,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['*'],
    childLevelKeys: COMMITTEE_MEMBER_LEVELS,
    threshold: 1,
    cols: 3,
    compact: true,
    skipOverlap: true,
  },
  {
    parentLevelKeys: ['*'],
    childLevelKeys: COMPACT_GEO_LEVELS,
    threshold: 4,
    cols: 4,
    compact: true,
    skipOverlap: true,
  },
];

const DEFAULT_GRID_CONFIG: GridConfig = {
  threshold: DEFAULT_GRID_THRESHOLD,
  cols: DEFAULT_GRID_COLS,
  compact: true,
  skipOverlap: false,
};

function ruleMatches(
  rule: ChildLayoutRule,
  parentLevelKey: string,
  childLevelKey: string,
): boolean {
  const parentMatch =
    rule.parentLevelKeys.includes('*') || rule.parentLevelKeys.includes(parentLevelKey);
  if (!parentMatch) return false;
  if (!rule.childLevelKeys) return true;
  return rule.childLevelKeys.includes(childLevelKey);
}

function findChildLayoutRule(
  parentLevelKey: string,
  childLevelKey: string,
): ChildLayoutRule | null {
  for (const rule of CHILD_LAYOUT_RULES) {
    if (ruleMatches(rule, parentLevelKey, childLevelKey)) return rule;
  }
  return null;
}

function ruleToGridConfig(rule: ChildLayoutRule): GridConfig {
  return {
    threshold: rule.threshold,
    cols: rule.cols,
    compact: rule.compact,
    skipOverlap: rule.skipOverlap,
  };
}

const elk = new ELK();

export function getLayoutNodeDimensions(node: Pick<LayoutNode, 'width' | 'height'>): {
  width: number;
  height: number;
} {
  return { width: node.width, height: node.height };
}

export type LayoutBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

/** Axis-aligned bounds for layout nodes, optionally restricted to a subset of ids. */
export function getLayoutNodeBounds(
  nodes: LayoutNode[],
  ids?: Set<string>,
): LayoutBounds | null {
  const subset = ids && ids.size > 0 ? nodes.filter((n) => ids.has(n.id)) : nodes;
  if (subset.length === 0) return null;

  const lefts = subset.map((n) => n.x - n.width / 2);
  const rights = subset.map((n) => n.x + n.width / 2);
  const tops = subset.map((n) => n.y - n.height / 2);
  const bottoms = subset.map((n) => n.y + n.height / 2);

  return {
    minX: Math.min(...lefts),
    maxX: Math.max(...rights),
    minY: Math.min(...tops),
    maxY: Math.max(...bottoms),
  };
}

function displayName(cadre: CadreNodeDetail): string {
  return cadre.personName ?? cadre.linkedVoter?.fullName ?? cadre.positionName;
}

function compareByOrder(a: CadreNodeDetail, b: CadreNodeDetail): number {
  const levelOrder = (a.positionLevelSortOrder ?? 999) - (b.positionLevelSortOrder ?? 999);
  if (levelOrder !== 0) return levelOrder;

  const positionOrder = (a.positionSortOrder ?? 999) - (b.positionSortOrder ?? 999);
  if (positionOrder !== 0) return positionOrder;

  return displayName(a).localeCompare(displayName(b), undefined, { sensitivity: 'base' });
}

function sortOrderKey(cadre: CadreNodeDetail): string {
  return `${cadre.positionLevelSortOrder ?? 999}:${cadre.positionSortOrder ?? 999}`;
}

function isCompactLevel(levelKey: string): boolean {
  return (
    levelKey === 'ward_committee' ||
    levelKey === 'booth_committee' ||
    levelKey === 'ward' ||
    levelKey === 'booth'
  );
}

function getNodeDimensions(cadre: CadreNodeDetail): {
  width: number;
  height: number;
  compact: boolean;
} {
  const compact = isCompactLevel(cadre.positionLevelKey);
  return {
    width: compact ? COMPACT_NODE_WIDTH : NODE_WIDTH,
    height: compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT,
    compact,
  };
}

function buildCadreChildrenMap(nodes: CadreNodeDetail[]): Map<string, CadreNodeDetail[]> {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = new Map<string, CadreNodeDetail[]>();

  for (const node of nodes) {
    if (!node.parentId || !byId.has(node.parentId)) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  for (const [parentId, children] of childrenByParent) {
    children.sort(compareByOrder);
    childrenByParent.set(parentId, children);
  }

  return childrenByParent;
}

function buildLayoutChildrenMap(nodes: LayoutNode[]): Map<string, LayoutNode[]> {
  const childrenByParent = new Map<string, LayoutNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const list = childrenByParent.get(node.parentId) ?? [];
    list.push(node);
    childrenByParent.set(node.parentId, list);
  }

  for (const [parentId, children] of childrenByParent) {
    children.sort((a, b) => compareByOrder(a.cadre, b.cadre));
    childrenByParent.set(parentId, children);
  }

  return childrenByParent;
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
  const node = nodeById.get(rootId);
  return {
    width: Math.max(box.maxX - box.minX, node?.width ?? 0),
    height: Math.max(box.maxY - box.minY, node?.height ?? 0),
  };
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

function groupChildrenBySortOrder(children: LayoutNode[]): LayoutNode[][] {
  const sorted = [...children].sort((a, b) => compareByOrder(a.cadre, b.cadre));
  const groups: LayoutNode[][] = [];
  let currentKey: string | null = null;
  let currentGroup: LayoutNode[] = [];

  for (const child of sorted) {
    const key = sortOrderKey(child.cadre);
    if (currentKey !== null && key !== currentKey) {
      groups.push(currentGroup);
      currentGroup = [];
    }
    currentKey = key;
    currentGroup.push(child);
  }
  if (currentGroup.length > 0) groups.push(currentGroup);
  return groups;
}

/** True when every child is covered by the same explicit layout rule (grid/row). */
function childrenShareUnifiedLayout(
  parentLevelKey: string,
  children: LayoutNode[],
): boolean {
  if (children.length <= 1) return true;

  const firstKey = children[0]?.cadre.positionLevelKey ?? '';
  const rule = findChildLayoutRule(parentLevelKey, firstKey);
  if (!rule) return false;
  const allowedChildKeys = rule.childLevelKeys;
  if (!allowedChildKeys) return true;

  return children.every((child) => allowedChildKeys.includes(child.cadre.positionLevelKey));
}

/**
 * Children that share a layout rule are positioned together (grid/row).
 * Heterogeneous siblings are split by sort-order tier and stacked vertically.
 */
function getLayoutGroups(parent: LayoutNode, children: LayoutNode[]): LayoutNode[][] {
  if (children.length <= 1) return [children];
  if (childrenShareUnifiedLayout(parent.cadre.positionLevelKey, children)) {
    return [[...children].sort((a, b) => compareByOrder(a.cadre, b.cadre))];
  }
  return groupChildrenBySortOrder(children);
}

function applyNodeSizing(node: LayoutNode, compact: boolean): void {
  node.compact = compact;
  node.width = compact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
  node.height = compact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
}

function getChildGridConfig(parent: LayoutNode, children: LayoutNode[]): GridConfig {
  const childLevelKey = children[0]?.cadre.positionLevelKey ?? '';
  const parentLevelKey = parent.cadre.positionLevelKey;
  const rule = findChildLayoutRule(parentLevelKey, childLevelKey);
  if (rule) return ruleToGridConfig(rule);

  if ((GROUP_LEVEL_KEYS as readonly string[]).includes(parentLevelKey)) {
    return { threshold: 1, cols: 3, compact: true, skipOverlap: true };
  }

  return DEFAULT_GRID_CONFIG;
}

function compareSiblingLayoutOrder(a: LayoutNode, b: LayoutNode): number {
  const order = compareByOrder(a.cadre, b.cadre);
  if (order !== 0) return order;
  return a.x - b.x;
}

function groupAnchorTop(group: LayoutNode[]): number {
  return Math.min(...group.map((n) => n.y - n.height / 2));
}

function minRowTopBelowParent(parent: LayoutNode, group: LayoutNode[]): number {
  const parentBottom = parent.y + parent.height / 2;
  return Math.max(parentBottom + VERTICAL_GAP, groupAnchorTop(group));
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
  const rowTop = minRowTopBelowParent(parent, group);
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
  const sorted = [...group].sort((a, b) => compareByOrder(a.cadre, b.cadre));
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
  const startY = minRowTopBelowParent(parent, group);

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
  const rowTop = minRowTopBelowParent(parent, [child]);
  const targetX = parent.x;
  const targetY = rowTop + Math.max(size.height, child.height) / 2;
  shiftSubtree(child.id, targetX - child.x, targetY - child.y, childrenByParent, nodeById);
}

function layoutGroupUnderParent(
  parent: LayoutNode,
  group: LayoutNode[],
  childrenByParent: Map<string, LayoutNode[]>,
  nodeById: Map<string, LayoutNode>,
): void {
  if (group.length === 0) return;

  const config = getChildGridConfig(parent, group);

  if (group.length === 1) {
    const only = group[0];
    if (!only) return;
    layoutSingleChildUnderParent(parent, only, childrenByParent, nodeById, config.compact);
  } else if (group.length > config.threshold) {
    layoutGridUnderParent(parent, group, childrenByParent, nodeById, config);
  } else {
    layoutHorizontalSiblingRow(parent, group, childrenByParent, nodeById, config.compact);
  }
}

function layoutChildrenUnderParents(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildLayoutChildrenMap(nodes);
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

    const layoutGroups = getLayoutGroups(parent, children);
    let tierCursorBottom = Number.NEGATIVE_INFINITY;

    for (let gi = 0; gi < layoutGroups.length; gi++) {
      const group = layoutGroups[gi];
      if (!group || group.length === 0) continue;

      layoutGroupUnderParent(parent, group, childrenByParent, nodeById);

      if (gi > 0) {
        const groupTop = Math.min(
          ...group.map((n) => subtreeBoundingBox(n.id, childrenByParent, nodeById).minY),
        );
        const shift = tierCursorBottom + VERTICAL_GAP - groupTop;
        if (shift > 0) {
          for (const node of group) {
            shiftSubtree(node.id, 0, shift, childrenByParent, nodeById);
          }
        }
      }

      tierCursorBottom = Math.max(
        ...group.map((n) => subtreeBottom(n.id, childrenByParent, nodeById)),
      );
    }
  }
}

function boxesOverlap(a: BoundingBox, b: BoundingBox, gap: number): boolean {
  return (
    a.minX < b.maxX + gap &&
    a.maxX + gap > b.minX &&
    a.minY < b.maxY + gap &&
    a.maxY + gap > b.minY
  );
}

function resolveSiblingSubtreeOverlaps(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildLayoutChildrenMap(nodes);

  for (let pass = 0; pass < 12; pass++) {
    let shifted = false;

    for (const [, children] of childrenByParent) {
      if (children.length <= 1) continue;

      const sorted = [...children].sort(compareSiblingLayoutOrder);
      for (let i = 1; i < sorted.length; i++) {
        const left = sorted[i - 1];
        const right = sorted[i];
        if (!left || !right) continue;

        const leftBox = subtreeBoundingBox(left.id, childrenByParent, nodeById);
        const rightBox = subtreeBoundingBox(right.id, childrenByParent, nodeById);

        const hOverlap = leftBox.maxX + SUBTREE_HORIZONTAL_GAP - rightBox.minX;
        if (hOverlap > 0) {
          shiftSubtree(right.id, hOverlap, 0, childrenByParent, nodeById);
          shifted = true;
        }

        const leftBox2 = subtreeBoundingBox(left.id, childrenByParent, nodeById);
        const rightBox2 = subtreeBoundingBox(right.id, childrenByParent, nodeById);
        if (boxesOverlap(leftBox2, rightBox2, VERTICAL_GAP)) {
          const vOverlap = leftBox2.maxY + VERTICAL_GAP - rightBox2.minY;
          if (vOverlap > 0) {
            shiftSubtree(right.id, 0, vOverlap, childrenByParent, nodeById);
            shifted = true;
          }
        }
      }
    }

    if (!shifted) break;
  }
}

/** Final pass: push apart any remaining sibling subtree bounding-box overlaps. */
function resolveGlobalSubtreeOverlaps(nodes: LayoutNode[]): void {
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildLayoutChildrenMap(nodes);

  for (let pass = 0; pass < 16; pass++) {
    let shifted = false;

    for (const [, children] of childrenByParent) {
      if (children.length <= 1) continue;

      const sorted = [...children].sort(compareSiblingLayoutOrder);
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const a = sorted[i];
          const b = sorted[j];
          if (!a || !b) continue;

          const boxA = subtreeBoundingBox(a.id, childrenByParent, nodeById);
          const boxB = subtreeBoundingBox(b.id, childrenByParent, nodeById);
          if (!boxesOverlap(boxA, boxB, SUBTREE_HORIZONTAL_GAP)) continue;

          const shiftX = boxA.maxX + SUBTREE_HORIZONTAL_GAP - boxB.minX;
          const shiftY = boxA.maxY + VERTICAL_GAP - boxB.minY;

          if (shiftX > 0) {
            shiftSubtree(b.id, shiftX, 0, childrenByParent, nodeById);
            shifted = true;
          } else if (shiftY > 0) {
            shiftSubtree(b.id, 0, shiftY, childrenByParent, nodeById);
            shifted = true;
          }
        }
      }
    }

    if (!shifted) break;
  }
}

function repositionParentsOverChildren(nodes: LayoutNode[]): void {
  const childrenByParent = buildLayoutChildrenMap(nodes);
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

function applyPostElkLayout(nodes: LayoutNode[]): void {
  layoutChildrenUnderParents(nodes);
  repositionParentsOverChildren(nodes);
  resolveSiblingSubtreeOverlaps(nodes);
  repositionParentsOverChildren(nodes);
  resolveGlobalSubtreeOverlaps(nodes);
  repositionParentsOverChildren(nodes);
}

function toElkChild(
  cadre: CadreNodeDetail,
  childrenByParent: Map<string, CadreNodeDetail[]>,
): ElkChild {
  const { width, height } = getNodeDimensions(cadre);
  const children = (childrenByParent.get(cadre.id) ?? []).map((child) =>
    toElkChild(child, childrenByParent),
  );

  return {
    id: cadre.id,
    width,
    height,
    ...(children.length > 0 ? { children } : {}),
  };
}

function buildElkGraph(nodes: CadreNodeDetail[]): ElkChild {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenByParent = buildCadreChildrenMap(nodes);
  const roots = nodes
    .filter((n) => !n.parentId || !byId.has(n.parentId))
    .sort(compareByOrder)
    .map((cadre) => toElkChild(cadre, childrenByParent));

  return {
    id: VIRTUAL_ROOT_ID,
    width: 0,
    height: 0,
    children: roots,
  };
}

function extractLayout(
  elkRoot: ElkChild,
  cadreById: Map<string, CadreNodeDetail>,
): { nodes: LayoutNode[]; links: LayoutLink[] } {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  function walk(elkNode: ElkChild, parentId: string | null): void {
    if (elkNode.id === VIRTUAL_ROOT_ID) {
      for (const child of elkNode.children ?? []) {
        walk(child, null);
      }
      return;
    }

    const cadre = cadreById.get(elkNode.id);
    if (!cadre) return;

    const { width, height, compact } = getNodeDimensions(cadre);
    const left = elkNode.x ?? 0;
    const top = elkNode.y ?? 0;

    nodes.push({
      id: elkNode.id,
      cadre,
      x: left + width / 2,
      y: top + height / 2,
      parentId,
      width,
      height,
      compact,
    });

    for (const child of elkNode.children ?? []) {
      links.push({
        id: `${elkNode.id}::${child.id}`,
        sourceId: elkNode.id,
        targetId: child.id,
      });
      walk(child, elkNode.id);
    }
  }

  walk(elkRoot, null);
  return { nodes, links };
}

function measureLayoutExtent(nodes: LayoutNode[]): { width: number; height: number } {
  const lefts = nodes.map((n) => n.x - n.width / 2);
  const rights = nodes.map((n) => n.x + n.width / 2);
  const tops = nodes.map((n) => n.y - n.height / 2);
  const bottoms = nodes.map((n) => n.y + n.height / 2);

  return {
    width: Math.max(...rights) - Math.min(...lefts),
    height: Math.max(...bottoms) - Math.min(...tops),
  };
}

export async function computeTreeLayout(nodes: CadreNodeDetail[]): Promise<TreeLayout> {
  if (nodes.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 };
  }

  const cadreById = new Map(nodes.map((n) => [n.id, n]));
  const elkGraph = buildElkGraph(nodes);
  const layouted = (await elk.layout({
    id: elkGraph.id,
    layoutOptions: ELK_LAYOUT_OPTIONS,
    children: elkGraph.children,
  })) as unknown as ElkChild;

  const { nodes: layoutNodes, links } = extractLayout(layouted, cadreById);

  if (layoutNodes.length === 0) {
    return { nodes: [], links: [], width: 0, height: 0 };
  }

  applyPostElkLayout(layoutNodes);
  const { width, height } = measureLayoutExtent(layoutNodes);

  return {
    nodes: layoutNodes,
    links,
    width,
    height,
  };
}

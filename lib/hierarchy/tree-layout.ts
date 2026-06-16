import ELK from 'elkjs/lib/elk.bundled.js';
import type { CadreNodeDetail } from './types';

export const NODE_WIDTH = 228;
export const NODE_HEIGHT = 96;
export const COMPACT_NODE_WIDTH = 188;
export const COMPACT_NODE_HEIGHT = 80;

const VIRTUAL_ROOT_ID = '__virtual_root__';

const ELK_LAYOUT_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'DOWN',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  'elk.spacing.nodeNode': '24',
  'elk.layered.spacing.nodeNodeBetweenLayers': '48',
  'elk.layered.spacing.edgeNodeBetweenLayers': '32',
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

function buildChildrenMap(nodes: CadreNodeDetail[]): Map<string, CadreNodeDetail[]> {
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
  const childrenByParent = buildChildrenMap(nodes);
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

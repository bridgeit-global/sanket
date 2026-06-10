import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';
import type { CadreNodeDetail } from './types';

const LEVEL_COLORS: Record<string, string> = {
  state: '#1e40af',
  regional: '#0369a1',
  district: '#0d9488',
  assembly: '#059669',
  taluka: '#65a30d',
  ward: '#ca8a04',
  booth: '#c2410c',
};

export function getLevelColor(levelKey: string): string {
  return LEVEL_COLORS[levelKey] ?? '#64748b';
}

export type CadreFlowNode = Node<{
  cadre: CadreNodeDetail;
  color: string;
}>;

export function buildFlowGraph(
  nodes: CadreNodeDetail[],
): { nodes: CadreFlowNode[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });

  for (const n of nodes) {
    g.setNode(n.id, { width: 220, height: 90 });
  }

  const edges: Edge[] = [];
  for (const n of nodes) {
    if (n.parentId && nodes.some((p) => p.id === n.parentId)) {
      g.setEdge(n.parentId, n.id);
      edges.push({
        id: `${n.parentId}-${n.id}`,
        source: n.parentId,
        target: n.id,
        type: 'smoothstep',
      });
    }
  }

  dagre.layout(g);

  const flowNodes: CadreFlowNode[] = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'cadreNode',
      position: { x: pos.x - 110, y: pos.y - 45 },
      data: {
        cadre: n,
        color: getLevelColor(n.positionLevelKey),
      },
    };
  });

  return { nodes: flowNodes, edges };
}

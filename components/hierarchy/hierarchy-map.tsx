'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CadreNodeCard } from './hierarchy-node-card';
import { HierarchyNodeDetail } from './hierarchy-node-detail';
import { buildFlowGraph } from '@/lib/hierarchy/build-tree';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const nodeTypes = { cadreNode: CadreNodeCard as React.ComponentType<NodeProps> };

interface HierarchyMapProps {
  nodes: CadreNodeDetail[];
  isAdmin: boolean;
  onEdit: (node: CadreNodeDetail) => void;
  onAddSubordinate: (parent: CadreNodeDetail) => void;
}

export function HierarchyMap({
  nodes: cadreNodes,
  isAdmin,
  onEdit,
  onAddSubordinate,
}: HierarchyMapProps) {
  const [selected, setSelected] = useState<CadreNodeDetail | null>(null);
  const graph = useMemo(() => buildFlowGraph(cadreNodes), [cadreNodes]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      const cadre = (node.data as { cadre: CadreNodeDetail }).cadre;
      setSelected(cadre);
    },
    [],
  );

  return (
    <div className="relative h-[70vh] w-full rounded-lg border bg-muted/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
      {selected && (
        <div className="absolute top-4 right-4 z-10">
          <HierarchyNodeDetail
            node={selected}
            isAdmin={isAdmin}
            onClose={() => setSelected(null)}
            onEdit={() => onEdit(selected)}
            onAddSubordinate={() => onAddSubordinate(selected)}
          />
        </div>
      )}
    </div>
  );
}

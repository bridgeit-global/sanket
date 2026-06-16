'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HierarchyNodeCardContent } from './hierarchy-node-card-content';
import { computeTreeLayout } from '@/lib/hierarchy/tree-layout';
import type { LayoutLink, LayoutNode } from '@/lib/hierarchy/tree-layout';
import { MAP_MIN_FIT_SCALE } from '@/lib/hierarchy/map-filters';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import { isVerticalHubNode, type VerticalHubStats } from '@/lib/hierarchy/forest-builder';
import { isPlaceholderNode } from '@/lib/hierarchy/vacant-slots';
import { isGroupNode } from '@/lib/hierarchy/tree-builder';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const GRAPH_MARGIN = 24;
const PADDING = 48;
const FOCUSED_PADDING = 24;
const MIN_MANUAL_ZOOM = 0.12;
const LARGE_TREE_NODE_THRESHOLD = 80;
const FOCUSED_MIN_SCALE = 0.72;
const FOCUSED_MAX_SCALE = 2;
const LARGE_TREE_MAX_FIT_SCALE = 1.2;

type HierarchyNodeData = {
  cadre: CadreNodeDetail;
  color: string;
  compact: boolean;
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
  expanded: boolean;
  hubStats?: VerticalHubStats;
  expandable: boolean;
  childCount: number;
  onToggleExpand?: () => void;
  onClick: () => void;
  onEdit?: () => void;
  onAddChild?: () => void;
};

type HierarchyFlowNodeType = Node<HierarchyNodeData, 'hierarchyCard'>;

interface HierarchyFlowTreeProps {
  nodes: CadreNodeDetail[];
  matchIds: Set<string>;
  hasActiveSearchFilter: boolean;
  focusNodeId?: string | null;
  fitBoundsNodeIds?: Set<string>;
  selectedId: string | null;
  expandedVerticalIds: ReadonlySet<string>;
  expandedIds: ReadonlySet<string>;
  childCountById: Map<string, number>;
  hasChildrenById: Map<string, boolean>;
  onToggleExpand: (nodeId: string) => void;
  hubStats: Map<string, VerticalHubStats>;
  onNodeClick: (node: CadreNodeDetail) => void;
  onHubToggle: (verticalId: string) => void;
  onEditNode?: (node: CadreNodeDetail) => void;
  onAddChild?: (node: CadreNodeDetail) => void;
}

function normalizeLayout(nodes: LayoutNode[]): LayoutNode[] {
  if (nodes.length === 0) return [];
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2));
  return nodes.map((n) => ({
    ...n,
    x: n.x - minX + n.width / 2 + GRAPH_MARGIN,
    y: n.y - minY + n.height / 2 + GRAPH_MARGIN,
  }));
}

const HierarchyFlowNode = memo(function HierarchyFlowNode({
  data,
}: NodeProps<HierarchyFlowNodeType>) {
  return (
    <div
      className="nodrag nopan relative"
      style={{ width: data.compact ? 188 : 228 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-0 !bg-transparent !opacity-0"
        style={{ pointerEvents: 'none' }}
      />
      <HierarchyNodeCardContent
        cadre={data.cadre}
        color={data.color}
        compact={data.compact}
        selected={data.selected}
        dimmed={data.dimmed}
        highlighted={data.highlighted}
        expanded={data.expanded}
        hubStats={data.hubStats}
        expandable={data.expandable}
        childCount={data.childCount}
        onToggleExpand={data.onToggleExpand}
        onClick={data.onClick}
        onEdit={data.onEdit}
        onAddChild={data.onAddChild}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-0 !bg-transparent !opacity-0"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
});

const nodeTypes = { hierarchyCard: HierarchyFlowNode };

function HierarchyFlowTreeInner({
  nodes: cadreNodes,
  matchIds,
  hasActiveSearchFilter,
  focusNodeId,
  fitBoundsNodeIds,
  selectedId,
  expandedVerticalIds,
  expandedIds,
  childCountById,
  hasChildrenById,
  onToggleExpand,
  hubStats,
  onNodeClick,
  onHubToggle,
  onEditNode,
  onAddChild,
}: HierarchyFlowTreeProps) {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([]);
  const [layoutLinks, setLayoutLinks] = useState<LayoutLink[]>([]);
  const [layoutReady, setLayoutReady] = useState(false);
  const layoutVersionRef = useRef(0);

  useEffect(() => {
    const version = layoutVersionRef.current + 1;
    layoutVersionRef.current = version;
    setLayoutReady(false);

    if (cadreNodes.length === 0) {
      setLayoutNodes([]);
      setLayoutLinks([]);
      setLayoutReady(true);
      return;
    }

    void computeTreeLayout(cadreNodes).then((layout) => {
      if (layoutVersionRef.current !== version) return;
      setLayoutNodes(normalizeLayout(layout.nodes));
      setLayoutLinks(layout.links);
      setLayoutReady(true);
    });
  }, [cadreNodes]);

  const positionedNodes = layoutNodes;

  const flowNodes = useMemo((): HierarchyFlowNodeType[] => {
    return positionedNodes.map((node) => {
      const isHub = isVerticalHubNode(node.cadre);
      const isGroup = isGroupNode(node.cadre);
      const isMatch = matchIds.has(node.id);
      const dimmed = hasActiveSearchFilter && matchIds.size > 0 && !isMatch;
      const hasChildren = hasChildrenById.get(node.id) ?? false;
      const isExpanded = expandedIds.has(node.id);
      const childCount = childCountById.get(node.id) ?? 0;

      return {
        id: node.id,
        type: 'hierarchyCard',
        position: {
          x: node.x - node.width / 2,
          y: node.y - node.height / 2,
        },
        width: node.width,
        height: node.height,
        draggable: false,
        selectable: false,
        connectable: false,
        data: {
          cadre: node.cadre,
          color: getLevelColor(node.cadre.positionLevelKey),
          compact: node.compact,
          selected: selectedId === node.id,
          dimmed,
          highlighted: isMatch,
          expanded: isHub ? expandedVerticalIds.has(node.cadre.verticalId) : isExpanded,
          hubStats: isHub ? hubStats.get(node.cadre.verticalId) : undefined,
          expandable: hasChildren && !isHub && !isGroup,
          childCount,
          onToggleExpand: hasChildren ? () => onToggleExpand(node.id) : undefined,
          onClick: () => {
            if (isHub) {
              onHubToggle(node.cadre.verticalId);
            } else if (isGroup) {
              onToggleExpand(node.id);
            } else {
              onNodeClick(node.cadre);
            }
          },
          onEdit:
            onEditNode && !isPlaceholderNode(node.cadre)
              ? () => onEditNode(node.cadre)
              : undefined,
          onAddChild:
            !isHub && onAddChild && !isPlaceholderNode(node.cadre)
              ? () => onAddChild(node.cadre)
              : undefined,
        },
      };
    });
  }, [
    positionedNodes,
    matchIds,
    hasActiveSearchFilter,
    selectedId,
    expandedVerticalIds,
    expandedIds,
    childCountById,
    hasChildrenById,
    hubStats,
    onToggleExpand,
    onNodeClick,
    onHubToggle,
    onEditNode,
    onAddChild,
  ]);

  const flowEdges = useMemo((): Edge[] => {
    return layoutLinks.map((link) => ({
      id: link.id,
      source: link.sourceId,
      target: link.targetId,
      type: 'smoothstep',
      style: {
        stroke: 'hsl(var(--border))',
        strokeWidth: 1.25,
        strokeOpacity: 0.55,
      },
    }));
  }, [layoutLinks]);

  const resolveFocusIds = useCallback((): Set<string> | undefined => {
    if (focusNodeId) return new Set([focusNodeId]);
    if (hasActiveSearchFilter && matchIds.size > 0) return matchIds;
    if (fitBoundsNodeIds && fitBoundsNodeIds.size > 0) return fitBoundsNodeIds;
    return undefined;
  }, [focusNodeId, hasActiveSearchFilter, matchIds, fitBoundsNodeIds]);

  const fitToBounds = useCallback(
    (ids?: Set<string>, animate = false) => {
      if (!layoutReady || positionedNodes.length === 0) return;

      const isFocusedFit = Boolean(ids && ids.size > 0);
      const isLargeTree = positionedNodes.length > LARGE_TREE_NODE_THRESHOLD;
      const minZoom = isFocusedFit
        ? FOCUSED_MIN_SCALE
        : isLargeTree
          ? MAP_MIN_FIT_SCALE
          : MIN_MANUAL_ZOOM;
      const maxZoom = isFocusedFit
        ? FOCUSED_MAX_SCALE
        : isLargeTree
          ? LARGE_TREE_MAX_FIT_SCALE
          : 1.5;
      const padding = isFocusedFit ? FOCUSED_PADDING : PADDING;

      void fitView({
        nodes: ids && ids.size > 0 ? [...ids].map((id) => ({ id })) : undefined,
        padding,
        minZoom,
        maxZoom,
        duration: animate ? 400 : 0,
      });
    },
    [fitView, layoutReady, positionedNodes.length],
  );

  useEffect(() => {
    if (!layoutReady || cadreNodes.length === 0) return;
    requestAnimationFrame(() => fitToBounds(resolveFocusIds(), Boolean(focusNodeId)));
  }, [layoutReady, cadreNodes, resolveFocusIds, focusNodeId, fitToBounds]);

  const handleZoomIn = () => {
    void zoomIn({ duration: 200 });
  };

  const handleZoomOut = () => {
    void zoomOut({ duration: 200 });
  };

  const handleFitView = () => {
    fitToBounds(resolveFocusIds(), true);
  };

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: HierarchyFlowNodeType) => {
      node.data.onClick?.();
    },
    [],
  );

  return (
    <div className="relative size-full overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted/20 via-background to-muted/30">
      {cadreNodes.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-muted-foreground">No nodes match the current filters</p>
          <p className="text-xs text-muted-foreground/80">
            Try a different ward, booth, or search term.
          </p>
        </div>
      ) : (
        <>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            minZoom={MIN_MANUAL_ZOOM}
            maxZoom={2.5}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={[1, 2]}
            panOnScroll
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            onNodeClick={handleNodeClick}
            proOptions={{ hideAttribution: true }}
            className="bg-transparent"
          >
            <Background
              variant={BackgroundVariant.Lines}
              gap={24}
              size={1}
              color="hsl(var(--border))"
              style={{ opacity: 0.35 }}
            />
          </ReactFlow>

          <div className="absolute bottom-3 right-3 z-10 flex gap-0.5 rounded-lg border border-border/60 bg-card/90 p-0.5 shadow-sm backdrop-blur-sm md:left-3 md:right-auto">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleZoomIn}
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleZoomOut}
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={handleFitView}
              aria-label="Fit view"
            >
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export function HierarchyFlowTree(props: HierarchyFlowTreeProps) {
  return (
    <ReactFlowProvider>
      <HierarchyFlowTreeInner {...props} />
    </ReactFlowProvider>
  );
}

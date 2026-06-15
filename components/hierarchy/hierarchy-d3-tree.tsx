'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zoom, zoomIdentity, select, type ZoomBehavior, type D3ZoomEvent } from 'd3';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HierarchyNodeCardContent } from './hierarchy-node-card-content';
import {
  computeD3TreeLayout,
  NODE_HEIGHT,
  NODE_WIDTH,
  type LayoutNode,
} from '@/lib/hierarchy/d3-tree-layout';
import { MAP_MIN_FIT_SCALE } from '@/lib/hierarchy/map-filters';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import {
  isVerticalHubNode,
  type VerticalHubStats,
} from '@/lib/hierarchy/forest-builder';
import { isPlaceholderNode } from '@/lib/hierarchy/vacant-slots';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const PADDING = 40;
const FOCUSED_PADDING = 20;
const MIN_MANUAL_ZOOM = 0.12;
const LARGE_TREE_NODE_THRESHOLD = 80;
const FOCUSED_MIN_SCALE = 0.72;
const FOCUSED_MAX_SCALE = 2;

type PositionedNode = {
  id: string;
  cadre: CadreNodeDetail;
  x: number;
  y: number;
  width: number;
  height: number;
  compact: boolean;
};

interface HierarchyD3TreeProps {
  nodes: CadreNodeDetail[];
  matchIds: Set<string>;
  hasActiveSearchFilter: boolean;
  /** When set, zoom to this node (nav member selection). */
  focusNodeId?: string | null;
  /** Subset of nodes to fit (e.g. ward-scoped); defaults to all visible nodes. */
  fitBoundsNodeIds?: Set<string>;
  selectedId: string | null;
  expandedVerticalIds: ReadonlySet<string>;
  hubStats: Map<string, VerticalHubStats>;
  onNodeClick: (node: CadreNodeDetail) => void;
  onHubToggle: (verticalId: string) => void;
  /** Admin-only inline card actions. */
  onEditNode?: (node: CadreNodeDetail) => void;
  onAddChild?: (node: CadreNodeDetail) => void;
}

function normalizeLayout(nodes: LayoutNode[]): PositionedNode[] {
  if (nodes.length === 0) return [];
  const minX = Math.min(...nodes.map((n) => n.x - n.width / 2));
  const minY = Math.min(...nodes.map((n) => n.y - n.height / 2));
  return nodes.map((n) => ({
    id: n.id,
    cadre: n.cadre,
    x: n.x - minX + n.width / 2,
    y: n.y - minY + n.height / 2,
    width: n.width,
    height: n.height,
    compact: n.compact,
  }));
}

function getNodeBounds(positioned: PositionedNode[], ids?: Set<string>) {
  const subset = ids && ids.size > 0 ? positioned.filter((n) => ids.has(n.id)) : positioned;
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

export function HierarchyD3Tree({
  nodes: cadreNodes,
  matchIds,
  hasActiveSearchFilter,
  focusNodeId,
  fitBoundsNodeIds,
  selectedId,
  expandedVerticalIds,
  hubStats,
  onNodeClick,
  onHubToggle,
  onEditNode,
  onAddChild,
}: HierarchyD3TreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomBehaviorRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });

  const layout = useMemo(() => computeD3TreeLayout(cadreNodes), [cadreNodes]);
  const positionedNodes = useMemo(() => normalizeLayout(layout.nodes), [layout.nodes]);

  const links = useMemo(() => {
    const posById = new Map(positionedNodes.map((n) => [n.id, n]));
    return layout.links
      .map((link) => {
        const source = posById.get(link.sourceId);
        const target = posById.get(link.targetId);
        if (!source || !target) return null;

        const sourceBottom = source.y + source.height / 2 - 4;
        const targetTop = target.y - target.height / 2 + 4;
        const sourceHalf = source.width / 2 - 10;
        const sourceX = Math.max(
          source.x - sourceHalf,
          Math.min(source.x + sourceHalf, target.x),
        );

        return {
          id: link.id,
          source: { x: sourceX, y: sourceBottom },
          target: { x: target.x, y: targetTop },
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      source: { x: number; y: number };
      target: { x: number; y: number };
    }>;
  }, [layout.links, positionedNodes]);

  const graphWidth =
    positionedNodes.length > 0
      ? Math.max(...positionedNodes.map((n) => n.x + n.width / 2))
      : 0;
  const graphHeight =
    positionedNodes.length > 0
      ? Math.max(...positionedNodes.map((n) => n.y + n.height / 2))
      : 0;

  const fitToBounds = useCallback(
    (ids?: Set<string>, animate = false) => {
      const container = containerRef.current;
      const svg = svgRef.current;
      const zoomBehavior = zoomBehaviorRef.current;
      if (!container || !svg || !zoomBehavior || positionedNodes.length === 0) return;

      const bounds = getNodeBounds(positionedNodes, ids);
      if (!bounds) return;

      const width = container.clientWidth;
      const height = container.clientHeight;
      const contentWidth = Math.max(bounds.maxX - bounds.minX, NODE_WIDTH);
      const contentHeight = Math.max(bounds.maxY - bounds.minY, NODE_HEIGHT);
      const isFocusedFit = Boolean(ids && ids.size > 0);
      const padding = isFocusedFit ? FOCUSED_PADDING : PADDING;
      const fitScale = Math.min(
        (width - padding * 2) / contentWidth,
        (height - padding * 2) / contentHeight,
        isFocusedFit ? FOCUSED_MAX_SCALE : 1.5,
      );
      const isLargeTree = positionedNodes.length > LARGE_TREE_NODE_THRESHOLD;
      const minScale = isFocusedFit
        ? FOCUSED_MIN_SCALE
        : isLargeTree
          ? MAP_MIN_FIT_SCALE
          : MIN_MANUAL_ZOOM;
      const scale = Math.max(minScale, fitScale);
      const tx = width / 2 - ((bounds.minX + bounds.maxX) / 2) * scale;
      const ty = height / 2 - ((bounds.minY + bounds.maxY) / 2) * scale;
      const next = zoomIdentity.translate(tx, ty).scale(scale);

      const transition = animate
        ? select(svg).transition().duration(400)
        : select(svg);
      transition.call(zoomBehavior.transform, next);
    },
    [positionedNodes],
  );

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_MANUAL_ZOOM, 2.5])
      .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
        setTransform({
          x: event.transform.x,
          y: event.transform.y,
          k: event.transform.k,
        });
      });

    zoomBehaviorRef.current = zoomBehavior;
    select(svg).call(zoomBehavior).on('dblclick.zoom', null);

    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  useEffect(() => {
    if (cadreNodes.length === 0) return;

    const focusIds = focusNodeId
      ? new Set([focusNodeId])
      : hasActiveSearchFilter && matchIds.size > 0
        ? matchIds
        : fitBoundsNodeIds && fitBoundsNodeIds.size > 0
          ? fitBoundsNodeIds
          : undefined;

    requestAnimationFrame(() => fitToBounds(focusIds, Boolean(focusNodeId)));
  }, [
    cadreNodes,
    matchIds,
    hasActiveSearchFilter,
    focusNodeId,
    fitBoundsNodeIds,
    fitToBounds,
  ]);

  const handleZoomIn = () => {
    const svg = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).transition().duration(200).call(zoomBehavior.scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    const svg = svgRef.current;
    const zoomBehavior = zoomBehaviorRef.current;
    if (!svg || !zoomBehavior) return;
    select(svg).transition().duration(200).call(zoomBehavior.scaleBy, 0.8);
  };

  const handleFitView = () => {
    const focusIds = focusNodeId
      ? new Set([focusNodeId])
      : hasActiveSearchFilter && matchIds.size > 0
        ? matchIds
        : fitBoundsNodeIds && fitBoundsNodeIds.size > 0
          ? fitBoundsNodeIds
          : undefined;
    fitToBounds(focusIds, true);
  };

  const getNodeColor = useCallback(
    (cadre: CadreNodeDetail) => getLevelColor(cadre.positionLevelKey),
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
          <div ref={containerRef} className="absolute inset-0">
            <svg ref={svgRef} className="size-full touch-none">
              <defs>
                <pattern
                  id="hierarchy-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="hsl(var(--border))"
                    strokeWidth="0.5"
                    strokeOpacity="0.35"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#hierarchy-grid)" />
              <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
                {links.map((link) => {
                  const midY = (link.source.y + link.target.y) / 2;
                  const d = `M${link.source.x},${link.source.y} L${link.source.x},${midY} L${link.target.x},${midY} L${link.target.x},${link.target.y}`;
                  return (
                    <path
                      key={link.id}
                      d={d}
                      fill="none"
                      stroke="hsl(var(--border))"
                      strokeWidth={1.25}
                      strokeOpacity={0.55}
                    />
                  );
                })}
              </g>
            </svg>

            <div
              className="pointer-events-none absolute left-0 top-0 origin-top-left"
              style={{
                width: graphWidth,
                height: graphHeight,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
              }}
            >
              {positionedNodes.map((node) => {
                const isHub = isVerticalHubNode(node.cadre);
                const isMatch = matchIds.has(node.id);
                const dimmed = hasActiveSearchFilter && matchIds.size > 0 && !isMatch;
                return (
                  <div
                    key={node.id}
                    className="pointer-events-auto absolute"
                    style={{
                      left: node.x - node.width / 2,
                      top: node.y - node.height / 2,
                      width: node.width,
                    }}
                  >
                    <HierarchyNodeCardContent
                      cadre={node.cadre}
                      color={getNodeColor(node.cadre)}
                      compact={node.compact}
                      selected={selectedId === node.id}
                      dimmed={dimmed}
                      highlighted={isMatch}
                      expanded={isHub && expandedVerticalIds.has(node.cadre.verticalId)}
                      hubStats={isHub ? hubStats.get(node.cadre.verticalId) : undefined}
                      onClick={() => {
                        if (isHub) {
                          onHubToggle(node.cadre.verticalId);
                        } else {
                          onNodeClick(node.cadre);
                        }
                      }}
                      onEdit={
                        onEditNode && !isPlaceholderNode(node.cadre)
                          ? () => onEditNode(node.cadre)
                          : undefined
                      }
                      onAddChild={
                        !isHub && onAddChild && !isPlaceholderNode(node.cadre)
                          ? () => onAddChild(node.cadre)
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>

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

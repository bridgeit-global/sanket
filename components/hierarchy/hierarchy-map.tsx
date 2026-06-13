'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { HierarchyD3Tree } from './hierarchy-d3-tree';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import type { VerticalHubStats } from '@/lib/hierarchy/forest-builder';
import type { CommitteeHubStats } from '@/lib/hierarchy/committee-hub';
import type { MapRenderGate } from '@/lib/hierarchy/map-filters';
import { MAP_MAX_RENDER_NODES } from '@/lib/hierarchy/map-filters';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const LEVEL_LEGEND: Array<{ key: string; label: string }> = [
  { key: 'vertical', label: 'Vertical' },
  { key: 'taluka', label: 'Taluka Adhyaksh' },
  { key: 'ward', label: 'Ward Adhyaksh' },
  { key: 'ward_committee', label: 'Ward Committee' },
  { key: 'booth', label: 'Booth Adhyaksh' },
  { key: 'booth_committee', label: 'Booth Committee' },
];

interface HierarchyMapProps {
  nodes: CadreNodeDetail[];
  matchIds: Set<string>;
  hasActiveSearchFilter: boolean;
  focusNodeId?: string | null;
  fitBoundsNodeIds?: Set<string>;
  mapRenderGate: MapRenderGate;
  selectedId: string | null;
  expandedVerticalIds: ReadonlySet<string>;
  hubStats: Map<string, VerticalHubStats>;
  committeeHubMembers: Map<string, CadreNodeDetail[]>;
  committeeHubStats: Map<string, CommitteeHubStats>;
  onNodeClick: (node: CadreNodeDetail) => void;
  onHubToggle: (verticalId: string) => void;
  onEditNode?: (node: CadreNodeDetail) => void;
  onAddChild?: (node: CadreNodeDetail) => void;
  /** Floating panel (quick edit / details) rendered over the map. */
  overlay?: React.ReactNode;
}

export function HierarchyMap({
  nodes: cadreNodes,
  matchIds,
  hasActiveSearchFilter,
  focusNodeId,
  fitBoundsNodeIds,
  mapRenderGate,
  selectedId,
  expandedVerticalIds,
  hubStats,
  committeeHubMembers,
  committeeHubStats,
  onNodeClick,
  onHubToggle,
  onEditNode,
  onAddChild,
  overlay,
}: HierarchyMapProps) {
  const isMobile = useIsMobile();
  const vacantOnMap = cadreNodes.filter((n) => n.isVacant).length;
  const visibleLevels = useMemo(() => {
    const keys = new Set(cadreNodes.map((n) => n.positionLevelKey));
    return LEVEL_LEGEND.filter((l) => keys.has(l.key));
  }, [cadreNodes]);

  const legendItems = visibleLevels.map((level) => (
    <span key={level.key} className="inline-flex items-center gap-1.5">
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: getLevelColor(level.key) }}
      />
      {level.label}
    </span>
  ));

  const statusItems = (
    <>
      {hasActiveSearchFilter && matchIds.size > 0 && (
        <span>
          {matchIds.size} match{matchIds.size === 1 ? '' : 'es'} highlighted
        </span>
      )}
      {hasActiveSearchFilter && matchIds.size === 0 && (
        <span className="text-amber-700 dark:text-amber-300">
          No matches for current search
        </span>
      )}
      {vacantOnMap > 0 && (
        <span>{vacantOnMap} vacant — click a dashed card to fill</span>
      )}
      {cadreNodes.length > MAP_MAX_RENDER_NODES && mapRenderGate.render && (
        <span className="text-amber-700 dark:text-amber-300">
          {cadreNodes.length.toLocaleString()} nodes — zoom and pan to explore
        </span>
      )}
    </>
  );

  return (
    <div className="flex h-full flex-col gap-1 md:gap-2">
      {isMobile ? (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
                <Info className="size-3.5" />
                Legend
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="flex w-56 flex-col gap-2 p-3 text-xs">
              {legendItems}
              {statusItems}
            </DropdownMenuContent>
          </DropdownMenu>
          {hasActiveSearchFilter && matchIds.size > 0 && (
            <span className="truncate">
              {matchIds.size} match{matchIds.size === 1 ? '' : 'es'}
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {legendItems}
          {statusItems}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {!mapRenderGate.render ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-6 text-center">
            <p className="text-sm font-medium text-foreground">{mapRenderGate.message}</p>
            <p className="text-xs text-muted-foreground">
              {mapRenderGate.hint === 'booth'
                ? 'Use the Booth dropdown above to narrow the view.'
                : 'Use the Ward dropdown above to drill into a single ward.'}
            </p>
          </div>
        ) : (
        <HierarchyD3Tree
          nodes={cadreNodes}
          matchIds={matchIds}
          hasActiveSearchFilter={hasActiveSearchFilter}
          focusNodeId={focusNodeId}
          fitBoundsNodeIds={fitBoundsNodeIds}
          selectedId={selectedId}
          expandedVerticalIds={expandedVerticalIds}
          hubStats={hubStats}
          committeeHubMembers={committeeHubMembers}
          committeeHubStats={committeeHubStats}
          onNodeClick={onNodeClick}
          onHubToggle={onHubToggle}
          onEditNode={onEditNode}
          onAddChild={onAddChild}
        />
        )}
        {overlay && mapRenderGate.render && (
          <div className="absolute top-3 right-3 z-10 max-h-[calc(100%-1.5rem)] max-w-[min(22rem,calc(100%-1.5rem))]">
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import { Info } from 'lucide-react';
import { HierarchyTableTree } from './hierarchy-table-tree';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import type { VerticalHubStats } from '@/lib/hierarchy/forest-builder';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const LEVEL_LEGEND: Array<{ key: string; label: string }> = [
  { key: 'vertical', label: 'Vertical' },
  { key: 'taluka', label: 'Taluka Adhyaksh' },
  { key: 'taluka_committee', label: 'Taluka Committee' },
  { key: 'ward', label: 'Ward Adhyaksh' },
  { key: 'ward_committee', label: 'Ward Committee' },
  { key: 'booth', label: 'Booth Adhyaksh' },
  { key: 'booth_committee', label: 'Booth Committee' },
];

interface HierarchyMapProps {
  nodes: CadreNodeDetail[];
  matchIds: Set<string>;
  hasActiveSearchFilter: boolean;
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
  /** Floating panel (quick edit / details) rendered over the map. */
  overlay?: React.ReactNode;
}

export function HierarchyMap({
  nodes: cadreNodes,
  matchIds,
  hasActiveSearchFilter,
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
    </>
  );

  return (
    <div className="flex h-full flex-col gap-1">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1 text-[11px] text-muted-foreground">
          {legendItems}
          {(hasActiveSearchFilter || vacantOnMap > 0) && (
            <span className="hidden h-3 w-px bg-border/80 sm:inline-block" aria-hidden />
          )}
          {statusItems}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        <HierarchyTableTree
          nodes={cadreNodes}
          matchIds={matchIds}
          hasActiveSearchFilter={hasActiveSearchFilter}
          selectedId={selectedId}
          expandedVerticalIds={expandedVerticalIds}
          expandedIds={expandedIds}
          childCountById={childCountById}
          hasChildrenById={hasChildrenById}
          onToggleExpand={onToggleExpand}
          hubStats={hubStats}
          onNodeClick={onNodeClick}
          onHubToggle={onHubToggle}
          onEditNode={onEditNode}
          onAddChild={onAddChild}
        />
        {overlay && (
          <div className="absolute inset-x-2 bottom-2 z-10 max-h-[min(45dvh,calc(100%-1rem))] md:inset-x-auto md:bottom-auto md:right-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:max-w-[min(22rem,calc(100%-1.5rem))]">
            {overlay}
          </div>
        )}
      </div>
    </div>
  );
}

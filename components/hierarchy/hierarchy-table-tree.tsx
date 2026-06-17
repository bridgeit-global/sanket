'use client';

import { memo, useMemo } from 'react';
import { ChevronDown, ChevronRight, Pencil, Plus, User, Vote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import {
  formatFilledGeoSubtitle,
  formatGeoContextLine,
  getNodePersonLabel,
} from '@/lib/hierarchy/geo-attribution';
import {
  isVerticalHubNode,
  type VerticalHubStats,
} from '@/lib/hierarchy/forest-builder';
import { compareSiblingNodes } from '@/lib/hierarchy/sort-nodes';
import { isGroupNode } from '@/lib/hierarchy/tree-builder';
import { isPlaceholderNode } from '@/lib/hierarchy/vacant-slots';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

const INDENT_PX_DESKTOP = 20;
const INDENT_PX_MOBILE = 12;

interface HierarchyTableTreeProps {
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
}

type FlatRow = {
  node: CadreNodeDetail;
  depth: number;
};

type RowProps = Omit<HierarchyTableTreeProps, 'nodes'> & { row: FlatRow };

/** Name column only — geo context lives in the Location column. */
function formatTableDisplayName(
  node: CadreNodeDetail,
  { isHub, isGroup }: { isHub: boolean; isGroup: boolean },
): string {
  if (isHub) return node.verticalName;
  if (isGroup) return node.personName ?? node.positionName;
  if (node.isVacant) return node.positionName;
  return getNodePersonLabel(node);
}

function buildChildrenMap(nodes: CadreNodeDetail[]): Map<string, CadreNodeDetail[]> {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const children = new Map<string, CadreNodeDetail[]>();

  for (const node of nodes) {
    if (!node.parentId || !nodeIds.has(node.parentId)) continue;
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }

  for (const [parentId, kids] of children) {
    kids.sort(compareSiblingNodes);
    children.set(parentId, kids);
  }

  return children;
}

function flattenVisibleTree(nodes: CadreNodeDetail[]): FlatRow[] {
  if (nodes.length === 0) return [];

  const nodeIds = new Set(nodes.map((n) => n.id));
  const childrenByParent = buildChildrenMap(nodes);
  const roots = nodes
    .filter((n) => !n.parentId || !nodeIds.has(n.parentId))
    .sort(compareSiblingNodes);

  const rows: FlatRow[] = [];

  function walk(node: CadreNodeDetail, depth: number) {
    rows.push({ node, depth });
    for (const child of childrenByParent.get(node.id) ?? []) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }

  return rows;
}

function useRowState({
  row,
  matchIds,
  hasActiveSearchFilter,
  selectedId,
  expandedVerticalIds,
  expandedIds,
  childCountById,
  hasChildrenById,
  hubStats,
}: RowProps) {
  const { node, depth } = row;
  const isHub = isVerticalHubNode(node);
  const isGroup = isGroupNode(node);
  const color = getLevelColor(node.positionLevelKey);
  const hasChildren = hasChildrenById.get(node.id) ?? false;
  const childCount = childCountById.get(node.id) ?? 0;
  const isExpanded = isHub
    ? expandedVerticalIds.has(node.verticalId)
    : expandedIds.has(node.id);
  const isMatch = matchIds.has(node.id);
  const dimmed = hasActiveSearchFilter && matchIds.size > 0 && !isMatch;
  const selected = selectedId === node.id;
  const stats = isHub ? hubStats.get(node.verticalId) : undefined;

  const showExpandChevron = isHub || isGroup || (hasChildren && !isHub);
  const expandableMember = hasChildren && !isHub && !isGroup;

  const displayName = formatTableDisplayName(node, { isHub, isGroup });

  const geoLine = isHub || isGroup ? null : formatGeoContextLine(node);
  const geoSubtitle =
    !isHub && !isGroup && !node.isVacant ? formatFilledGeoSubtitle(node) : null;

  const roleLabel = node.positionName;

  const countLabel = isHub
    ? `${stats?.totalNodes ?? 0} members`
    : isGroup
      ? `${childCount} ${childCount === 1 ? 'item' : 'items'}`
      : null;

  return {
    node,
    depth,
    isHub,
    isGroup,
    color,
    isExpanded,
    isMatch,
    dimmed,
    selected,
    stats,
    showExpandChevron,
    expandableMember,
    displayName,
    geoLine,
    geoSubtitle,
    roleLabel,
    countLabel,
  };
}

function ExpandCell({
  expanded,
  showChevron,
  onToggle,
}: {
  expanded: boolean;
  showChevron: boolean;
  onToggle?: () => void;
}) {
  if (!showChevron) {
    return <span className="inline-block size-6" aria-hidden />;
  }

  const Icon = expanded ? ChevronDown : ChevronRight;

  if (!onToggle) {
    return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      aria-label={expanded ? 'Collapse' : 'Expand'}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <Icon className="size-4" />
    </Button>
  );
}

function StatusBadges({
  node,
  isHub,
  stats,
}: {
  node: CadreNodeDetail;
  isHub: boolean;
  stats?: VerticalHubStats;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {node.isVacant && (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-50 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          Vacant
        </Badge>
      )}
      {isHub && (stats?.vacantNodes ?? 0) > 0 && (
        <Badge
          variant="outline"
          className="border-amber-500/50 bg-amber-50 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-100"
        >
          {stats?.vacantNodes} vacant
        </Badge>
      )}
      {node.linkedUser && (
        <Badge
          variant="secondary"
          className="gap-0.5 text-[10px] text-blue-800 dark:text-blue-100"
        >
          <User className="size-2.5" />
          User
        </Badge>
      )}
      {node.linkedVoter && (
        <Badge
          variant="secondary"
          className="gap-0.5 text-[10px] text-green-800 dark:text-green-100"
        >
          <Vote className="size-2.5" />
          Voter
        </Badge>
      )}
    </div>
  );
}

function RowActions({
  node,
  isHub,
  isGroup,
  expandableMember,
  onEditNode,
  onAddChild,
}: {
  node: CadreNodeDetail;
  isHub: boolean;
  isGroup: boolean;
  expandableMember: boolean;
  onEditNode?: (node: CadreNodeDetail) => void;
  onAddChild?: (node: CadreNodeDetail) => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-0.5">
      {onEditNode && (isHub || (!isGroup && !isPlaceholderNode(node))) && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          aria-label={isHub ? 'Edit vertical' : 'Edit node'}
          onClick={(e) => {
            e.stopPropagation();
            onEditNode(node);
          }}
        >
          <Pencil className="size-3.5" />
        </Button>
      )}
      {onAddChild &&
        !isHub &&
        !isGroup &&
        !isPlaceholderNode(node) &&
        expandableMember && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label="Add subordinate"
            onClick={(e) => {
              e.stopPropagation();
              onAddChild(node);
            }}
          >
            <Plus className="size-3.5" />
          </Button>
        )}
    </div>
  );
}

function useRowHandlers(
  props: RowProps,
  state: ReturnType<typeof useRowState>,
) {
  const { onHubToggle, onToggleExpand, onNodeClick } = props;
  const { node, isHub, isGroup } = state;

  const handleRowClick = () => {
    if (isHub) {
      onHubToggle(node.verticalId);
    } else if (isGroup) {
      onToggleExpand(node.id);
    } else {
      onNodeClick(node);
    }
  };

  const handleChevronToggle = () => {
    if (isHub) {
      onHubToggle(node.verticalId);
    } else {
      onToggleExpand(node.id);
    }
  };

  return { handleRowClick, handleChevronToggle };
}

function rowClassName(state: ReturnType<typeof useRowState>) {
  const { dimmed, selected, node, isMatch } = state;
  return [
    'cursor-pointer',
    dimmed ? 'opacity-40' : '',
    selected ? 'bg-muted' : '',
    isMatch ? 'bg-amber-50/80 dark:bg-amber-950/30' : '',
    node.isVacant ? 'border-l-2 border-l-amber-500/60' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

const HierarchyMobileCard = memo(function HierarchyMobileCard(props: RowProps) {
  const state = useRowState(props);
  const { handleRowClick, handleChevronToggle } = useRowHandlers(props, state);
  const { onEditNode, onAddChild } = props;
  const {
    node,
    depth,
    color,
    isExpanded,
    showExpandChevron,
    expandableMember,
    displayName,
    geoLine,
    geoSubtitle,
    roleLabel,
    countLabel,
    isHub,
    isGroup,
    stats,
  } = state;

  return (
    <div
      role="button"
      tabIndex={0}
      data-state={state.selected ? 'selected' : undefined}
      className={`flex gap-2 border-b border-border/60 px-2 py-2.5 last:border-b-0 ${rowClassName(state)}`}
      onClick={handleRowClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleRowClick();
        }
      }}
    >
      <div
        className="flex shrink-0 items-start gap-1 pt-0.5"
        style={{ paddingLeft: depth * INDENT_PX_MOBILE }}
      >
        <ExpandCell
          expanded={isExpanded}
          showChevron={showExpandChevron}
          onToggle={showExpandChevron ? handleChevronToggle : undefined}
        />
        <span
          className="mt-1 block min-h-6 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: node.isVacant ? 'hsl(38 92% 50% / 0.75)' : color }}
          aria-hidden
        />
      </div>

      <div className="min-w-0 flex-1">
        <Badge
          variant="outline"
          className="mb-1 max-w-full whitespace-normal px-1.5 py-0 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground"
        >
          {roleLabel}
        </Badge>
        <p
          className={`break-words text-sm font-semibold leading-snug ${
            node.isVacant ? 'italic text-amber-800 dark:text-amber-200' : ''
          }`}
        >
          {displayName}
        </p>
        {countLabel && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{countLabel}</p>
        )}
        {(geoLine || geoSubtitle) && (
          <div className="mt-1 text-xs text-muted-foreground">
            {geoLine && <p className="break-words leading-snug">{geoLine}</p>}
            {geoSubtitle && (
              <p className="break-words text-[11px] text-muted-foreground/80">{geoSubtitle}</p>
            )}
          </div>
        )}
        <div className="mt-1.5">
          <StatusBadges node={node} isHub={isHub} stats={stats} />
        </div>
      </div>

      <RowActions
        node={node}
        isHub={isHub}
        isGroup={isGroup}
        expandableMember={expandableMember}
        onEditNode={onEditNode}
        onAddChild={onAddChild}
      />
    </div>
  );
});

const HierarchyTableRow = memo(function HierarchyTableRow(props: RowProps) {
  const state = useRowState(props);
  const { handleRowClick, handleChevronToggle } = useRowHandlers(props, state);
  const { onEditNode, onAddChild } = props;
  const {
    node,
    depth,
    color,
    isExpanded,
    showExpandChevron,
    expandableMember,
    displayName,
    geoLine,
    geoSubtitle,
    roleLabel,
    countLabel,
    isHub,
    isGroup,
    stats,
  } = state;

  return (
    <TableRow
      data-state={state.selected ? 'selected' : undefined}
      className={rowClassName(state)}
      onClick={handleRowClick}
    >
      <TableCell className="w-8 py-2 pl-2 pr-0">
        <div style={{ paddingLeft: depth * INDENT_PX_DESKTOP }}>
          <ExpandCell
            expanded={isExpanded}
            showChevron={showExpandChevron}
            onToggle={showExpandChevron ? handleChevronToggle : undefined}
          />
        </div>
      </TableCell>

      <TableCell className="w-1 py-2 px-0">
        <span
          className="block h-8 w-1 rounded-full"
          style={{ backgroundColor: node.isVacant ? 'hsl(38 92% 50% / 0.75)' : color }}
          aria-hidden
        />
      </TableCell>

      <TableCell className="max-w-36 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span className="line-clamp-2">{roleLabel}</span>
      </TableCell>

      <TableCell className="min-w-32 py-2">
        <p
          className={`break-words text-sm font-semibold leading-snug ${
            node.isVacant ? 'italic text-amber-800 dark:text-amber-200' : ''
          }`}
        >
          {displayName}
        </p>
        {countLabel && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">{countLabel}</p>
        )}
      </TableCell>

      <TableCell className="hidden min-w-32 py-2 text-xs text-muted-foreground lg:table-cell">
        {geoLine && <span className="block break-words">{geoLine}</span>}
        {geoSubtitle && (
          <span className="block break-words text-[11px] text-muted-foreground/80">
            {geoSubtitle}
          </span>
        )}
      </TableCell>

      <TableCell className="py-2">
        <StatusBadges node={node} isHub={isHub} stats={stats} />
      </TableCell>

      <TableCell className="w-20 py-2 pr-3">
        <RowActions
          node={node}
          isHub={isHub}
          isGroup={isGroup}
          expandableMember={expandableMember}
          onEditNode={onEditNode}
          onAddChild={onAddChild}
        />
      </TableCell>
    </TableRow>
  );
});

export function HierarchyTableTree({
  nodes,
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
}: HierarchyTableTreeProps) {
  const rows = useMemo(() => flattenVisibleTree(nodes), [nodes]);

  const rowProps = {
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
  };

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-gradient-to-br from-muted/20 via-background to-muted/30 px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No nodes match the current filters
        </p>
        <p className="text-xs text-muted-foreground/80">
          Try a different ward, booth, or search term.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-gradient-to-br from-muted/20 via-background to-muted/30">
      {/* Mobile: card list */}
      <div className="min-h-0 flex-1 overflow-auto md:hidden">
        {rows.map((row) => (
          <HierarchyMobileCard key={row.node.id} row={row} {...rowProps} />
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden min-h-0 flex-1 overflow-auto md:block">
        <Table>
          <TableHeader className="sticky top-0 z-[1] bg-background/95 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8" />
              <TableHead className="w-1 p-0" aria-label="Level" />
              <TableHead className="text-xs">Role</TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="hidden text-xs lg:table-cell">Location</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="w-20 text-right text-xs">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <HierarchyTableRow key={row.node.id} row={row} {...rowProps} />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

'use client';

import { ChevronDown, ChevronRight, Pencil, Plus, User, Vote } from 'lucide-react';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';
import {
  formatFilledCardTitle,
  formatFilledGeoSubtitle,
  formatVacantCardTitle,
  getNodeGeoAttribution,
} from '@/lib/hierarchy/geo-attribution';
import {
  isVerticalHubNode,
  type VerticalHubStats,
} from '@/lib/hierarchy/forest-builder';
import { isGroupNode } from '@/lib/hierarchy/tree-builder';

interface HierarchyNodeCardContentProps {
  cadre: CadreNodeDetail;
  color: string;
  compact?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  /** For vertical hub cards. */
  expanded?: boolean;
  hubStats?: VerticalHubStats;
  /** Node has children in the navigable tree. */
  expandable?: boolean;
  childCount?: number;
  onToggleExpand?: () => void;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Admin inline actions (hidden until hover). */
  onEdit?: () => void;
  onAddChild?: () => void;
}

function cardShellClass({
  selected,
  dimmed,
  highlighted,
  compact,
  vacant,
}: {
  selected: boolean;
  dimmed: boolean;
  highlighted: boolean;
  compact: boolean;
  vacant: boolean;
}): string {
  const parts = [
    'nodrag nopan group/card relative rounded-md border bg-card shadow-sm cursor-pointer transition-shadow hover:shadow-md overflow-hidden',
    compact ? 'px-2 py-1.5' : 'px-3 py-2',
    vacant
      ? 'border-dashed border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/25'
      : 'border-border/70',
    selected ? 'ring-2 ring-primary ring-offset-1' : '',
    highlighted ? 'ring-2 ring-amber-400 shadow-md' : '',
    dimmed ? 'opacity-40' : '',
  ];
  return parts.filter(Boolean).join(' ');
}

function accentStyle(color: string, vacant: boolean): React.CSSProperties {
  if (vacant) {
    return { borderLeftWidth: 4, borderLeftColor: 'hsl(38 92% 50% / 0.75)' };
  }
  return {
    borderLeftWidth: 4,
    borderLeftColor: color,
    borderLeftStyle: 'solid',
  };
}

function ExpandChevron({
  expanded,
  onToggleExpand,
}: {
  expanded: boolean;
  onToggleExpand?: () => void;
}) {
  if (!onToggleExpand) {
    return expanded ? (
      <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
    ) : (
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
    );
  }

  return (
    <button
      type="button"
      aria-label={expanded ? 'Collapse' : 'Expand'}
      className="rounded-full border bg-card p-0.5 shadow-sm hover:bg-accent"
      onClick={(e) => {
        e.stopPropagation();
        onToggleExpand();
      }}
    >
      {expanded ? (
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
      ) : (
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

export function HierarchyNodeCardContent({
  cadre,
  color,
  compact = false,
  selected = false,
  dimmed = false,
  highlighted = false,
  expanded = false,
  hubStats,
  expandable = false,
  childCount = 0,
  onToggleExpand,
  onClick,
  onContextMenu,
  onEdit,
  onAddChild,
}: HierarchyNodeCardContentProps) {
  const isHub = isVerticalHubNode(cadre);
  const isGroup = isGroupNode(cadre);
  const geo = getNodeGeoAttribution(cadre);
  const filledGeoSubtitle = formatFilledGeoSubtitle(cadre);

  const displayName = cadre.isVacant
    ? formatVacantCardTitle(cadre)
    : formatFilledCardTitle(cadre);

  const actionButtonClass =
    'rounded-full border bg-card p-1 shadow-sm hover:bg-accent';

  const roleClass = compact
    ? 'text-[9px] font-medium uppercase tracking-wide text-muted-foreground'
    : 'text-[9px] font-medium uppercase tracking-wide text-muted-foreground';
  const nameClass = compact
    ? 'text-[12px] font-semibold leading-tight line-clamp-2'
    : 'text-sm font-semibold leading-snug truncate';
  const metaClass = compact
    ? 'text-[9px] text-muted-foreground'
    : 'text-[10px] text-muted-foreground';

  const shellProps = {
    selected,
    dimmed,
    highlighted,
    compact,
    vacant: cadre.isVacant,
  };

  if (isHub || isGroup) {
    const title = isHub ? cadre.verticalName : cadre.personName ?? cadre.positionName;
    const roleLabel = isHub ? cadre.positionName : cadre.positionName;
    const countLabel = isHub
      ? `${hubStats?.totalNodes ?? 0} members`
      : `${childCount} ${childCount === 1 ? 'item' : 'items'}`;

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={cardShellClass(shellProps)}
        style={accentStyle(color, false)}
      >
        <div className="flex items-center justify-between gap-1">
          <p className={`min-w-0 flex-1 truncate ${roleClass}`}>{roleLabel}</p>
          <div className="flex shrink-0 items-center gap-0.5">
            {onEdit && isHub && (
              <button
                type="button"
                aria-label="Edit vertical"
                className={`${actionButtonClass} hidden group-hover/card:inline-flex`}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="size-3" />
              </button>
            )}
            <ExpandChevron expanded={expanded} onToggleExpand={onToggleExpand} />
          </div>
        </div>
        <p className={nameClass}>{title}</p>
        <div className={`mt-0.5 flex items-center gap-1.5 flex-wrap ${metaClass}`}>
          <span>{countLabel}</span>
          {isHub && (hubStats?.vacantNodes ?? 0) > 0 && (
            <span className="inline-flex items-center rounded bg-amber-100 px-1 py-0.5 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {hubStats?.vacantNodes} vacant
            </span>
          )}
          {!compact && (
            <span className="text-muted-foreground/70">
              {expanded ? 'Click to collapse' : 'Click to expand'}
            </span>
          )}
        </div>
      </div>
    );
  }

  const hasActions = Boolean(onEdit || onAddChild);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      onContextMenu={onContextMenu}
      className={cardShellClass(shellProps)}
      style={accentStyle(color, cadre.isVacant)}
    >
      <div className="flex items-center justify-between gap-1">
        <p className={`min-w-0 flex-1 truncate ${roleClass}`}>{cadre.positionName}</p>
        <div className="flex shrink-0 items-center gap-0.5">
          {hasActions && (
            <div className="hidden shrink-0 items-center gap-0.5 group-hover/card:flex">
              {onEdit && (
                <button
                  type="button"
                  aria-label="Edit node"
                  className={actionButtonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                >
                  <Pencil className="size-3" />
                </button>
              )}
              {onAddChild && (
                <button
                  type="button"
                  aria-label="Add subordinate"
                  className={actionButtonClass}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddChild();
                  }}
                >
                  <Plus className="size-3" />
                </button>
              )}
            </div>
          )}
          {expandable && (
            <ExpandChevron expanded={expanded} onToggleExpand={onToggleExpand} />
          )}
        </div>
      </div>
      <p
        className={`${nameClass} ${
          cadre.isVacant ? 'italic text-amber-800 dark:text-amber-200' : 'text-foreground'
        }`}
      >
        {displayName}
      </p>
      {!compact && !cadre.isVacant && filledGeoSubtitle && (
        <p className={`${metaClass} truncate mt-0.5`}>{filledGeoSubtitle}</p>
      )}
      {!compact && cadre.isVacant && geo.secondary && (
        <p className={`${metaClass} truncate mt-0.5`}>{geo.secondary}</p>
      )}
      {!compact && (
        <div className="mt-1 flex items-center gap-1 flex-wrap">
          {cadre.linkedUser && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-100">
              <User className="size-2.5" /> User
            </span>
          )}
          {cadre.linkedVoter && (
            <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-800 dark:bg-green-900 dark:text-green-100">
              <Vote className="size-2.5" /> Voter
            </span>
          )}
        </div>
      )}
    </div>
  );
}

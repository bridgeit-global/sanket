'use client';

import { ChevronDown, ChevronRight, Pencil, Plus, User, Vote } from 'lucide-react';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';
import {
  formatGeoContextLine,
  formatVacantCardTitle,
  getNodeGeoAttribution,
} from '@/lib/hierarchy/geo-attribution';
import {
  isVerticalHubNode,
  type VerticalHubStats,
} from '@/lib/hierarchy/forest-builder';
import {
  isCommitteeHubNode,
  type CommitteeHubStats,
} from '@/lib/hierarchy/committee-hub';
import { getLevelColor } from '@/lib/hierarchy/build-tree';

interface HierarchyNodeCardContentProps {
  cadre: CadreNodeDetail;
  color: string;
  selected?: boolean;
  dimmed?: boolean;
  highlighted?: boolean;
  /** For vertical hub cards. */
  expanded?: boolean;
  hubStats?: VerticalHubStats;
  /** For committee aggregate hub cards. */
  committeeHubStats?: CommitteeHubStats;
  onClick?: () => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  /** Admin inline actions (hidden until hover). */
  onEdit?: () => void;
  onAddChild?: () => void;
}

export function HierarchyNodeCardContent({
  cadre,
  color,
  selected = false,
  dimmed = false,
  highlighted = false,
  expanded = false,
  hubStats,
  committeeHubStats,
  onClick,
  onContextMenu,
  onEdit,
  onAddChild,
}: HierarchyNodeCardContentProps) {
  const isHub = isVerticalHubNode(cadre);
  const isCommitteeHub = isCommitteeHubNode(cadre);
  const geo = getNodeGeoAttribution(cadre);
  const geoLine = formatGeoContextLine(cadre);

  const displayName = cadre.isVacant
    ? formatVacantCardTitle(cadre)
    : cadre.personName ?? cadre.linkedVoter?.fullName ?? cadre.linkedUser?.userId ?? '—';

  const actionButtonClass =
    'rounded-full border bg-card p-1 shadow-sm hover:bg-accent';

  if (isHub) {
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
        className={`group/card relative rounded-lg border-2 bg-card px-3 py-2 shadow-sm min-w-[200px] max-w-[220px] cursor-pointer transition-shadow hover:shadow-md ${
          selected ? 'ring-2 ring-primary' : ''
        } ${dimmed ? 'opacity-40' : ''}`}
        style={{ borderColor: color, boxShadow: `0 0 0 1px ${color}33` }}
      >
        <div className="flex items-center justify-between gap-1">
          <p className="min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {cadre.positionName}
          </p>
          <div className="flex shrink-0 items-center gap-0.5">
            {onEdit && (
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
            {expanded ? (
              <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
        </div>
        <p className="text-sm font-semibold truncate">{cadre.verticalName}</p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
          <span>{hubStats?.totalNodes ?? 0} members</span>
          {(hubStats?.vacantNodes ?? 0) > 0 && (
            <span className="inline-flex items-center rounded bg-amber-100 px-1 py-0.5 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {hubStats?.vacantNodes} vacant
            </span>
          )}
          <span className="text-muted-foreground/70">
            {expanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
      </div>
    );
  }

  if (isCommitteeHub && committeeHubStats) {
    const committeeColor = getLevelColor(committeeHubStats.levelKey);
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
        className={`group/card relative rounded-lg border-2 bg-card px-3 py-2 shadow-sm min-w-[200px] max-w-[220px] cursor-pointer transition-shadow hover:shadow-md ${
          selected ? 'ring-2 ring-primary' : ''
        } ${dimmed ? 'opacity-40' : ''} ${highlighted ? 'ring-2 ring-amber-400 shadow-md' : ''}`}
        style={{ borderColor: committeeColor, boxShadow: `0 0 0 1px ${committeeColor}33` }}
      >
        <div className="flex items-center justify-between gap-1">
          <p className="min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {cadre.positionName}
          </p>
          <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-sm font-semibold truncate">{cadre.personName}</p>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground">
          <span>{committeeHubStats.totalNodes} members</span>
          {committeeHubStats.vacantNodes > 0 && (
            <span className="inline-flex items-center rounded bg-amber-100 px-1 py-0.5 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
              {committeeHubStats.vacantNodes} vacant
            </span>
          )}
          <span className="text-muted-foreground/70">Tap to browse</span>
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
      className={`group/card relative rounded-lg border-2 bg-card px-3 py-2 shadow-sm min-w-[200px] max-w-[220px] cursor-pointer transition-shadow ${
        cadre.isVacant
          ? 'border-dashed border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20 hover:shadow-md hover:border-amber-500'
          : 'border-border hover:shadow-md'
      } ${selected ? 'ring-2 ring-primary' : ''} ${
        highlighted ? 'ring-2 ring-amber-400 shadow-md' : ''
      } ${dimmed ? 'opacity-40' : ''}`}
      style={
        cadre.isVacant
          ? undefined
          : { borderColor: color, boxShadow: `0 0 0 1px ${color}33` }
      }
    >
      <div className="flex items-center justify-between gap-1">
        <p className="min-w-0 flex-1 truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {cadre.positionName}
        </p>
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
      </div>
      <p
        className={`text-sm font-semibold truncate ${
          cadre.isVacant ? 'italic text-amber-800 dark:text-amber-200' : ''
        }`}
      >
        {displayName}
      </p>
      {!cadre.isVacant && geoLine && (
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{geoLine}</p>
      )}
      {cadre.isVacant && geo.secondary && (
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{geo.secondary}</p>
      )}
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
    </div>
  );
}

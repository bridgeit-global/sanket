'use client';

import { User, Vote } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getLevelColor } from '@/lib/hierarchy/build-tree';
import {
  formatGeoContextLine,
  formatVacantCardTitle,
} from '@/lib/hierarchy/geo-attribution';
import type { CommitteeHubStats } from '@/lib/hierarchy/committee-hub';
import type { CadreNodeDetail } from '@/lib/hierarchy/types';

interface CommitteeMembersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hubStats: CommitteeHubStats | null;
  members: CadreNodeDetail[];
  selectedId: string | null;
  matchIds: ReadonlySet<string>;
  side: 'bottom' | 'right';
  onMemberClick: (member: CadreNodeDetail) => void;
}

export function CommitteeMembersSheet({
  open,
  onOpenChange,
  hubStats,
  members,
  selectedId,
  matchIds,
  side,
  onMemberClick,
}: CommitteeMembersSheetProps) {
  const levelKey = hubStats?.levelKey ?? 'ward_committee';
  const color = getLevelColor(levelKey);
  const vacantCount = members.filter((m) => m.isVacant).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={
          side === 'bottom'
            ? 'flex max-h-[85dvh] flex-col gap-0 rounded-t-xl p-0'
            : 'flex w-full flex-col gap-0 p-0 sm:max-w-md'
        }
      >
        <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
          <SheetTitle>{hubStats?.levelLabel ?? 'Committee members'}</SheetTitle>
          <SheetDescription>
            {members.length} member{members.length === 1 ? '' : 's'}
            {vacantCount > 0 ? ` · ${vacantCount} vacant` : ''}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <ul className="flex flex-col gap-2">
            {members.map((member) => {
              const displayName = member.isVacant
                ? formatVacantCardTitle(member)
                : member.personName ??
                  member.linkedVoter?.fullName ??
                  member.linkedUser?.userId ??
                  '—';
              const geoLine = formatGeoContextLine(member);
              const isSelected = selectedId === member.id;
              const isMatch = matchIds.has(member.id);

              return (
                <li key={member.id}>
                  <button
                    type="button"
                    onClick={() => onMemberClick(member)}
                    className={`w-full rounded-lg border-2 bg-card px-3 py-2.5 text-left shadow-sm transition-shadow hover:shadow-md ${
                      member.isVacant
                        ? 'border-dashed border-amber-500/60 bg-amber-50/40 dark:bg-amber-950/20'
                        : 'border-border'
                    } ${isSelected ? 'ring-2 ring-primary' : ''} ${
                      isMatch ? 'ring-2 ring-amber-400' : ''
                    }`}
                    style={
                      member.isVacant
                        ? undefined
                        : { borderColor: color, boxShadow: `0 0 0 1px ${color}33` }
                    }
                  >
                    <p className="truncate text-sm font-semibold">{displayName}</p>
                    {geoLine && (
                      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                        {geoLine}
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {member.linkedUser && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-blue-100 px-1 py-0.5 text-[10px] text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                          <User className="size-2.5" /> User
                        </span>
                      )}
                      {member.linkedVoter && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-green-100 px-1 py-0.5 text-[10px] text-green-800 dark:bg-green-900 dark:text-green-100">
                          <Vote className="size-2.5" /> Voter
                        </span>
                      )}
                      {member.isVacant && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300">
                          Vacant — tap to fill
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}

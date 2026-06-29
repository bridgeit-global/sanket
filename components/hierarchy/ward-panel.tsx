'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { ContactWithCall } from './contact-with-call';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import { findSeniorMemberForGeo } from '@/lib/hierarchy/geo-navigation';
import { filterBoothCommitteeMembers } from '@/lib/hierarchy/member-list';
import type { CadreMemberCard } from '@/lib/hierarchy/types';

type WardVertical = {
  id: string;
  name: string;
  sortOrder: number;
};

function findWardHeadForVertical(
  members: CadreMemberCard[],
  wardGeoId: string,
  verticalId: string,
): CadreMemberCard | null {
  const verticalMembers = members.filter(
    (member) =>
      member.verticals.some((v) => v.id === verticalId) &&
      member.posts.some(
        (post) =>
          post.positionLevelKey === 'ward' && post.wardGeoId === wardGeoId,
      ),
  );
  return findSeniorMemberForGeo(verticalMembers, { scope: 'ward', wardGeoId });
}

interface WardPanelProps {
  wardGeoId: string;
  wardLabel: string;
  members: CadreMemberCard[];
  activeVerticals: WardVertical[];
  boothNumbers: string[];
  canEdit?: boolean;
  initialExpandedBooth?: string;
  onViewWardCommittee: (verticalId: string) => void;
  onViewBoothCommittee: (boothNo: string) => void;
  onAddBoothCommitteeMember: (boothNo: string) => void;
}

function formatBoothLabel(boothNo: string): string {
  const numeric = Number.parseInt(boothNo, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : boothNo;
}

function verticalHeadLabel(verticalName: string): string {
  return `${verticalName.toUpperCase()} HEAD`;
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-t-xl border border-b-0 border-primary/20 bg-primary/5 px-4 py-2.5 dark:border-primary/50 dark:bg-primary/10">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        {children}
      </p>
    </div>
  );
}

function PanelActionLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="shrink-0 text-left text-[11px] font-semibold tracking-[0.08em] text-primary uppercase hover:underline sm:text-right"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function WardPanel({
  wardGeoId,
  wardLabel,
  members,
  activeVerticals,
  boothNumbers,
  canEdit,
  initialExpandedBooth,
  onViewWardCommittee,
  onViewBoothCommittee,
  onAddBoothCommitteeMember,
}: WardPanelProps) {
  const [expandedBooths, setExpandedBooths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (initialExpandedBooth) initial.add(initialExpandedBooth);
    return initial;
  });

  useEffect(() => {
    if (!initialExpandedBooth) return;
    setExpandedBooths((prev) => {
      if (prev.has(initialExpandedBooth)) return prev;
      const next = new Set(prev);
      next.add(initialExpandedBooth);
      return next;
    });
  }, [initialExpandedBooth]);

  const leadershipEntries = useMemo(
    () =>
      [...activeVerticals]
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((vertical) => {
          const head = findWardHeadForVertical(members, wardGeoId, vertical.id);
          if (!head) return null;
          return {
            vertical,
            headName: getMemberDisplayName(head),
            headPhone: getMemberPhone(head),
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null),
    [activeVerticals, members, wardGeoId],
  );

  const toggleBooth = (boothNo: string) => {
    setExpandedBooths((prev) => {
      const next = new Set(prev);
      if (next.has(boothNo)) next.delete(boothNo);
      else next.add(boothNo);
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1">
        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          Ward No. {wardLabel} Panel
        </h2>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
        <SectionHeader>Ward Leadership</SectionHeader>
        <div className="divide-y border border-t-0 border-primary/20 bg-card dark:border-primary/50">
          {leadershipEntries.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No ward leadership assigned for this ward yet.
            </p>
          ) : (
            leadershipEntries.map((entry) => (
              <div
                key={entry.vertical.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                    {verticalHeadLabel(entry.vertical.name)}
                  </p>
                  <p className="mt-1 text-sm font-medium">{entry.headName}</p>
                  <div className="mt-1 text-sm">
                    <ContactWithCall phone={entry.headPhone} />
                  </div>
                </div>
                <PanelActionLink onClick={() => onViewWardCommittee(entry.vertical.id)}>
                  [View Committee]
                </PanelActionLink>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
        <SectionHeader>Mobile Booth Management</SectionHeader>
        <div className="border border-t-0 border-primary/20 bg-card dark:border-primary/50">
          {boothNumbers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              No booths configured for this ward.
            </p>
          ) : (
            boothNumbers.map((boothNo) => {
              const isExpanded = expandedBooths.has(boothNo);
              const boothHead = findSeniorMemberForGeo(members, {
                scope: 'booth',
                wardGeoId,
                boothNo,
              });
              const committeeMembers = filterBoothCommitteeMembers(
                members,
                wardGeoId,
                boothNo,
              );
              const boothHeadPhone = boothHead ? getMemberPhone(boothHead) : null;

              return (
                <div
                  key={boothNo}
                  className="border-b border-border last:border-b-0"
                >
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold">
                      Booth No. {formatBoothLabel(boothNo)}
                    </p>
                    <PanelActionLink onClick={() => toggleBooth(boothNo)}>
                      {isExpanded ? '[-] Collapse' : '[+] Expand'}
                    </PanelActionLink>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
                      <Label className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        BLA
                      </Label>
                      <div className="divide-y overflow-hidden rounded-xl border border-border bg-background px-3 py-2.5">
                        <div className="space-y-1.5">
                          <p className="text-sm">
                            {boothHead ? getMemberDisplayName(boothHead) : '—'}
                            <div className="py-1.5 text-sm">
                              {boothHeadPhone ? (
                                <ContactWithCall phone={boothHeadPhone} />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </p>
                        </div>
                      </div>

                      {committeeMembers.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                            Booth Committee Members ({committeeMembers.length})
                          </Label>
                          <div className="divide-y overflow-hidden rounded-xl border border-border bg-background">
                            {committeeMembers.map((member) => {
                              const memberPhone = getMemberPhone(member);
                              return (
                                <div
                                  key={member.id}
                                  className="space-y-1 px-3 py-2.5 text-sm"
                                >
                                  <p className="font-medium">
                                    {getMemberDisplayName(member)}
                                  </p>
                                  {memberPhone ? (
                                    <ContactWithCall phone={memberPhone} />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 flex-1 rounded-xl"
                          onClick={() => onViewBoothCommittee(boothNo)}
                        >
                          View Booth Committee Members
                        </Button>
                        {canEdit && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 flex-1 rounded-xl"
                            onClick={() => onAddBoothCommitteeMember(boothNo)}
                          >
                            <Plus className="mr-1.5 size-4" />
                            Add Committee Member
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

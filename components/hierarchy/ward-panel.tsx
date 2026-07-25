'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { LeadershipSection, PanelActionLink, PanelSectionHeader } from './leadership-section';
import { MemberVoterIdField } from './member-voter-id-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getMemberDisplayName } from '@/lib/hierarchy/geo-attribution';
import {
  findBoothBlaForVertical,
  findBoothHeadForVertical,
  findWardHeadForVertical,
} from '@/lib/hierarchy/vertical-leaders';
import { verticalAllowsBooth } from '@/lib/hierarchy/wing-depth';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';

type WardVertical = {
  id: string;
  name: string;
  sortOrder: number;
  maxGeoLevel: 'ward' | 'booth';
};

interface WardPanelProps {
  wardGeoId: string;
  wardLabel: string;
  members: CadreMemberCard[];
  activeVerticals: WardVertical[];
  boothNumbers: string[];
  canEdit?: boolean;
  initialExpandedBooth?: string;
  onViewWardCommittee: (verticalId: string) => void;
  onViewBoothCommittee: (boothNo: string, verticalId: string) => void;
  onAddBoothCommitteeMember: (boothNo: string) => void;
  onVoterIdUpdated?: () => void;
}

function formatBoothLabel(boothNo: string): string {
  const numeric = Number.parseInt(boothNo, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : boothNo;
}

function boothNumbersMatch(a: string, b: string): boolean {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  return a.trim() === b.trim();
}

function resolveBoothKey(
  boothNumbers: string[],
  target: string | undefined,
): string | null {
  if (!target?.trim()) return null;
  return boothNumbers.find((boothNo) => boothNumbersMatch(boothNo, target)) ?? null;
}

export function boothSectionDomId(boothNo: string): string {
  return `booth-section-${boothNo}`;
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
  onVoterIdUpdated,
}: WardPanelProps) {
  const { t } = useTranslations();
  const resolvedExpandedBooth = useMemo(
    () => resolveBoothKey(boothNumbers, initialExpandedBooth),
    [boothNumbers, initialExpandedBooth],
  );

  const [expandedBooths, setExpandedBooths] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (resolvedExpandedBooth) initial.add(resolvedExpandedBooth);
    return initial;
  });

  useEffect(() => {
    if (!resolvedExpandedBooth) return;

    setExpandedBooths((prev) => {
      if (prev.has(resolvedExpandedBooth)) return prev;
      const next = new Set(prev);
      next.add(resolvedExpandedBooth);
      return next;
    });

    let cancelled = false;
    const scrollToBooth = () => {
      if (cancelled) return;
      document
        .getElementById(boothSectionDomId(resolvedExpandedBooth))
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Retry briefly so scroll still works after the loading spinner unmounts
    // and the expanded booth section finishes painting.
    const frame = requestAnimationFrame(scrollToBooth);
    const retry = window.setTimeout(scrollToBooth, 150);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(retry);
    };
  }, [resolvedExpandedBooth, wardGeoId]);

  const sortedVerticals = useMemo(
    () => [...activeVerticals].sort((a, b) => a.sortOrder - b.sortOrder),
    [activeVerticals],
  );

  const boothVerticals = useMemo(
    () => sortedVerticals.filter((vertical) => verticalAllowsBooth(vertical.maxGeoLevel)),
    [sortedVerticals],
  );

  const wardLeadershipEntries = useMemo(
    () =>
      sortedVerticals.map((vertical) => ({
        verticalId: vertical.id,
        verticalName: vertical.name,
        head: findWardHeadForVertical(members, wardGeoId, vertical.id),
      })),
    [sortedVerticals, members, wardGeoId],
  );

  const toggleBooth = (boothNo: string) => {
    setExpandedBooths((prev) => {
      const next = new Set(prev);
      if (next.has(boothNo)) next.delete(boothNo);
      else next.add(boothNo);
      return next;
    });
  };

  const vacantLabel = t('hierarchyModule.vacantPosition');
  const viewCommitteeLabel = t('hierarchyModule.viewCommitteeLink');

  return (
    <div className="flex flex-col gap-4">
      <div className="px-1">
        <h2 className="text-base font-bold tracking-tight sm:text-lg">
          {t('hierarchyModule.wardPanelTitle', { ward: wardLabel })}
        </h2>
      </div>

      <LeadershipSection
        title={t('hierarchyModule.wardLeadershipTitle')}
        entries={wardLeadershipEntries}
        vacantLabel={vacantLabel}
        viewCommitteeLabel={viewCommitteeLabel}
        geoLevel="ward"
        onViewCommittee={onViewWardCommittee}
        canEdit={canEdit}
        onVoterIdUpdated={onVoterIdUpdated}
      />

      <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
        <PanelSectionHeader>{t('hierarchyModule.boothManagementTitle')}</PanelSectionHeader>
        <div className="border border-t-0 border-primary/20 bg-card dark:border-primary/50">
          {boothNumbers.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t('hierarchyModule.noBoothsConfigured')}
            </p>
          ) : (
            boothNumbers.map((boothNo) => {
              const isExpanded = expandedBooths.has(boothNo);
              const boothLeadershipEntries = boothVerticals.flatMap((vertical) => {
                const adhyaksh = findBoothHeadForVertical(
                  members,
                  wardGeoId,
                  boothNo,
                  vertical.id,
                );
                const bla = findBoothBlaForVertical(
                  members,
                  wardGeoId,
                  boothNo,
                  vertical.id,
                );
                return [
                  {
                    key: `${vertical.id}-adhyaksh`,
                    verticalId: vertical.id,
                    roleLabel: t('hierarchyModule.verticalBoothAdhyakshLabel', {
                      vertical: vertical.name,
                    }),
                    head: adhyaksh,
                    showCommittee: true,
                  },
                  {
                    key: `${vertical.id}-bla`,
                    verticalId: vertical.id,
                    roleLabel: 'BLA (Booth Level Agent)',
                    head: bla,
                    showCommittee: false,
                  },
                ];
              });

              return (
                <div
                  key={boothNo}
                  id={boothSectionDomId(boothNo)}
                  className="scroll-mt-24 border-b border-border last:border-b-0"
                >
                  <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold">
                      {t('hierarchyModule.boothNumber', {
                        booth: formatBoothLabel(boothNo),
                      })}
                    </p>
                    <PanelActionLink onClick={() => toggleBooth(boothNo)}>
                      {isExpanded
                        ? t('hierarchyModule.collapseBooth')
                        : t('hierarchyModule.expandBooth')}
                    </PanelActionLink>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-border bg-muted/20 px-4 py-4">
                      <Label className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                        {t('hierarchyModule.boothLeadershipTitle')}
                      </Label>
                      {boothVerticals.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No booth-level wings configured.
                        </p>
                      ) : (
                        <div className="divide-y overflow-hidden rounded-xl border border-border bg-background">
                          {boothLeadershipEntries.map((entry) => (
                            <div
                              key={entry.key}
                              className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="min-w-0 flex-1 space-y-1.5">
                                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                  {entry.roleLabel}
                                </p>
                                <p
                                  className={
                                    entry.head
                                      ? 'text-sm font-medium'
                                      : 'text-sm italic text-muted-foreground'
                                  }
                                >
                                  {entry.head
                                    ? getMemberDisplayName(entry.head)
                                    : vacantLabel}
                                </p>
                                {entry.head ? (
                                  <MemberVoterIdField
                                    member={entry.head}
                                    canEdit={canEdit}
                                    onUpdated={onVoterIdUpdated}
                                    compact
                                  />
                                ) : null}
                              </div>
                              {entry.showCommittee ? (
                                <PanelActionLink
                                  onClick={() =>
                                    onViewBoothCommittee(boothNo, entry.verticalId)
                                  }
                                  disabled={!entry.head}
                                >
                                  {viewCommitteeLabel}
                                </PanelActionLink>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}

                      {canEdit && boothVerticals.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full rounded-xl sm:w-auto"
                          onClick={() => onAddBoothCommitteeMember(boothNo)}
                        >
                          <Plus className="mr-1.5 size-4" />
                          {t('hierarchyModule.addBoothCommitteeMember')}
                        </Button>
                      )}
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

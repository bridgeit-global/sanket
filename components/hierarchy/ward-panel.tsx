'use client';

import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { LeadershipSection, PanelActionLink } from './leadership-section';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getMemberDisplayName } from '@/lib/hierarchy/geo-attribution';
import {
  findBoothHeadForVertical,
  findWardHeadForVertical,
} from '@/lib/hierarchy/vertical-leaders';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';

type WardVertical = {
  id: string;
  name: string;
  sortOrder: number;
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
}

function formatBoothLabel(boothNo: string): string {
  const numeric = Number.parseInt(boothNo, 10);
  return Number.isFinite(numeric) ? String(numeric).padStart(2, '0') : boothNo;
}

import { PanelSectionHeader } from './leadership-section';

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
  const { t } = useTranslations();
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

  const sortedVerticals = useMemo(
    () => [...activeVerticals].sort((a, b) => a.sortOrder - b.sortOrder),
    [activeVerticals],
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
        onViewCommittee={onViewWardCommittee}
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
              const boothLeadershipEntries = sortedVerticals.map((vertical) => ({
                verticalId: vertical.id,
                verticalName: vertical.name,
                head: findBoothHeadForVertical(members, wardGeoId, boothNo, vertical.id),
              }));

              return (
                <div
                  key={boothNo}
                  className="border-b border-border last:border-b-0"
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
                      <div className="divide-y overflow-hidden rounded-xl border border-border bg-background">
                        {boothLeadershipEntries.map((entry) => (
                          <div
                            key={entry.verticalId}
                            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                                {t('hierarchyModule.verticalHeadLabel', {
                                  vertical: entry.verticalName,
                                })}
                              </p>
                              <p
                                className={
                                  entry.head
                                    ? 'mt-1 text-sm font-medium'
                                    : 'mt-1 text-sm italic text-muted-foreground'
                                }
                              >
                                {entry.head ? getMemberDisplayName(entry.head) : vacantLabel}
                              </p>
                            </div>
                            <PanelActionLink
                              onClick={() => onViewBoothCommittee(boothNo, entry.verticalId)}
                              disabled={!entry.head}
                            >
                              {viewCommitteeLabel}
                            </PanelActionLink>
                          </div>
                        ))}
                      </div>

                      {canEdit && (
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

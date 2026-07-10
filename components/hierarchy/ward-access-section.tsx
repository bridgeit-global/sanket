'use client';

import { ChevronRight } from 'lucide-react';
import { getMemberDisplayName } from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

export type WardAccessEntry = {
  wardGeoId: string;
  wardLabel: string;
  boothCount: number;
  wingsAssigned: number;
  wingsTotal: number;
  primaryHead: CadreMemberCard | null;
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-t-xl border border-b-0 border-primary/20 bg-primary/5 px-4 py-2.5 dark:border-primary/50 dark:bg-primary/10">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        {children}
      </p>
    </div>
  );
}

interface WardAccessSectionProps {
  entries: WardAccessEntry[];
  vacantLabel: string;
  onOpenWard: (wardGeoId: string) => void;
}

export function WardAccessSection({
  entries,
  vacantLabel,
  onOpenWard,
}: WardAccessSectionProps) {
  const { t } = useTranslations();

  return (
    <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
      <SectionHeader>
        {t('hierarchyModule.wardAccessTitle', { count: String(entries.length) })}
      </SectionHeader>
      <div className="grid gap-2 border border-t-0 border-primary/20 bg-card p-3 sm:grid-cols-2 xl:grid-cols-3 dark:border-primary/50">
        {entries.map((entry) => {
          const headName = entry.primaryHead
            ? getMemberDisplayName(entry.primaryHead)
            : vacantLabel;
          const boothLabel =
            entry.boothCount > 0
              ? t('hierarchyModule.wardBoothCount', { count: String(entry.boothCount) })
              : t('hierarchyModule.wardBoothCountZero');

          return (
            <button
              key={entry.wardGeoId}
              type="button"
              onClick={() => onOpenWard(entry.wardGeoId)}
              className={cn(
                'group flex items-center gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5 text-left transition-colors',
                'hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {t('hierarchyModule.wardNumber', { ward: entry.wardLabel })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {boothLabel}
                  {' · '}
                  {t('hierarchyModule.wardWingsAssigned', {
                    assigned: String(entry.wingsAssigned),
                    total: String(entry.wingsTotal),
                  })}
                </p>
                <p
                  className={cn(
                    'mt-1 truncate text-xs',
                    entry.primaryHead
                      ? 'font-medium text-foreground'
                      : 'italic text-muted-foreground',
                  )}
                >
                  {headName}
                </p>
              </div>
              <ChevronRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

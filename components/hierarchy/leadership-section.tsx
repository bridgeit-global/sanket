'use client';

import { ContactWithCall } from './contact-with-call';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';

export type LeadershipEntry = {
  verticalId: string;
  verticalName: string;
  head: CadreMemberCard | null;
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

export function PanelActionLink({
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

interface LeadershipSectionProps {
  title: string;
  entries: LeadershipEntry[];
  vacantLabel: string;
  viewCommitteeLabel: string;
  onViewCommittee?: (verticalId: string) => void;
}

export function LeadershipSection({
  title,
  entries,
  vacantLabel,
  viewCommitteeLabel,
  onViewCommittee,
}: LeadershipSectionProps) {
  const { t } = useTranslations();

  return (
    <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
      <SectionHeader>{title}</SectionHeader>
      <div className="divide-y border border-t-0 border-primary/20 bg-card dark:border-primary/50">
        {entries.map((entry) => {
          const headName = entry.head ? getMemberDisplayName(entry.head) : vacantLabel;
          const headPhone = entry.head ? getMemberPhone(entry.head) : null;

          return (
            <div
              key={entry.verticalId}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {t('hierarchyModule.verticalHeadLabel', { vertical: entry.verticalName })}
                </p>
                <p
                  className={
                    entry.head
                      ? 'mt-1 text-sm font-medium'
                      : 'mt-1 text-sm italic text-muted-foreground'
                  }
                >
                  {headName}
                </p>
                {entry.head && (
                  <div className="mt-1 text-sm">
                    <ContactWithCall phone={headPhone} />
                  </div>
                )}
              </div>
              {onViewCommittee && (
                <PanelActionLink onClick={() => onViewCommittee(entry.verticalId)}>
                  {viewCommitteeLabel}
                </PanelActionLink>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

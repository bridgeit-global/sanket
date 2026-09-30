'use client';

import { ChevronRight } from 'lucide-react';
import { MemberDobField } from './member-dob-field';
import { MemberPhoneField } from './member-phone-field';
import { MemberPositionField } from './member-position-field';
import { MemberVoterIdField } from './member-voter-id-field';
import {
  getMemberDisplayName,
  getMemberPhone,
} from '@/lib/hierarchy/geo-attribution';
import type { CadreMemberCard } from '@/lib/hierarchy/types';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';

export type LeadershipEntry = {
  verticalId: string;
  verticalName: string;
  head: CadreMemberCard | null;
};

export function PanelSectionHeader({ children }: { children: React.ReactNode }) {
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
  className,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        disabled
          ? 'cursor-not-allowed border-border/60 bg-muted/30 text-muted-foreground opacity-70'
          : 'border-primary/30 bg-background text-primary hover:bg-primary/5',
        className,
      )}
    >
      <span>{children}</span>
      <ChevronRight className="size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

const VERTICAL_ADHYAKSH_LABEL_KEYS = {
  taluka: 'hierarchyModule.verticalTalukaAdhyakshLabel',
  ward: 'hierarchyModule.verticalWardAdhyakshLabel',
  booth: 'hierarchyModule.verticalBoothAdhyakshLabel',
} as const;

interface LeadershipSectionProps {
  title: string;
  entries: LeadershipEntry[];
  vacantLabel: string;
  viewCommitteeLabel: string;
  /** Geo level for the role label (e.g. "Basic Taluka Adhyaksh"). */
  geoLevel: keyof typeof VERTICAL_ADHYAKSH_LABEL_KEYS;
  onViewCommittee?: (verticalId: string) => void;
  canEdit?: boolean;
  onEditMember?: (member: CadreMemberCard) => void;
  onVoterIdUpdated?: () => void;
}

export function LeadershipSection({
  title,
  entries,
  vacantLabel,
  viewCommitteeLabel,
  geoLevel,
  onViewCommittee,
  canEdit,
  onEditMember,
  onVoterIdUpdated,
}: LeadershipSectionProps) {
  const { t } = useTranslations();
  const roleLabelKey = VERTICAL_ADHYAKSH_LABEL_KEYS[geoLevel];

  return (
    <div className="overflow-hidden rounded-xl border border-primary/20 dark:border-primary/50">
      <PanelSectionHeader>
        {title} ({entries.length})
      </PanelSectionHeader>
      <div className="grid gap-2 border border-t-0 border-primary/20 bg-card p-3 sm:grid-cols-2 dark:border-primary/50">
        {entries.map((entry) => {
          const head = entry.head;
          const headName = head ? getMemberDisplayName(head) : vacantLabel;
          const headPhone = head ? getMemberPhone(head) : null;
          const hasPosition = Boolean(
            head?.posts.some(
              (post) =>
                post.verticalId === entry.verticalId &&
                post.positionLevelKey === geoLevel &&
                Boolean(post.positionName?.trim() || post.label?.trim()),
            ),
          );

          return (
            <div
              key={entry.verticalId}
              className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5"
            >
              <div className="min-w-0 space-y-1.5">
                <MemberPositionField
                  label={t(roleLabelKey, { vertical: entry.verticalName })}
                  missing={Boolean(head) && !hasPosition}
                  canEdit={canEdit && Boolean(head) && !hasPosition}
                  onEdit={
                    head && onEditMember && !hasPosition
                      ? () => onEditMember(head)
                      : undefined
                  }
                />
                <p
                  className={cn(
                    'truncate text-sm',
                    head
                      ? 'font-semibold text-foreground'
                      : 'italic text-muted-foreground',
                  )}
                >
                  {headName}
                </p>
                {head ? (
                  <>
                    <MemberVoterIdField
                      member={head}
                      canEdit={canEdit}
                      onUpdated={onVoterIdUpdated}
                      compact
                    />
                    <MemberDobField
                      member={head}
                      canEdit={canEdit}
                      onUpdated={onVoterIdUpdated}
                      compact
                    />
                  </>
                ) : null}
              </div>

              {head ? (
                <MemberPhoneField
                  member={head}
                  canEdit={canEdit}
                  onUpdated={onVoterIdUpdated}
                  compact
                />
              ) : null}

              {onViewCommittee ? (
                <PanelActionLink
                  onClick={() => onViewCommittee(entry.verticalId)}
                  disabled={!head}
                  className={cn('w-full', head && headPhone && 'sm:w-auto')}
                >
                  {viewCommitteeLabel}
                </PanelActionLink>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useTranslations } from '@/hooks/use-translations';
import { isOpenGovFollowUpStatus } from '@/lib/gov-follow-up/constants';
import type { GovFollowUpPriority, GovFollowUpStatus } from '@/lib/db/schema';

export function isMatterOverdue(
  nextFollowUpOn: string | null,
  status: string,
  todayYmd: string,
): boolean {
  if (!nextFollowUpOn || !isOpenGovFollowUpStatus(status)) return false;
  return nextFollowUpOn < todayYmd;
}

const STATUS_CLASS: Record<GovFollowUpStatus, string> = {
  pending:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
  under_process:
    'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/50 dark:text-sky-200',
  approval_pending:
    'border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-200',
  sanctioned:
    'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
  rejected: 'border-destructive/30 bg-destructive/10 text-destructive',
  closed: 'border-border bg-muted text-muted-foreground',
};

export function GovFollowUpStatusBadge({
  status,
}: {
  status: GovFollowUpStatus;
}) {
  const { t } = useTranslations();
  return (
    <Badge variant="outline" className={cn('font-medium', STATUS_CLASS[status])}>
      {t(`govFollowUp.status.${status}`)}
    </Badge>
  );
}

export function GovFollowUpPriorityBadge({
  priority,
}: {
  priority: GovFollowUpPriority;
}) {
  const { t } = useTranslations();
  if (priority === 'normal') return null;
  return (
    <Badge variant={priority === 'urgent' ? 'destructive' : 'secondary'}>
      {t(`govFollowUp.priority.${priority}`)}
    </Badge>
  );
}

'use client';

import { ClipboardList } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { TablePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, getTodayDateStringIST } from '@/lib/ist-date';
import { useTranslations } from '@/hooks/use-translations';
import { cn } from '@/lib/utils';
import type { GovFollowUpMatterListItem } from '@/lib/db/schema';
import {
  GovFollowUpPriorityBadge,
  GovFollowUpStatusBadge,
  isMatterOverdue,
} from './matter-status';

export function pendingWithLabel(matter: {
  officerName: string | null;
  designation: string | null;
  officeName: string | null;
  deskName: string | null;
}): string {
  return (
    [matter.officerName, matter.designation, matter.officeName, matter.deskName]
      .filter(Boolean)
      .join(' · ') || '—'
  );
}

function MatterBadges({ matter }: { matter: GovFollowUpMatterListItem }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <GovFollowUpStatusBadge status={matter.status} />
      <GovFollowUpPriorityBadge priority={matter.priority} />
    </div>
  );
}

function MatterCard({
  matter,
  actionColumn,
  overdue,
  onOpen,
}: {
  matter: GovFollowUpMatterListItem;
  actionColumn: 'today' | 'next';
  overdue: boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslations();
  const action =
    actionColumn === 'next'
      ? matter.nextFollowUpOn
        ? formatDisplayDateIST(matter.nextFollowUpOn)
        : '—'
      : matter.nextAction || '—';

  return (
    <button
      type="button"
      onClick={() => onOpen(matter.id)}
      className={cn(
        'w-full rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/40',
        overdue && 'border-l-4 border-l-destructive',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium leading-snug">{matter.subject}</div>
          <div className="text-muted-foreground mt-0.5 text-xs">
            {matter.followUpNo}
            {matter.departmentName ? ` · ${matter.departmentName}` : ''}
          </div>
        </div>
        <MatterBadges matter={matter} />
      </div>
      <dl className="mt-3 grid gap-2 text-sm">
        <div>
          <dt className="text-muted-foreground text-xs">
            {t('govFollowUp.columns.pendingWith')}
          </dt>
          <dd>{pendingWithLabel(matter)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <dt className="text-muted-foreground text-xs">
              {t('govFollowUp.columns.lastUpdate')}
            </dt>
            <dd className="line-clamp-2">{matter.lastResponse || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">
              {actionColumn === 'next'
                ? t('govFollowUp.columns.nextFollowUp')
                : t('govFollowUp.columns.todaysAction')}
            </dt>
            <dd className={cn(overdue && 'font-medium text-destructive')}>
              {action}
            </dd>
          </div>
        </div>
      </dl>
    </button>
  );
}

export function GovFollowUpMatterTable({
  matters,
  total,
  page,
  limit,
  onPageChange,
  onPageSizeChange,
  onOpen,
  onCreate,
  actionColumn = 'today',
}: {
  matters: GovFollowUpMatterListItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpen: (id: string) => void;
  onCreate?: () => void;
  actionColumn?: 'today' | 'next';
}) {
  const { t } = useTranslations();
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const today = getTodayDateStringIST();

  const empty = (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <ClipboardList className="text-muted-foreground/50 size-10" />
      <p className="font-medium">{t('govFollowUp.empty')}</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        {t('govFollowUp.emptyHint')}
      </p>
      {onCreate ? (
        <Button className="mt-2" onClick={onCreate}>
          {t('govFollowUp.newMatter')}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div>
      <div className="space-y-2 md:hidden">
        {matters.length === 0
          ? empty
          : matters.map((matter) => (
              <MatterCard
                key={matter.id}
                matter={matter}
                actionColumn={actionColumn}
                overdue={isMatterOverdue(
                  matter.nextFollowUpOn,
                  matter.status,
                  today,
                )}
                onOpen={onOpen}
              />
            ))}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        {matters.length === 0 ? (
          empty
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('govFollowUp.columns.matter')}</TableHead>
                <TableHead>{t('govFollowUp.columns.department')}</TableHead>
                <TableHead>{t('govFollowUp.columns.pendingWith')}</TableHead>
                <TableHead>{t('govFollowUp.columns.lastUpdate')}</TableHead>
                <TableHead>
                  {actionColumn === 'next'
                    ? t('govFollowUp.columns.nextFollowUp')
                    : t('govFollowUp.columns.todaysAction')}
                </TableHead>
                <TableHead>{t('govFollowUp.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matters.map((matter) => {
                const overdue = isMatterOverdue(
                  matter.nextFollowUpOn,
                  matter.status,
                  today,
                );
                return (
                  <TableRow
                    key={matter.id}
                    className={cn(
                      'cursor-pointer',
                      overdue && 'border-l-4 border-l-destructive',
                    )}
                    tabIndex={0}
                    onClick={() => onOpen(matter.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen(matter.id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">
                      <div className="max-w-[280px] leading-snug">
                        {matter.subject}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {matter.followUpNo}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{matter.departmentName || '—'}</div>
                      {matter.locationName ? (
                        <div className="text-muted-foreground text-xs">
                          {matter.locationName}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div>{pendingWithLabel(matter)}</div>
                      {matter.presentStage ? (
                        <div className="text-muted-foreground text-xs">
                          {matter.presentStage}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="line-clamp-2 text-sm">
                        {matter.lastResponse || '—'}
                      </div>
                      {matter.lastFollowUpOn ? (
                        <div className="text-muted-foreground text-xs">
                          {formatDisplayDateIST(matter.lastFollowUpOn)}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {actionColumn === 'next' ? (
                        <span
                          className={cn(
                            overdue && 'font-medium text-destructive',
                          )}
                        >
                          {matter.nextFollowUpOn
                            ? formatDisplayDateIST(matter.nextFollowUpOn)
                            : '—'}
                        </span>
                      ) : (
                        matter.nextAction || '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <MatterBadges matter={matter} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {total > 0 ? (
        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          pageSize={limit}
          totalItems={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      ) : null}
    </div>
  );
}

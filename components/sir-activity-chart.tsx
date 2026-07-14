'use client';

import { useState } from 'react';
import { useTranslations } from '@/hooks/use-translations';
import type {
  SirActivityBucket,
  SirActivityGroupStat,
  SirActivityStats,
} from '@/lib/db/sir-queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface SirActivityChartProps {
  stats: SirActivityStats;
}

type DrillDownState = {
  title: string;
  voterIds: string[];
} | null;

/** Fallback labels when the live catalog is stale (e.g. cached PWA bundle). */
const FALLBACKS: Record<string, string> = {
  'sir.dashboard.title': 'SIR Activity',
  'sir.dashboard.searchedToday': 'Voters Searched Today',
  'sir.dashboard.searchedWeek': 'Voters Searched This Week',
  'sir.dashboard.downloadedToday': 'Downloads Today',
  'sir.dashboard.downloadedWeek': 'Downloads This Week',
  'sir.dashboard.byUser': 'By User',
  'sir.dashboard.byWard': 'By Ward',
  'sir.dashboard.byPart': 'By Part',
  'sir.dashboard.user': 'User',
  'sir.dashboard.ward': 'Ward',
  'sir.dashboard.part': 'Part',
  'sir.dashboard.searchedTodayShort': 'Searched (Today)',
  'sir.dashboard.searchedWeekShort': 'Searched (Week)',
  'sir.dashboard.downloadedTodayShort': 'Downloaded (Today)',
  'sir.dashboard.downloadedWeekShort': 'Downloaded (Week)',
  'sir.dashboard.noActivity': 'No SIR activity yet',
  'sir.dashboard.drillDownTitle': 'Voter IDs',
  'sir.dashboard.drillDownEmpty': 'No voters in this bucket',
  'sir.dashboard.drillDownHint': 'Click a count to see voter IDs',
  'sir.dashboard.voterCount': '{count} voters',
};

function MetricCard({
  value,
  label,
  className,
  valueClassName,
  onClick,
}: {
  value: number;
  label: string;
  className?: string;
  valueClassName?: string;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick) && value > 0;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onClick}
      className={cn(
        'rounded-lg p-4 text-center transition-colors',
        className,
        clickable && 'cursor-pointer hover:ring-2 hover:ring-primary/40',
        !clickable && 'cursor-default',
      )}
    >
      <div className={cn('text-2xl font-bold', valueClassName)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </button>
  );
}

function CountCell({
  bucket,
  onClick,
  className,
}: {
  bucket: SirActivityBucket;
  onClick: () => void;
  className?: string;
}) {
  const clickable = bucket.count > 0;
  return (
    <td className={cn('py-2 text-right', className ?? 'px-2')}>
      {clickable ? (
        <button
          type="button"
          onClick={onClick}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {bucket.count}
        </button>
      ) : (
        <span>{bucket.count}</span>
      )}
    </td>
  );
}

function ActivityGroupTable({
  title,
  labelHeader,
  rows,
  t,
  openBucket,
}: {
  title: string;
  labelHeader: string;
  rows: SirActivityGroupStat[];
  t: (key: string, params?: Record<string, string | number>) => string;
  openBucket: (label: string, bucket: SirActivityBucket, groupLabel?: string) => void;
}) {
  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">{labelHeader}</th>
              <th className="py-2 px-2 text-right font-medium">
                {t('sir.dashboard.searchedTodayShort')}
              </th>
              <th className="py-2 px-2 text-right font-medium">
                {t('sir.dashboard.searchedWeekShort')}
              </th>
              <th className="py-2 px-2 text-right font-medium">
                {t('sir.dashboard.downloadedTodayShort')}
              </th>
              <th className="py-2 pl-2 text-right font-medium">
                {t('sir.dashboard.downloadedWeekShort')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b last:border-0">
                <td className="py-2 pr-2 font-mono">{row.label}</td>
                <CountCell
                  bucket={row.searchedToday}
                  onClick={() =>
                    openBucket(
                      t('sir.dashboard.searchedTodayShort'),
                      row.searchedToday,
                      row.label,
                    )
                  }
                />
                <CountCell
                  bucket={row.searchedWeek}
                  onClick={() =>
                    openBucket(
                      t('sir.dashboard.searchedWeekShort'),
                      row.searchedWeek,
                      row.label,
                    )
                  }
                />
                <CountCell
                  bucket={row.downloadedToday}
                  onClick={() =>
                    openBucket(
                      t('sir.dashboard.downloadedTodayShort'),
                      row.downloadedToday,
                      row.label,
                    )
                  }
                />
                <CountCell
                  bucket={row.downloadedWeek}
                  className="pl-2"
                  onClick={() =>
                    openBucket(
                      t('sir.dashboard.downloadedWeekShort'),
                      row.downloadedWeek,
                      row.label,
                    )
                  }
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SirActivityChart({ stats }: SirActivityChartProps) {
  const { t: translate } = useTranslations();
  const [drillDown, setDrillDown] = useState<DrillDownState>(null);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const value = translate(key, params);
    if (value !== key) return value;
    const fallback = FALLBACKS[key];
    if (!fallback) return key;
    if (!params) return fallback;
    return fallback.replace(/\{(\w+)\}/g, (_m, paramKey: string) =>
      params[paramKey]?.toString() ?? _m,
    );
  };

  const openBucket = (
    label: string,
    bucket: SirActivityBucket,
    groupLabel?: string,
  ) => {
    if (bucket.count === 0) return;
    setDrillDown({
      title: groupLabel ? `${label} — ${groupLabel}` : label,
      voterIds: bucket.voterIds,
    });
  };

  const hasAnyGroup =
    stats.byUser.length > 0 ||
    (stats.byWard?.length ?? 0) > 0 ||
    (stats.byPart?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground">{t('sir.dashboard.drillDownHint')}</p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          value={stats.searchedToday.count}
          label={t('sir.dashboard.searchedToday')}
          className="bg-primary/10"
          valueClassName="text-primary"
          onClick={() =>
            openBucket(t('sir.dashboard.searchedToday'), stats.searchedToday)
          }
        />
        <MetricCard
          value={stats.searchedWeek.count}
          label={t('sir.dashboard.searchedWeek')}
          className="bg-primary/5"
          valueClassName="text-primary"
          onClick={() =>
            openBucket(t('sir.dashboard.searchedWeek'), stats.searchedWeek)
          }
        />
        <MetricCard
          value={stats.downloadedToday.count}
          label={t('sir.dashboard.downloadedToday')}
          className="bg-blue-500/10"
          valueClassName="text-blue-600 dark:text-blue-400"
          onClick={() =>
            openBucket(t('sir.dashboard.downloadedToday'), stats.downloadedToday)
          }
        />
        <MetricCard
          value={stats.downloadedWeek.count}
          label={t('sir.dashboard.downloadedWeek')}
          className="bg-blue-500/5"
          valueClassName="text-blue-600 dark:text-blue-400"
          onClick={() =>
            openBucket(t('sir.dashboard.downloadedWeek'), stats.downloadedWeek)
          }
        />
      </div>

      {hasAnyGroup ? (
        <>
          <ActivityGroupTable
            title={t('sir.dashboard.byUser')}
            labelHeader={t('sir.dashboard.user')}
            rows={stats.byUser}
            t={t}
            openBucket={openBucket}
          />
          <ActivityGroupTable
            title={t('sir.dashboard.byWard')}
            labelHeader={t('sir.dashboard.ward')}
            rows={stats.byWard ?? []}
            t={t}
            openBucket={openBucket}
          />
          <ActivityGroupTable
            title={t('sir.dashboard.byPart')}
            labelHeader={t('sir.dashboard.part')}
            rows={stats.byPart ?? []}
            t={t}
            openBucket={openBucket}
          />
        </>
      ) : (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('sir.dashboard.noActivity')}
        </p>
      )}

      <Dialog
        open={drillDown !== null}
        onOpenChange={(open) => {
          if (!open) setDrillDown(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] max-w-md overflow-hidden sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.title ?? t('sir.dashboard.drillDownTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('sir.dashboard.voterCount', {
                count: drillDown?.voterIds.length ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {drillDown && drillDown.voterIds.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {drillDown.voterIds.map((voterId) => (
                  <li
                    key={voterId}
                    className="flex items-center justify-between px-3 py-2 font-mono text-sm"
                  >
                    <span>{voterId}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('sir.dashboard.drillDownEmpty')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

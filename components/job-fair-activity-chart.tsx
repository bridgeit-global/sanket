'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from '@/hooks/use-translations';
import { getTodayDateStringIST } from '@/lib/ist-date';
import type {
  JobFairActivityBucket,
  JobFairActivityGroupStat,
  JobFairActivityStats,
} from '@/lib/db/job-fair-queries';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface JobFairActivityChartProps {
  stats: JobFairActivityStats;
}

type DrillCountKey =
  | 'jobFair.dashboard.registrationCount'
  | 'jobFair.dashboard.draftCount';

type DrillDownState = {
  title: string;
  items: JobFairActivityBucket['items'];
  countKey: DrillCountKey;
} | null;

const FALLBACKS: Record<string, string> = {
  'jobFair.dashboard.title': 'Job Fair Activity',
  'jobFair.dashboard.registeredToday': 'Registered Today',
  'jobFair.dashboard.totalRegistered': 'Total registered',
  'jobFair.dashboard.totalDrafts': 'Total drafts',
  'jobFair.dashboard.draftsToday': 'Drafts today',
  'jobFair.dashboard.registeredWeek': 'Registered This Week',
  'jobFair.dashboard.checkedInToday': 'Check-ins Today',
  'jobFair.dashboard.checkedInWeek': 'Check-ins This Week',
  'jobFair.dashboard.openDrafts': 'Incomplete drafts',
  'jobFair.dashboard.byArea': 'By Area',
  'jobFair.dashboard.area': 'Area',
  'jobFair.dashboard.registeredTodayShort': 'Registered (Today)',
  'jobFair.dashboard.registeredWeekShort': 'Registered (Week)',
  'jobFair.dashboard.checkedInTodayShort': 'Check-ins (Today)',
  'jobFair.dashboard.checkedInWeekShort': 'Check-ins (Week)',
  'jobFair.dashboard.noActivity': 'No job fair activity yet',
  'jobFair.dashboard.drillDownTitle': 'Registration numbers',
  'jobFair.dashboard.drillDownEmpty': 'No registrations in this bucket',
  'jobFair.dashboard.drillDownHint': 'Click a count to see registration numbers',
  'jobFair.dashboard.registrationCount': '{count} registrations',
  'jobFair.dashboard.draftCount': '{count} drafts',
  'jobFair.dashboard.draftsByStep': 'Drafts by step',
  'jobFair.dashboard.draftStepCount': 'Drafts',
  'jobFair.dashboard.stepPersonal': 'Personal',
  'jobFair.dashboard.stepAddress': 'Address',
  'jobFair.dashboard.stepEducation': 'Education & Work',
  'jobFair.dashboard.stepEducationShort': 'Education',
  'jobFair.dashboard.stepPreferences': 'Job Preference',
  'jobFair.dashboard.stepPreferencesShort': 'Preference',
  'jobFair.dashboard.stepReview': 'Review',
};

const DRAFT_STEP_LABEL_KEYS = [
  'jobFair.dashboard.stepPersonal',
  'jobFair.dashboard.stepAddress',
  'jobFair.dashboard.stepEducation',
  'jobFair.dashboard.stepPreferences',
  'jobFair.dashboard.stepReview',
] as const;

const DRAFT_STEP_AXIS_KEYS = [
  'jobFair.dashboard.stepPersonal',
  'jobFair.dashboard.stepAddress',
  'jobFair.dashboard.stepEducationShort',
  'jobFair.dashboard.stepPreferencesShort',
  'jobFair.dashboard.stepReview',
] as const;

function jobFairHref(view: 'registrations' | 'drafts', todayOnly: boolean): string {
  const params = new URLSearchParams();
  if (view === 'drafts') params.set('view', 'drafts');
  if (todayOnly) {
    const today = getTodayDateStringIST();
    params.set('from', today);
    params.set('to', today);
  }
  const query = params.toString();
  return query ? `/modules/job-fair?${query}` : '/modules/job-fair';
}

function SplitCount({
  bucket,
  label,
  valueClassName,
  href,
}: {
  bucket: JobFairActivityBucket;
  label: string;
  valueClassName?: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg p-4 text-center transition-colors hover:ring-2 hover:ring-primary/40"
    >
      <div className={cn('text-2xl font-bold', valueClassName)}>{bucket.count}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Link>
  );
}

function CountCell({
  bucket,
  onClick,
  className,
}: {
  bucket: JobFairActivityBucket;
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

export function JobFairActivityChart({ stats }: JobFairActivityChartProps) {
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
    bucket: JobFairActivityBucket,
    groupLabel?: string,
    countKey: DrillCountKey = 'jobFair.dashboard.registrationCount',
  ) => {
    if (bucket.count === 0) return;
    setDrillDown({
      title: groupLabel ? `${label} — ${groupLabel}` : label,
      items: bucket.items,
      countKey,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 divide-x rounded-lg bg-primary/10">
          <SplitCount
            bucket={stats.registeredTotal}
            label={t('jobFair.dashboard.totalRegistered')}
            valueClassName="text-primary"
            href={jobFairHref('registrations', false)}
          />
          <SplitCount
            bucket={stats.registeredToday}
            label={t('jobFair.dashboard.registeredToday')}
            valueClassName="text-primary"
            href={jobFairHref('registrations', true)}
          />
        </div>
        <div className="grid grid-cols-2 divide-x rounded-lg bg-amber-500/10">
          <SplitCount
            bucket={stats.draftsTotal}
            label={t('jobFair.dashboard.totalDrafts')}
            valueClassName="text-amber-700 dark:text-amber-400"
            href={jobFairHref('drafts', false)}
          />
          <SplitCount
            bucket={stats.draftsToday}
            label={t('jobFair.dashboard.draftsToday')}
            valueClassName="text-amber-700 dark:text-amber-400"
            href={jobFairHref('drafts', true)}
          />
        </div>
      </div>

      <div className="min-w-0 space-y-3">
        <h4 className="text-sm font-semibold text-foreground">
          {t('jobFair.dashboard.draftsByStep')}
        </h4>
        <div className="h-56 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.draftsByStep.map((row) => ({
                step: row.step,
                label: t(DRAFT_STEP_AXIS_KEYS[row.step] ?? DRAFT_STEP_AXIS_KEYS[0]),
                count: row.bucket.count,
              }))}
              layout="vertical"
              margin={{ top: 4, right: 28, left: 4, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <Tooltip
                formatter={(value) => [
                  Number(value ?? 0),
                  t('jobFair.dashboard.draftStepCount'),
                ]}
              />
              <Bar
                dataKey="count"
                fill="#d97706"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(bar) => {
                  const payload = bar.payload as { step?: number } | undefined;
                  const step = Number(payload?.step);
                  const row = stats.draftsByStep[step];
                  if (!row) return;
                  openBucket(
                    t(DRAFT_STEP_LABEL_KEYS[step] ?? DRAFT_STEP_LABEL_KEYS[0]),
                    row.bucket,
                    t('jobFair.dashboard.draftsByStep'),
                    'jobFair.dashboard.draftCount',
                  );
                }}
              >
                <LabelList dataKey="count" position="right" className="fill-foreground text-xs" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats.byArea.length > 0 ? (
        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-foreground">
              {t('jobFair.dashboard.byArea')}
            </h4>
            <p className="text-xs text-muted-foreground">
              {t('jobFair.dashboard.drillDownHint')}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-2 font-medium">
                    {t('jobFair.dashboard.area')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('jobFair.dashboard.registeredTodayShort')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('jobFair.dashboard.registeredWeekShort')}
                  </th>
                  <th className="px-2 py-2 text-right font-medium">
                    {t('jobFair.dashboard.checkedInTodayShort')}
                  </th>
                  <th className="py-2 pl-2 text-right font-medium">
                    {t('jobFair.dashboard.checkedInWeekShort')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.byArea.map((row: JobFairActivityGroupStat) => (
                  <tr key={row.label} className="border-b last:border-0">
                    <td className="max-w-[10rem] py-2 pr-2 break-words sm:max-w-none">
                      {row.label}
                    </td>
                    <CountCell
                      bucket={row.registeredToday}
                      onClick={() =>
                        openBucket(
                          t('jobFair.dashboard.registeredTodayShort'),
                          row.registeredToday,
                          row.label,
                        )
                      }
                    />
                    <CountCell
                      bucket={row.registeredWeek}
                      onClick={() =>
                        openBucket(
                          t('jobFair.dashboard.registeredWeekShort'),
                          row.registeredWeek,
                          row.label,
                        )
                      }
                    />
                    <CountCell
                      bucket={row.checkedInToday}
                      onClick={() =>
                        openBucket(
                          t('jobFair.dashboard.checkedInTodayShort'),
                          row.checkedInToday,
                          row.label,
                        )
                      }
                    />
                    <CountCell
                      bucket={row.checkedInWeek}
                      className="pl-2"
                      onClick={() =>
                        openBucket(
                          t('jobFair.dashboard.checkedInWeekShort'),
                          row.checkedInWeek,
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
      ) : stats.registeredTotal.count === 0 && stats.draftsTotal.count === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('jobFair.dashboard.noActivity')}
        </p>
      ) : null}

      <Dialog
        open={drillDown !== null}
        onOpenChange={(open) => {
          if (!open) setDrillDown(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {drillDown?.title ?? t('jobFair.dashboard.drillDownTitle')}
            </DialogTitle>
            <DialogDescription>
              {t(drillDown?.countKey ?? 'jobFair.dashboard.registrationCount', {
                count: drillDown?.items.length ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto">
            {drillDown && drillDown.items.length > 0 ? (
              <ul className="divide-y rounded-md border">
                {drillDown.items.map((item) => (
                  <li
                    key={item.registrationNo}
                    className="flex min-w-0 flex-col gap-0.5 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                  >
                    <span className="font-mono">{item.registrationNo}</span>
                    <span className="min-w-0 break-words text-muted-foreground">
                      {item.fullName}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t('jobFair.dashboard.drillDownEmpty')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from '@/hooks/use-translations';
import { getTodayDateStringIST } from '@/lib/ist-date';
import type {
  JobFairActivityBucket,
  JobFairActivityStats,
} from '@/lib/db/job-fair-queries';
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

const FALLBACKS: Record<string, string> = {
  'jobFair.dashboard.title': 'Job Fair Activity',
  'jobFair.dashboard.registeredToday': 'Registered Today',
  'jobFair.dashboard.totalRegistered': 'Total registered',
  'jobFair.dashboard.totalDrafts': 'Total drafts',
  'jobFair.dashboard.draftsToday': 'Drafts today',
  'jobFair.dashboard.noActivity': 'No job fair activity yet',
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

const CHART_TICK = { fontSize: 12, fill: 'hsl(var(--foreground))' };

const DRAFT_STEP_AXIS_KEYS = [
  'jobFair.dashboard.stepPersonal',
  'jobFair.dashboard.stepAddress',
  'jobFair.dashboard.stepEducationShort',
  'jobFair.dashboard.stepPreferencesShort',
  'jobFair.dashboard.stepReview',
] as const;

function jobFairDraftStepHref(step: number): string {
  const params = new URLSearchParams({ view: 'drafts', step: String(step) });
  return `/modules/job-fair?${params.toString()}`;
}

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

export function JobFairActivityChart({ stats }: JobFairActivityChartProps) {
  const router = useRouter();
  const { t: translate } = useTranslations();

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
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={CHART_TICK}
                stroke="hsl(var(--border))"
              />
              <YAxis
                type="category"
                dataKey="label"
                width={96}
                tick={CHART_TICK}
                stroke="hsl(var(--border))"
                interval={0}
              />
              <Tooltip
                formatter={(value) => [
                  Number(value ?? 0),
                  t('jobFair.dashboard.draftStepCount'),
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  color: 'hsl(var(--popover-foreground))',
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[0, 4, 4, 0]}
                cursor="pointer"
                onClick={(bar) => {
                  const payload = bar.payload as { step?: number } | undefined;
                  const step = Number(payload?.step);
                  if (!Number.isInteger(step) || step < 0 || step > 4) return;
                  router.push(jobFairDraftStepHref(step));
                }}
              >
                <LabelList
                  dataKey="count"
                  position="right"
                  fill="hsl(var(--foreground))"
                  className="text-xs"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {stats.registeredTotal.count === 0 && stats.draftsTotal.count === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          {t('jobFair.dashboard.noActivity')}
        </p>
      ) : null}
    </div>
  );
}

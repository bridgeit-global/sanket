'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Rectangle,
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
  'jobFair.dashboard.whatsappVerified': 'WhatsApp verified',
  'jobFair.dashboard.whatsappNotVerified': 'WhatsApp not verified',
  'jobFair.dashboard.stepPersonal': 'Personal',
  'jobFair.dashboard.stepAddress': 'Address',
  'jobFair.dashboard.stepEducation': 'Education & Work',
  'jobFair.dashboard.stepEducationShort': 'Education',
  'jobFair.dashboard.stepPreferences': 'Job Preference',
  'jobFair.dashboard.stepPreferencesShort': 'Job Preference',
  'jobFair.dashboard.stepReview': 'Review',
};

const CHART_TICK = { fontSize: 12, fill: 'hsl(var(--foreground))' };

const WHATSAPP_VERIFIED_FILL = 'hsl(var(--primary))';
const WHATSAPP_NOT_VERIFIED_FILL =
  'color-mix(in srgb, hsl(var(--primary)) 40%, white)';

type DraftStepBarKey = 'whatsappVerified' | 'whatsappNotVerified' | 'count';

const DRAFT_STEP_STACK: DraftStepBarKey[] = [
  'whatsappVerified',
  'whatsappNotVerified',
  'count',
];

type DraftStepChartRow = {
  step: number;
  label: string;
  count: number | null;
  whatsappVerified: number | null;
  whatsappNotVerified: number | null;
};

function positiveOrNull(value: number): number | null {
  return value > 0 ? value : null;
}

function draftStepBarShape(key: DraftStepBarKey) {
  return function DraftStepBarShape(
    props: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      payload?: DraftStepChartRow;
    } & Record<string, unknown>,
  ) {
    const { payload, height = 0, width = 0, ...rest } = props;
    if (height <= 0 || width <= 0) return null;
    const topKey = [...DRAFT_STEP_STACK]
      .reverse()
      .find((stackKey) => Number(payload?.[stackKey] ?? 0) > 0);
    const radius = topKey === key ? 4 : 0;
    return (
      <Rectangle
        {...rest}
        width={width}
        height={height}
        radius={[radius, radius, 0, 0]}
      />
    );
  };
}

const DRAFT_STEP_AXIS_KEYS = [
  'jobFair.dashboard.stepPersonal',
  'jobFair.dashboard.stepAddress',
  'jobFair.dashboard.stepEducationShort',
  'jobFair.dashboard.stepPreferencesShort',
  'jobFair.dashboard.stepReview',
] as const;

function jobFairDraftStepHref(
  step: number,
  whatsapp?: 'verified' | 'unverified',
): string {
  const params = new URLSearchParams({ view: 'drafts', step: String(step) });
  if (whatsapp) params.set('whatsapp', whatsapp);
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
  const isMobile = useIsMobile();
  const { t: translate } = useTranslations();

  const openDraftStep = (
    payload: unknown,
    whatsapp?: 'verified' | 'unverified',
  ) => {
    const step = Number((payload as { step?: number } | undefined)?.step);
    if (!Number.isInteger(step) || step < 0 || step > 4) return;
    router.push(jobFairDraftStepHref(step, whatsapp));
  };

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-sm font-semibold text-foreground">
            {t('jobFair.dashboard.draftsByStep')}
          </h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Link
              href={jobFairDraftStepHref(0, 'verified')}
              className="inline-flex items-center gap-1.5 text-primary"
            >
              <span className="size-2.5 shrink-0 rounded-sm bg-primary" />
              {t('jobFair.dashboard.whatsappVerified')}
            </Link>
            <Link
              href={jobFairDraftStepHref(0, 'unverified')}
              className="inline-flex items-center gap-1.5"
              style={{ color: WHATSAPP_NOT_VERIFIED_FILL }}
            >
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: WHATSAPP_NOT_VERIFIED_FILL }}
              />
              {t('jobFair.dashboard.whatsappNotVerified')}
            </Link>
          </div>
        </div>
        <div className={cn('w-full min-w-0', isMobile ? 'h-72' : 'h-56')}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stats.draftsByStep.map((row): DraftStepChartRow => {
                const label = t(
                  DRAFT_STEP_AXIS_KEYS[row.step] ?? DRAFT_STEP_AXIS_KEYS[0],
                );
                if (row.step === 0) {
                  return {
                    step: row.step,
                    label,
                    count: null,
                    whatsappVerified: positiveOrNull(row.whatsappVerified.count),
                    whatsappNotVerified: positiveOrNull(
                      row.whatsappNotVerified.count,
                    ),
                  };
                }
                return {
                  step: row.step,
                  label,
                  count: positiveOrNull(row.bucket.count),
                  whatsappVerified: null,
                  whatsappNotVerified: null,
                };
              })}
              margin={{ top: 16, right: 8, left: 0, bottom: isMobile ? 8 : 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                type="category"
                dataKey="label"
                tick={CHART_TICK}
                stroke="hsl(var(--border))"
                interval={0}
                angle={isMobile ? -40 : 0}
                textAnchor={isMobile ? 'end' : 'middle'}
                height={isMobile ? 72 : 30}
                tickMargin={isMobile ? 6 : 8}
              />
              <YAxis
                type="number"
                allowDecimals={false}
                width={32}
                tick={CHART_TICK}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                content={({ active, payload }) => {
                  const row = payload?.[0]?.payload as DraftStepChartRow | undefined;
                  if (!active || !row) return null;
                  const lines =
                    row.step === 0
                      ? [
                          [
                            t('jobFair.dashboard.whatsappVerified'),
                            Number(row.whatsappVerified ?? 0),
                          ],
                          [
                            t('jobFair.dashboard.whatsappNotVerified'),
                            Number(row.whatsappNotVerified ?? 0),
                          ],
                        ]
                      : [
                          [
                            t('jobFair.dashboard.draftStepCount'),
                            Number(row.count ?? 0),
                          ],
                        ];
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-sm">
                      <div className="mb-1 font-medium">{row.label}</div>
                      {lines.map(([name, count]) => (
                        <div key={String(name)} className="flex justify-between gap-4">
                          <span>{name}</span>
                          <span>{count}</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="whatsappVerified"
                name={t('jobFair.dashboard.whatsappVerified')}
                stackId="drafts"
                fill={WHATSAPP_VERIFIED_FILL}
                shape={draftStepBarShape('whatsappVerified')}
                cursor="pointer"
                onClick={(bar) => {
                  openDraftStep(bar.payload, 'verified');
                }}
              >
                <LabelList
                  dataKey="whatsappVerified"
                  position="center"
                  fill="#ffffff"
                  className="text-xs"
                  formatter={(value) =>
                    Number(value ?? 0) > 0 ? String(value) : ''
                  }
                />
              </Bar>
              <Bar
                dataKey="whatsappNotVerified"
                name={t('jobFair.dashboard.whatsappNotVerified')}
                stackId="drafts"
                fill={WHATSAPP_NOT_VERIFIED_FILL}
                shape={draftStepBarShape('whatsappNotVerified')}
                cursor="pointer"
                onClick={(bar) => {
                  openDraftStep(bar.payload, 'unverified');
                }}
              >
                <LabelList
                  dataKey="whatsappNotVerified"
                  position="center"
                  fill="hsl(var(--primary))"
                  className="text-xs"
                  formatter={(value) =>
                    Number(value ?? 0) > 0 ? String(value) : ''
                  }
                />
              </Bar>
              <Bar
                dataKey="count"
                name={t('jobFair.dashboard.draftStepCount')}
                stackId="drafts"
                fill="hsl(var(--primary))"
                shape={draftStepBarShape('count')}
                cursor="pointer"
                onClick={(bar) => {
                  openDraftStep(bar.payload);
                }}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  fill="hsl(var(--foreground))"
                  className="text-xs"
                  formatter={(value) =>
                    Number(value ?? 0) > 0 ? String(value) : ''
                  }
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

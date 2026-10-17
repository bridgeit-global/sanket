'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, AlertTriangle, Building2, RefreshCw, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayTimeIST, getTodayDateStringIST } from '@/lib/ist-date';
import { cn } from '@/lib/utils';
import { attendanceRoleLabel, effectiveAttendanceStatus } from '@/lib/attendance/duty';
import type { AttendanceLog, AttendanceProfile, AttendanceSite, AttendanceStatus } from '@/lib/attendance/types';
import { AttendanceShell } from './attendance-shell';

type LiveLog = AttendanceLog & {
  site?: Pick<AttendanceSite, 'name' | 'type'> | null;
};

type LiveData = {
  profiles: AttendanceProfile[];
  logs: LiveLog[];
};

type FeedFilter = 'all' | 'present' | 'review';

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'present', label: 'Present' },
  { id: 'review', label: 'Needs review' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return letters.join('') || 'E';
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

function needsReview(log: LiveLog) {
  return log.status === 'pending_review' || !log.is_geofence_valid;
}

function isPresent(log: LiveLog) {
  return Boolean(log.clock_in);
}

function statusClass(status: AttendanceStatus | string) {
  if (status === 'pending_review' || status === 'flagged_location') {
    return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
  }
  if (status === 'late' || status === 'early_leave') {
    return 'bg-orange-500/15 text-orange-800 dark:text-orange-300';
  }
  return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
}

function presence(log: LiveLog) {
  if (log.clock_in) return { label: 'Present', className: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' };
  return { label: 'Absent', className: 'bg-muted text-muted-foreground' };
}

function siteLabel(log: LiveLog) {
  if (log.site?.name) return log.site.name;
  return 'Field location';
}

function PersonMark({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(name)}
    </span>
  );
}

function StatusPill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize', className)}>
      {children}
    </span>
  );
}

export function AttendanceLiveOps({ initialData }: { initialData: LiveData }) {
  const router = useRouter();
  const today = getTodayDateStringIST();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const todayLogs = useMemo(
    () => initialData.logs.filter((log) => log.date === today),
    [initialData.logs, today],
  );
  const flagged = todayLogs.filter((log) => needsReview(log));
  const presentToday = todayLogs.filter((log) => isPresent(log));
  const office = presentToday.filter((log) => log.site?.type === 'office');

  const cards = [
    {
      label: 'Total workforce',
      value: initialData.profiles.length,
      hint: 'Registered staff',
      icon: Users,
      tone: 'bg-primary/10 text-primary',
    },
    {
      label: 'Present today',
      value: presentToday.length,
      hint: 'Marked present',
      icon: Activity,
      tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    },
    {
      label: 'In office',
      value: office.length,
      hint: 'At an office site',
      icon: Building2,
      tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
    },
    {
      label: 'Needs review',
      value: flagged.length,
      hint: 'Today’s exceptions',
      icon: AlertTriangle,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
  ];

  const feed = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialData.logs.filter((log) => {
      if (filter === 'present' && !isPresent(log)) return false;
      if (filter === 'review' && !needsReview(log)) return false;
      if (!needle) return true;
      const haystack = [
        log.profile?.full_name,
        log.profile?.department,
        log.site?.name,
        log.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, initialData.logs, query]);

  const activity = usePagination(feed, 10, {
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              Live operations
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Attendance command center</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDisplayDateIST(today)} IST · {presentToday.length} present · {flagged.length} to review
            </p>
          </div>
          <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={() => router.refresh()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, value, hint, icon: Icon, tone }) => (
            <Card key={label}>
              <CardContent className="flex items-start gap-3 p-4">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg', tone)}>
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-2xl font-bold leading-none">{value}</p>
                  <p className="mt-2 text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="min-w-0">
            <CardHeader className="space-y-3">
              <CardTitle>Recent activity</CardTitle>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="min-h-12 pl-9 text-base"
                  placeholder="Search name, department, or site"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTERS.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={filter === item.id ? 'default' : 'outline'}
                    className="h-10"
                    onClick={() => setFilter(item.id)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              {feed.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No attendance activity matches this view.</p>
              ) : (
                <>
                  <div className="space-y-3 md:hidden">
                    {activity.paginatedItems.map((log) => {
                      const name = log.profile?.full_name || 'Employee';
                      const shift = presence(log);
                      return (
                        <article key={log.id} className="rounded-lg border p-3">
                          <div className="flex items-start gap-3">
                            <PersonMark name={name} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="break-words font-medium">{name}</p>
                                <StatusPill className={shift.className}>{shift.label}</StatusPill>
                              </div>
                              <p className="mt-0.5 break-words text-xs text-muted-foreground">
                                {attendanceRoleLabel(log.profile?.role)} · {siteLabel(log)}
                              </p>
                            </div>
                          </div>
                          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <dt className="text-xs text-muted-foreground">Date</dt>
                              <dd>{formatDisplayDateIST(log.date)}</dd>
                            </div>
                            <div>
                              <dt className="text-xs text-muted-foreground">Status</dt>
                              <dd className="capitalize">{statusLabel(effectiveAttendanceStatus(log))}</dd>
                            </div>
                            <div className="col-span-2">
                              <dt className="text-xs text-muted-foreground">Present</dt>
                              <dd>{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</dd>
                            </div>
                          </dl>
                        </article>
                      );
                    })}
                  </div>
                  <div className="hidden min-w-0 overflow-x-auto md:block">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2 font-medium">Employee</th>
                          <th className="px-3 py-2 font-medium">Location</th>
                          <th className="px-3 py-2 font-medium">Status</th>
                          <th className="px-3 py-2 font-medium">Present</th>
                          <th className="px-3 py-2 font-medium">Attendance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activity.paginatedItems.map((log) => {
                          const name = log.profile?.full_name || 'Employee';
                          const shift = presence(log);
                          return (
                            <tr key={log.id} className="border-b last:border-0">
                              <td className="px-3 py-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <PersonMark name={name} />
                                  <div className="min-w-0">
                                    <p className="truncate font-medium">{name}</p>
                                    <p className="truncate text-xs text-muted-foreground">{attendanceRoleLabel(log.profile?.role)}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3">
                                <p className="break-words">{siteLabel(log)}</p>
                                <p className="text-xs text-muted-foreground">{formatDisplayDateIST(log.date)}</p>
                              </td>
                              <td className="px-3 py-3">
                                <StatusPill className={statusClass(effectiveAttendanceStatus(log))}>{statusLabel(effectiveAttendanceStatus(log))}</StatusPill>
                              </td>
                              <td className="whitespace-nowrap px-3 py-3">{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</td>
                              <td className="px-3 py-3">
                                <StatusPill className={shift.className}>{shift.label}</StatusPill>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
              {activity.totalItems > 0 ? (
                <TablePagination
                  currentPage={activity.currentPage}
                  totalPages={activity.totalPages}
                  pageSize={activity.pageSize}
                  totalItems={activity.totalItems}
                  onPageChange={activity.handlePageChange}
                  onPageSizeChange={activity.handlePageSizeChange}
                />
              ) : null}
            </CardContent>
          </Card>
      </div>
    </AttendanceShell>
  );
}

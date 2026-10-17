'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ClipboardList, Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DmyDateInput } from '@/components/ui/dmy-date-input';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayTimeIST, getTodayDateStringIST } from '@/lib/ist-date';
import { cn } from '@/lib/utils';
import { attendanceRoleLabel, effectiveAttendanceStatus } from '@/lib/attendance/duty';
import type { AttendanceLog, AttendanceStatus } from '@/lib/attendance/types';
import { AttendanceShell } from './attendance-shell';

type AuditLog = AttendanceLog;
type StatusFilter = 'all' | 'on_time' | 'late' | 'review';

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'on_time', label: 'On time' },
  { id: 'late', label: 'Late' },
  { id: 'review', label: 'Needs review' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'E';
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ');
}

function needsReview(log: AuditLog) {
  return log.status === 'pending_review' || log.status === 'flagged_location' || !log.is_geofence_valid;
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

function siteLabel(log: AuditLog) {
  return log.site?.name || 'Field location';
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

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm font-medium">{children}</dd>
    </div>
  );
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No';
}

function coordinateLabel(log: AuditLog) {
  if (log.user_lat == null || log.user_lng == null) return '—';
  return `${log.user_lat.toFixed(5)}, ${log.user_lng.toFixed(5)}`;
}

export function AttendanceAuditLogs({ initialData }: { initialData: { logs: AuditLog[] } }) {
  const today = getTodayDateStringIST();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [date, setDate] = useState(today);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [employeePage, setEmployeePage] = useState(1);
  const [employeePageSize, setEmployeePageSize] = useState(10);
  const logs = initialData.logs ?? [];

  const dated = useMemo(
    () => (date ? logs.filter((log) => log.date === date) : logs),
    [date, logs],
  );
  const todayCount = logs.filter((log) => log.date === today && log.clock_in).length;
  const reviewCount = dated.filter((log) => needsReview(log)).length;
  const presentCount = dated.filter((log) => Boolean(log.clock_in)).length;

  const cards = [
    { label: 'Records', value: dated.length, hint: date ? 'Rows on selected date' : 'Loaded attendance rows', icon: ClipboardList, tone: 'bg-primary/10 text-primary' },
    { label: 'Today', value: todayCount, hint: 'Marked present today', icon: ClipboardList, tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
    { label: 'Present', value: presentCount, hint: 'Marked present on this date', icon: ClipboardList, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    { label: 'Needs review', value: reviewCount, hint: 'Flagged or pending', icon: AlertTriangle, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  ];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return dated.filter((log) => {
      if (filter === 'on_time' && effectiveAttendanceStatus(log) !== 'on_time') return false;
      if (filter === 'late' && effectiveAttendanceStatus(log) !== 'late') return false;
      if (filter === 'review' && !needsReview(log)) return false;
      if (!needle) return true;
      const haystack = [log.profile?.full_name, log.profile?.department, log.site?.name, log.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [dated, filter, query]);

  const history = usePagination(filtered, 10, {
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  useEffect(() => {
    setPage(1);
  }, [query, filter, date]);

  const employeeLogs = useMemo(() => {
    if (!selected) return [];
    return logs.filter((log) => log.user_id === selected.user_id);
  }, [logs, selected]);

  const employeeHistory = usePagination(employeeLogs, 10, {
    page: employeePage,
    pageSize: employeePageSize,
    onPageChange: setEmployeePage,
    onPageSizeChange: setEmployeePageSize,
  });

  const openLog = (log: AuditLog) => {
    setEmployeePage(1);
    setSelected(log);
  };

  const exportCsv = () => {
    const rows = [['Date', 'Employee', 'Site', 'Status', 'Present', 'Distance']].concat(
      filtered.map((log) => [
        log.date,
        log.profile?.full_name || '',
        siteLabel(log),
        String(effectiveAttendanceStatus(log)),
        log.clock_in || '',
        log.distance_meters == null ? '' : String(log.distance_meters),
      ]),
    );
    const blob = new Blob(
      [rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${date || today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Compliance and payroll</p>
            <h1 className="text-2xl font-bold tracking-tight">Audit ledger</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {date ? `${formatDisplayDateIST(date)} IST` : 'All dates'} · {dated.length} records · {reviewCount} to review
            </p>
          </div>
          <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={exportCsv}>
            <Download className="mr-2 size-4" />
            Export CSV
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
            <CardTitle>Attendance records</CardTitle>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_12rem] md:items-end">
              <div className="relative min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="min-h-12 pl-9 text-base"
                  placeholder="Search employee, site, or status"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <label className="block min-w-0 text-sm">
                <span className="mb-1 block text-muted-foreground">Date</span>
                <DmyDateInput
                  aria-label="Date"
                  className="min-h-12 w-full text-base"
                  max={today}
                  value={date}
                  onValueChange={(next) => setDate(next && next > today ? today : next)}
                />
              </label>
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
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No matching records.</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {history.paginatedItems.map((log) => {
                    const name = log.profile?.full_name || 'Employee';
                    return (
                      <article
                        key={log.id}
                        role="button"
                        tabIndex={0}
                        aria-label={`View attendance for ${name}`}
                        onClick={() => openLog(log)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openLog(log);
                          }
                        }}
                        className="w-full cursor-pointer rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="flex items-start gap-3">
                          <PersonMark name={name} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="break-words font-medium">{name}</p>
                              <StatusPill className={statusClass(effectiveAttendanceStatus(log))}>{statusLabel(effectiveAttendanceStatus(log))}</StatusPill>
                            </div>
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">
                              {formatDisplayDateIST(log.date)} · {siteLabel(log)}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                          <div className="col-span-2">
                            <dt className="text-xs text-muted-foreground">Present</dt>
                            <dd>{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Distance</dt>
                            <dd>{log.distance_meters ? `${Math.round(log.distance_meters)} m` : '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Department</dt>
                            <dd className="break-words">{log.profile?.department || '—'}</dd>
                          </div>
                        </dl>
                      </article>
                    );
                  })}
                </div>
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Employee</th>
                        <th className="px-3 py-2 font-medium">Location</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Present</th>
                        <th className="px-3 py-2 font-medium">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.paginatedItems.map((log) => {
                        const name = log.profile?.full_name || 'Employee';
                        return (
                          <tr
                            key={log.id}
                            tabIndex={0}
                            role="button"
                            aria-label={`View attendance for ${name}`}
                            onClick={() => openLog(log)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                openLog(log);
                              }
                            }}
                            className="cursor-pointer border-b last:border-0 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                          >
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
                            <td className="whitespace-nowrap px-3 py-3">{log.distance_meters ? `${Math.round(log.distance_meters)} m` : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {history.totalItems > 0 ? (
              <TablePagination
                currentPage={history.currentPage}
                totalPages={history.totalPages}
                pageSize={history.pageSize}
                totalItems={history.totalItems}
                onPageChange={history.handlePageChange}
                onPageSizeChange={history.handlePageSizeChange}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Sheet open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent side="right" className="w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader className="pr-8 text-left">
                <SheetTitle className="break-words">{selected.profile?.full_name || 'Employee'}</SheetTitle>
                <SheetDescription className="break-words">
                  {attendanceRoleLabel(selected.profile?.role)}
                  {selected.profile?.work_type ? ` · ${selected.profile.work_type}` : ''}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill className={statusClass(effectiveAttendanceStatus(selected))}>{statusLabel(effectiveAttendanceStatus(selected))}</StatusPill>
                  <span className="text-sm text-muted-foreground">{formatDisplayDateIST(selected.date)}</span>
                </div>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DetailField label="Location">{siteLabel(selected)}</DetailField>
                  <DetailField label="Distance">{selected.distance_meters ? `${Math.round(selected.distance_meters)} m` : '—'}</DetailField>
                  <DetailField label="Present">{selected.clock_in ? formatDisplayTimeIST(selected.clock_in) : '—'}</DetailField>
                  <DetailField label="Inside geofence">{yesNo(selected.is_geofence_valid)}</DetailField>
                  <DetailField label="IP allowed">{yesNo(selected.is_ip_valid)}</DetailField>
                  <DetailField label="IP address">{selected.user_ip || '—'}</DetailField>
                  <DetailField label="Coordinates">{coordinateLabel(selected)}</DetailField>
                </dl>
                {selected.notes ? (
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="break-words text-sm">{selected.notes}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-sm font-semibold">This employee</p>
                  <div className="mt-2 space-y-2">
                    {employeeHistory.paginatedItems.map((log) => (
                      <button
                        key={log.id}
                        type="button"
                        onClick={() => setSelected(log)}
                        className={cn(
                          'flex w-full min-w-0 flex-col gap-1 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          log.id === selected.id && 'border-primary bg-primary/5',
                        )}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="font-medium">{formatDisplayDateIST(log.date)}</span>
                          <StatusPill className={statusClass(effectiveAttendanceStatus(log))}>{statusLabel(effectiveAttendanceStatus(log))}</StatusPill>
                        </span>
                        <span className="break-words text-xs text-muted-foreground">
                          {siteLabel(log)} · {log.clock_in ? `Present ${formatDisplayTimeIST(log.clock_in)}` : 'Not marked'}
                        </span>
                      </button>
                    ))}
                  </div>
                  {employeeHistory.totalItems > 0 ? (
                    <TablePagination
                      currentPage={employeeHistory.currentPage}
                      totalPages={employeeHistory.totalPages}
                      pageSize={employeeHistory.pageSize}
                      totalItems={employeeHistory.totalItems}
                      onPageChange={employeeHistory.handlePageChange}
                      onPageSizeChange={employeeHistory.handlePageSizeChange}
                    />
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AttendanceShell>
  );
}

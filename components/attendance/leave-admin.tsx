'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayDateTimeIST } from '@/lib/ist-date';
import { cn } from '@/lib/utils';
import type { LeaveRequest, LeaveStatus } from '@/lib/attendance/types';
import { AttendanceShell } from './attendance-shell';

const filters: Array<{ id: 'all' | LeaveStatus; label: string }> = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'all', label: 'All' },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'E';
}

function statusClass(status: LeaveStatus) {
  if (status === 'approved') return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300';
  if (status === 'rejected') return 'bg-red-500/15 text-red-800 dark:text-red-300';
  return 'bg-amber-500/15 text-amber-800 dark:text-amber-300';
}

function PersonMark({ name }: { name: string }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
      {initials(name)}
    </span>
  );
}

function StatusPill({ status }: { status: LeaveStatus }) {
  return (
    <span className={cn('inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize', statusClass(status))}>
      {status}
    </span>
  );
}

export function AttendanceLeaveAdmin({ initialData }: { initialData: { leaves: LeaveRequest[] } }) {
  const [leaves, setLeaves] = useState(initialData.leaves ?? []);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('pending');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const counts = {
    pending: leaves.filter((leave) => leave.status === 'pending').length,
    approved: leaves.filter((leave) => leave.status === 'approved').length,
    rejected: leaves.filter((leave) => leave.status === 'rejected').length,
  };

  const cards = [
    { label: 'Pending', value: counts.pending, hint: 'Waiting for a decision', icon: Clock3, tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
    { label: 'Approved', value: counts.approved, hint: 'Cleared time off', icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
    { label: 'Rejected', value: counts.rejected, hint: 'Declined requests', icon: XCircle, tone: 'bg-red-500/10 text-red-700 dark:text-red-300' },
    { label: 'All requests', value: leaves.length, hint: 'Loaded leave history', icon: CalendarDays, tone: 'bg-primary/10 text-primary' },
  ];

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return leaves.filter((leave) => {
      if (filter !== 'all' && leave.status !== filter) return false;
      if (!needle) return true;
      const haystack = [leave.profile?.full_name, leave.profile?.department, leave.reason, leave.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, leaves, query]);

  const list = usePagination(visible, 10, {
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const review = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    setMessage('');
    const response = await fetch('/api/attendance/leave', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    const result = await response.json();
    if (!response.ok) {
      setBusyId(null);
      setMessage(result.error || 'Leave request could not be updated.');
      return;
    }
    const overview = await fetch('/api/attendance/admin/overview');
    if (overview.ok) {
      const data = await overview.json();
      setLeaves(data.leaves ?? []);
    } else {
      setLeaves((current) => current.map((leave) => (leave.id === id ? { ...leave, ...result } : leave)));
    }
    setBusyId(null);
    setMessage(status === 'approved' ? 'Leave approved.' : 'Leave rejected.');
  };

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Leave requests</p>
            <h1 className="text-2xl font-bold tracking-tight">Review time off</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.pending} pending · {counts.approved} approved · {counts.rejected} rejected
            </p>
          </div>
          <Button variant="outline" className="min-h-12 w-full sm:w-auto" asChild>
            <Link href="/dashboard#leave">Apply for your own leave</Link>
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
            <CardTitle>Requests</CardTitle>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="min-h-12 pl-9 text-base"
                placeholder="Search name, department, or reason"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
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
            {message ? <p className="mb-3 text-sm text-muted-foreground">{message}</p> : null}
            {visible.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No leave requests in this view.</p>
            ) : (
              <>
                <div className="space-y-3 md:hidden">
                  {list.paginatedItems.map((leave) => {
                    const name = leave.profile?.full_name || 'Employee';
                    return (
                      <article key={leave.id} className="rounded-lg border p-3">
                        <div className="flex items-start gap-3">
                          <PersonMark name={name} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="break-words font-medium">{name}</p>
                              <StatusPill status={leave.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {leave.profile?.department || 'Workforce'}
                            </p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-1 gap-2 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Dates</dt>
                            <dd>
                              {formatDisplayDateIST(leave.start_date)} – {formatDisplayDateIST(leave.end_date)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Reason</dt>
                            <dd className="break-words">{leave.reason}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Submitted</dt>
                            <dd>{leave.created_at ? formatDisplayDateTimeIST(leave.created_at) : '—'}</dd>
                          </div>
                        </dl>
                        {leave.status === 'pending' ? (
                          <div className="mt-3 flex flex-col gap-2">
                            <Button className="min-h-10 w-full" disabled={busyId === leave.id} onClick={() => review(leave.id, 'approved')}>
                              Approve
                            </Button>
                            <Button variant="outline" className="min-h-10 w-full" disabled={busyId === leave.id} onClick={() => review(leave.id, 'rejected')}>
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                <div className="hidden min-w-0 overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Employee</th>
                        <th className="px-3 py-2 font-medium">Dates</th>
                        <th className="px-3 py-2 font-medium">Reason</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">Decision</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.paginatedItems.map((leave) => {
                        const name = leave.profile?.full_name || 'Employee';
                        return (
                          <tr key={leave.id} className="border-b align-top last:border-0">
                            <td className="px-3 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <PersonMark name={name} />
                                <div className="min-w-0">
                                  <p className="truncate font-medium">{name}</p>
                                  <p className="truncate text-xs text-muted-foreground">{leave.profile?.department || 'Workforce'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3">
                              <p>{formatDisplayDateIST(leave.start_date)}</p>
                              <p className="text-xs text-muted-foreground">to {formatDisplayDateIST(leave.end_date)}</p>
                            </td>
                            <td className="max-w-[240px] px-3 py-3">
                              <p className="break-words">{leave.reason}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {leave.created_at ? formatDisplayDateTimeIST(leave.created_at) : '—'}
                              </p>
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill status={leave.status} />
                            </td>
                            <td className="px-3 py-3">
                              {leave.status === 'pending' ? (
                                <div className="flex flex-col gap-2 lg:flex-row">
                                  <Button className="h-10" disabled={busyId === leave.id} onClick={() => review(leave.id, 'approved')}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" className="h-10" disabled={busyId === leave.id} onClick={() => review(leave.id, 'rejected')}>
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {leave.reviewed_at ? formatDisplayDateTimeIST(leave.reviewed_at) : 'Recorded'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            {list.totalItems > 0 ? (
              <TablePagination
                currentPage={list.currentPage}
                totalPages={list.totalPages}
                pageSize={list.pageSize}
                totalItems={list.totalItems}
                onPageChange={list.handlePageChange}
                onPageSizeChange={list.handlePageSizeChange}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </AttendanceShell>
  );
}

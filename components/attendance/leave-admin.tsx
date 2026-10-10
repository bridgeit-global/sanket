'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayDateTimeIST } from '@/lib/ist-date';
import type { LeaveRequest, LeaveStatus } from '@/lib/attendance/types';
import { AttendanceShell, SectionTitle } from './attendance-shell';

const filters: Array<{ id: 'all' | LeaveStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function statusClass(status: LeaveStatus) {
  if (status === 'approved') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'rejected') return 'bg-red-500/10 text-red-700 dark:text-red-300';
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

export function AttendanceLeaveAdmin({ initialData }: { initialData: { leaves: LeaveRequest[] } }) {
  const [leaves, setLeaves] = useState(initialData.leaves ?? []);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('pending');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const visible = useMemo(
    () => leaves.filter((leave) => filter === 'all' || leave.status === filter),
    [leaves, filter],
  );
  const list = usePagination(visible, 10);

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
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Leave requests</p>
          <h1 className="text-2xl font-bold">Review time off</h1>
          <Link href="/dashboard#leave" className="mt-2 inline-flex text-sm text-primary">Apply for your own leave</Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {filters.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={filter === item.id ? 'default' : 'outline'}
              className="min-h-10 w-full sm:w-auto"
              onClick={() => {
                setFilter(item.id);
                list.handlePageChange(1);
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Card>
          <CardHeader><SectionTitle icon={CalendarDays}>Requests</SectionTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {list.paginatedItems.map((leave) => (
                <div key={leave.id} className="flex flex-col gap-3 border-b pb-3 last:border-0">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{leave.profile?.full_name || 'Employee'}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDisplayDateIST(leave.start_date)} – {formatDisplayDateIST(leave.end_date)}
                      </p>
                      <p className="mt-1 break-words text-sm">{leave.reason}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Submitted {leave.created_at ? formatDisplayDateTimeIST(leave.created_at) : '—'}
                        {leave.reviewed_at ? ` · Reviewed ${formatDisplayDateTimeIST(leave.reviewed_at)}` : ''}
                      </p>
                    </div>
                    <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-xs capitalize ${statusClass(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                  {leave.status === 'pending' ? (
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button className="min-h-10 w-full sm:w-auto" disabled={busyId === leave.id} onClick={() => review(leave.id, 'approved')}>
                        Approve
                      </Button>
                      <Button variant="outline" className="min-h-10 w-full sm:w-auto" disabled={busyId === leave.id} onClick={() => review(leave.id, 'rejected')}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {visible.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests in this view.</p> : null}
            </div>
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
            {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
          </CardContent>
        </Card>
      </div>
    </AttendanceShell>
  );
}

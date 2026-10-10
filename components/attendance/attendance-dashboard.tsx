'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, MapPin, Plus, RefreshCw, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayDateTimeIST, formatDisplayTimeIST, formatYmd, getCalendarYmd, getTodayDateStringIST, parseInstant } from '@/lib/ist-date';
import { AttendanceShell, SectionTitle } from './attendance-shell';
import type { AttendanceLog, LeaveRequest, LeaveStatus } from '@/lib/attendance/types';

function leaveStatusClass(status: LeaveStatus) {
  if (status === 'approved') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
  if (status === 'rejected') return 'bg-red-500/10 text-red-700 dark:text-red-300';
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
}

function shiftIstDay(offset: number) {
  const today = getCalendarYmd();
  const utc = new Date(Date.UTC(today.year, today.month - 1, today.day));
  utc.setUTCDate(utc.getUTCDate() + offset);
  return formatYmd({
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  });
}

export function AttendanceDashboard({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leave, setLeave] = useState({ start_date: '', end_date: '', reason: '' });
  const [leaveMessage, setLeaveMessage] = useState('');
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const scrollToHash = () => {
      const id = window.location.hash.replace('#', '');
      if (!id) return;
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  const today = getTodayDateStringIST(new Date(now));
  const logs = (data.logs ?? []) as AttendanceLog[];
  const todayLogs = useMemo(() => logs.filter((log) => log.date === today), [logs, today]);
  const todayLog = todayLogs[0];
  const officeLog = todayLogs.find((log) => log.site_id);
  const locationLog = todayLogs.find((log) => !log.site_id);
  const officeOpen = Boolean(officeLog?.clock_in && !officeLog.clock_out);
  const locationOpen = Boolean(locationLog?.clock_in && !locationLog.clock_out);
  const elapsed = todayLog?.clock_in ? Math.max(0, now - parseInstant(todayLog.clock_in).getTime()) : 0;
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const calendarDays = useMemo(() => Array.from({ length: 30 }, (_, index) => {
    const key = shiftIstDay(index - 29);
    return { key, day: Number(key.slice(-2)), log: logs.find((item) => item.date === key) };
  }), [logs, today]);
  const history = usePagination(logs, 10);
  const leaveRequests = (data.leaves ?? []) as LeaveRequest[];
  const leaveHistory = usePagination(leaveRequests, 10);

  const refresh = async () => {
    const response = await fetch('/api/attendance/dashboard');
    if (response.ok) setData(await response.json());
  };

  const submitLeave = async (event: React.FormEvent) => {
    event.preventDefault();
    setLeaveMessage('Submitting…');
    const response = await fetch('/api/attendance/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leave),
    });
    const result = await response.json();
    if (!response.ok) return setLeaveMessage(result.error || 'Could not submit leave request.');
    setLeaveOpen(false);
    setLeaveMessage('Leave request submitted.');
    setLeave({ start_date: '', end_date: '', reason: '' });
    await refresh();
  };

  return (
    <AttendanceShell>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Good day</p>
            <h1 className="break-words text-2xl font-bold">{data.profile?.full_name || 'Employee'}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{data.profile?.department || 'Workforce attendance'}</p>
          </div>
          <Button variant="outline" onClick={refresh} className="min-h-12 w-full sm:w-auto">
            <RefreshCw className="mr-2 size-4" />Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today&apos;s shift</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-3xl font-bold">{todayLog?.clock_in ? `${hours}h ${minutes}m` : 'Not started'}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{todayLog?.clock_out ? 'Shift completed' : todayLog?.clock_in ? 'Currently active' : 'Scan to clock in'}</p>
                </div>
                <Clock3 className="size-8 shrink-0 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Quick action</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                <Link href={officeOpen ? '/scan?mode=clock_out' : '/scan'} className="block">
                  <Button className="min-h-12 w-full">
                    <MapPin className="mr-2 size-4" />
                    {officeOpen ? 'Clock out at office' : 'Scan office QR'}
                  </Button>
                </Link>
                <Link href={locationOpen ? '/scan?method=field&mode=clock_out' : '/scan?method=field'} className="block">
                  <Button variant="outline" className="min-h-12 w-full">
                    <MapPin className="mr-2 size-4" />
                    {locationOpen ? 'Check out by location' : 'Check in by location'}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><SectionTitle icon={Clock3}>Today&apos;s timeline</SectionTitle></CardHeader>
          <CardContent>
            {todayLog ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Clock in</p>
                  <p className="font-medium">{todayLog.clock_in ? formatDisplayTimeIST(todayLog.clock_in) : '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Clock out</p>
                  <p className="font-medium">{todayLog.clock_out ? formatDisplayTimeIST(todayLog.clock_out) : 'Active'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="break-words font-medium">{todayLog.site?.name || 'Field location'}</p>
                </div>
              </div>
            ) : <p className="text-sm text-muted-foreground">No attendance recorded today.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><SectionTitle icon={CalendarDays}>Last 30 days</SectionTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map(({ key, day, log }) => (
                <div
                  key={key}
                  title={`${formatDisplayDateIST(key)}: ${log?.status || 'Absent'}`}
                  className={`flex aspect-square items-center justify-center rounded-md text-[11px] sm:text-xs ${log ? log.status === 'pending_review' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}
                >
                  {day}
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Green: recorded · Amber: pending review · Grey: no punch</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><SectionTitle icon={Clock3}>Recent attendance</SectionTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.paginatedItems.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{formatDisplayDateIST(log.date)}</p>
                    <p className="break-words text-xs text-muted-foreground">{log.site?.name || 'Field location'} · {log.status.replace('_', ' ')}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</p>
                </div>
              ))}
              {logs.length === 0 ? <p className="text-sm text-muted-foreground">Your attendance history will appear here.</p> : null}
            </div>
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

        <Card id="leave" className="scroll-mt-24">
          <CardHeader><SectionTitle icon={Plus}>Leave</SectionTitle></CardHeader>
          <CardContent>
            {leaveOpen ? (
              <form onSubmit={submitLeave} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">Start date</span>
                    <input required type="date" value={leave.start_date} onChange={(event) => setLeave({ ...leave, start_date: event.target.value })} className="min-h-12 w-full rounded-lg border bg-background px-3 text-base" />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-muted-foreground">End date</span>
                    <input required type="date" min={leave.start_date || undefined} value={leave.end_date} onChange={(event) => setLeave({ ...leave, end_date: event.target.value })} className="min-h-12 w-full rounded-lg border bg-background px-3 text-base" />
                  </label>
                </div>
                <textarea required value={leave.reason} onChange={(event) => setLeave({ ...leave, reason: event.target.value })} placeholder="Reason for leave" className="min-h-24 w-full rounded-lg border bg-background p-3 text-base" />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="submit" className="min-h-12 w-full sm:w-auto">Submit request</Button>
                  <Button type="button" variant="outline" className="min-h-12 w-full sm:w-auto" onClick={() => setLeaveOpen(false)}>Cancel</Button>
                </div>
                <p className="text-sm text-muted-foreground">{leaveMessage}</p>
              </form>
            ) : (
              <>
                <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={() => setLeaveOpen(true)}>Apply for leave</Button>
                {leaveMessage ? <p className="mt-3 text-sm text-muted-foreground">{leaveMessage}</p> : null}
              </>
            )}
            <div className="mt-4 space-y-3">
              {leaveHistory.paginatedItems.map((request) => (
                <div key={request.id} className="flex flex-col gap-1 border-t pt-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{formatDisplayDateIST(request.start_date)} – {formatDisplayDateIST(request.end_date)}</p>
                    <p className="break-words text-sm text-muted-foreground">{request.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.created_at ? `Submitted ${formatDisplayDateTimeIST(request.created_at)}` : ''}
                      {request.reviewed_at ? ` · Reviewed ${formatDisplayDateTimeIST(request.reviewed_at)}` : ''}
                    </p>
                  </div>
                  <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-xs capitalize ${leaveStatusClass(request.status)}`}>
                    {request.status}
                  </span>
                </div>
              ))}
              {leaveRequests.length === 0 ? <p className="text-sm text-muted-foreground">No leave requests yet.</p> : null}
            </div>
            {leaveHistory.totalItems > 0 ? (
              <TablePagination
                currentPage={leaveHistory.currentPage}
                totalPages={leaveHistory.totalPages}
                pageSize={leaveHistory.pageSize}
                totalItems={leaveHistory.totalItems}
                onPageChange={leaveHistory.handlePageChange}
                onPageSizeChange={leaveHistory.handlePageSizeChange}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card id="settings" className="scroll-mt-24">
          <CardHeader><SectionTitle icon={Settings}>Settings</SectionTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Camera and GPS turn on only on the Scan screen, and only while that browser tab is in front.</p>
            <p>Switching tabs, leaving Scan, or locking the phone turns them off.</p>
            <p className="break-words">Work type: {data.profile?.work_type || 'office'}</p>
            <p className="break-words">Department: {data.profile?.department || 'Not set'}</p>
          </CardContent>
        </Card>

        {data.isAdmin || data.profile?.role === 'admin' ? (
          <Card>
            <CardHeader><SectionTitle icon={MapPin}>Administration</SectionTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/admin/qr-generator" className="block w-full sm:w-auto"><Button variant="outline" className="min-h-12 w-full">QR generator</Button></Link>
              <Link href="/admin/live-ops" className="block w-full sm:w-auto"><Button variant="outline" className="min-h-12 w-full">Live operations</Button></Link>
              <Link href="/admin/audit-logs" className="block w-full sm:w-auto"><Button variant="outline" className="min-h-12 w-full">Audit ledger</Button></Link>
              <Link href="/admin/leave" className="block w-full sm:w-auto"><Button variant="outline" className="min-h-12 w-full">Leave requests</Button></Link>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AttendanceShell>
  );
}

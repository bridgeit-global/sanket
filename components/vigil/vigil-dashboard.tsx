'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Clock3, MapPin, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VigilShell, SectionTitle } from './vigil-shell';
import type { VigilAttendanceLog } from '@/lib/vigil/types';

export function VigilDashboard({ initialData }: { initialData: any }) {
  const [data, setData] = useState(initialData);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leave, setLeave] = useState({ start_date: '', end_date: '', reason: '' });
  const [leaveMessage, setLeaveMessage] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const today = new Date().toISOString().slice(0, 10);
  const todayLog = useMemo(() => (data.logs as VigilAttendanceLog[]).find((log) => log.date === today), [data.logs, today]);
  const elapsed = todayLog?.clock_in ? Math.max(0, now - new Date(todayLog.clock_in).getTime()) : 0;
  const hours = Math.floor(elapsed / 3_600_000);
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000);
  const refresh = async () => { const response = await fetch('/api/vigil/dashboard'); if (response.ok) setData(await response.json()); };
  const submitLeave = async (event: React.FormEvent) => {
    event.preventDefault(); setLeaveMessage('Submitting…');
    const response = await fetch('/api/vigil/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leave) });
    const result = await response.json();
    if (!response.ok) return setLeaveMessage(result.error || 'Could not submit leave request.');
    setLeaveOpen(false); setLeaveMessage('Leave request submitted.'); setLeave({ start_date: '', end_date: '', reason: '' });
  };
  const calendarDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(); date.setDate(date.getDate() - (29 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, day: date.getDate(), log: (data.logs as VigilAttendanceLog[]).find((item) => item.date === key) };
  });

  return <VigilShell><div className="space-y-6">
    <div className="flex items-start justify-between gap-4"><div><p className="text-sm text-muted-foreground">Good day</p><h1 className="text-2xl font-bold">{data.profile?.full_name || 'Employee'}</h1><p className="mt-1 text-sm text-muted-foreground">{data.profile?.department || 'Workforce attendance'}</p></div><Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh"><RefreshCw className="size-4" /></Button></div>
    <div className="grid gap-4 sm:grid-cols-2"><Card className="border-primary/30 bg-primary/5"><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Today&apos;s shift</CardTitle></CardHeader><CardContent><div className="flex items-end justify-between"><div><div className="text-3xl font-bold">{todayLog?.clock_in ? `${hours}h ${minutes}m` : 'Not started'}</div><p className="mt-1 text-sm text-muted-foreground">{todayLog?.clock_out ? 'Shift completed' : todayLog?.clock_in ? 'Currently active' : 'Scan to clock in'}</p></div><Clock3 className="size-8 text-primary" /></div></CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Quick action</CardTitle></CardHeader><CardContent><Link href="/scan"><Button className="min-h-12 w-full"><MapPin className="mr-2 size-4" />{todayLog?.clock_in && !todayLog.clock_out ? 'Clock out' : 'Scan to clock in'}</Button></Link></CardContent></Card></div>
    <Card><CardHeader><SectionTitle icon={Clock3}>Today&apos;s timeline</SectionTitle></CardHeader><CardContent>{todayLog ? <div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Clock in</p><p className="font-medium">{new Date(todayLog.clock_in!).toLocaleTimeString()}</p></div><div><p className="text-xs text-muted-foreground">Clock out</p><p className="font-medium">{todayLog.clock_out ? new Date(todayLog.clock_out).toLocaleTimeString() : 'Active'}</p></div><div><p className="text-xs text-muted-foreground">Location</p><p className="font-medium">{todayLog.site?.name || 'Verified site'}</p></div></div> : <p className="text-sm text-muted-foreground">No attendance recorded today.</p>}</CardContent></Card>
    <Card><CardHeader><SectionTitle icon={CalendarDays}>Last 30 days</SectionTitle></CardHeader><CardContent><div className="grid grid-cols-7 gap-2">{calendarDays.map(({ key, day, log }) => <div key={key} title={`${key}: ${log?.status || 'Absent'}`} className={`flex aspect-square items-center justify-center rounded-md text-xs ${log ? log.status === 'pending_review' ? 'bg-amber-500/20 text-amber-700' : 'bg-emerald-500/20 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{day}</div>)}</div><p className="mt-3 text-xs text-muted-foreground">Green: recorded · Amber: pending review · Grey: no punch</p></CardContent></Card>
    <Card><CardHeader><SectionTitle icon={Clock3}>Recent attendance</SectionTitle></CardHeader><CardContent><div className="space-y-3">{data.logs.slice(0, 8).map((log: VigilAttendanceLog) => <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-0"><div><p className="font-medium">{new Date(log.date).toLocaleDateString()}</p><p className="text-xs text-muted-foreground">{log.site?.name || 'Site'} · {log.status.replace('_', ' ')}</p></div><p className="text-sm text-muted-foreground">{log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : '—'}</p></div>)}{data.logs.length === 0 && <p className="text-sm text-muted-foreground">Your attendance history will appear here.</p>}</div></CardContent></Card>
    <Card id="leave"><CardHeader><SectionTitle icon={Plus}>Leave</SectionTitle></CardHeader><CardContent>{leaveOpen ? <form onSubmit={submitLeave} className="space-y-3"><div className="grid gap-3 sm:grid-cols-2"><input required type="date" value={leave.start_date} onChange={(event) => setLeave({ ...leave, start_date: event.target.value })} className="min-h-12 rounded-lg border bg-background px-3" /><input required type="date" value={leave.end_date} onChange={(event) => setLeave({ ...leave, end_date: event.target.value })} className="min-h-12 rounded-lg border bg-background px-3" /></div><textarea required value={leave.reason} onChange={(event) => setLeave({ ...leave, reason: event.target.value })} placeholder="Reason for leave" className="min-h-24 w-full rounded-lg border bg-background p-3" /><div className="flex gap-2"><Button type="submit" className="min-h-12">Submit request</Button><Button type="button" variant="outline" className="min-h-12" onClick={() => setLeaveOpen(false)}>Cancel</Button></div><p className="text-sm text-muted-foreground">{leaveMessage}</p></form> : <><Button variant="outline" className="min-h-12" onClick={() => setLeaveOpen(true)}>Apply for leave</Button>{leaveMessage && <p className="mt-3 text-sm text-muted-foreground">{leaveMessage}</p>}</>}</CardContent></Card>
    {data.profile?.role === 'admin' ? <Card><CardHeader><SectionTitle icon={MapPin}>Administration</SectionTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Link href="/admin/qr-generator"><Button variant="outline" className="min-h-12">QR generator</Button></Link><Link href="/admin/live-ops"><Button variant="outline" className="min-h-12">Live operations</Button></Link><Link href="/admin/audit-logs"><Button variant="outline" className="min-h-12">Audit ledger</Button></Link></CardContent></Card> : null}
  </div></VigilShell>;
}

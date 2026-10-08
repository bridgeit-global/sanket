'use client';

import { useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { VigilShell } from './vigil-shell';

export function VigilAuditLogs({ initialData }: { initialData: any }) {
  const [query, setQuery] = useState('');
  const logs = useMemo(() => initialData.logs.filter((log: any) => `${log.profile?.full_name || ''} ${log.site?.name || ''} ${log.status}`.toLowerCase().includes(query.toLowerCase())), [initialData.logs, query]);
  const exportCsv = () => {
    const rows = [['Date', 'Employee', 'Site', 'Status', 'Clock in', 'Clock out', 'Distance']].concat(logs.map((log: any) => [log.date, log.profile?.full_name || '', log.site?.name || '', log.status, log.clock_in || '', log.clock_out || '', log.distance_meters || '']));
    const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `vigil-attendance-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <VigilShell title="Vigil Admin"><div className="space-y-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm text-muted-foreground">Compliance and payroll</p><h1 className="text-2xl font-bold">Audit ledger</h1></div><Button variant="outline" className="min-h-12" onClick={exportCsv}><Download className="mr-2 size-4" />Export CSV</Button></div><Card><CardHeader><CardTitle className="flex items-center gap-2"><Search className="size-4" />Attendance records</CardTitle><Input className="mt-3 min-h-12" placeholder="Search employee, site, or status" value={query} onChange={(event) => setQuery(event.target.value)} /></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-muted-foreground"><tr><th className="p-3">Date</th><th className="p-3">Employee</th><th className="p-3">Site</th><th className="p-3">Status</th><th className="p-3">In</th><th className="p-3">Out</th><th className="p-3">Distance</th></tr></thead><tbody>{logs.map((log: any) => <tr key={log.id} className="border-b"><td className="p-3">{log.date}</td><td className="p-3">{log.profile?.full_name || '—'}</td><td className="p-3">{log.site?.name || '—'}</td><td className="p-3">{log.status}</td><td className="p-3">{log.clock_in ? new Date(log.clock_in).toLocaleTimeString() : '—'}</td><td className="p-3">{log.clock_out ? new Date(log.clock_out).toLocaleTimeString() : '—'}</td><td className="p-3">{log.distance_meters ? `${Math.round(log.distance_meters)}m` : '—'}</td></tr>)}</tbody></table>{logs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No matching records.</p>}</div></CardContent></Card></div></VigilShell>;
}

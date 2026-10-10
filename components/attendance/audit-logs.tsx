'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayDateIST, formatDisplayTimeIST, getTodayDateStringIST } from '@/lib/ist-date';
import { AttendanceShell } from './attendance-shell';

export function AttendanceAuditLogs({ initialData }: { initialData: any }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const logs = useMemo(
    () => initialData.logs.filter((log: any) => `${log.profile?.full_name || ''} ${log.site?.name || ''} ${log.status}`.toLowerCase().includes(query.toLowerCase())),
    [initialData.logs, query],
  );
  const history = usePagination(logs, 10, {
    page,
    pageSize,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  });

  useEffect(() => {
    setPage(1);
  }, [query]);

  const exportCsv = () => {
    const rows = [['Date', 'Employee', 'Site', 'Status', 'Clock in', 'Clock out', 'Distance']].concat(logs.map((log: any) => [
      log.date,
      log.profile?.full_name || '',
      log.site?.name || 'Field location',
      log.status,
      log.clock_in || '',
      log.clock_out || '',
      log.distance_meters || '',
    ]));
    const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${getTodayDateStringIST()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Compliance and payroll</p>
            <h1 className="text-2xl font-bold">Audit ledger</h1>
          </div>
          <Button variant="outline" className="min-h-12 w-full sm:w-auto" onClick={exportCsv}>
            <Download className="mr-2 size-4" />Export CSV
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Search className="size-4" />Attendance records</CardTitle>
            <Input className="mt-3 min-h-12 text-base" placeholder="Search employee, site, or status" value={query} onChange={(event) => setQuery(event.target.value)} />
          </CardHeader>
          <CardContent className="min-w-0">
            <div className="space-y-3 md:hidden">
              {history.paginatedItems.map((log: any) => (
                <div key={log.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words font-medium">{log.profile?.full_name || '—'}</p>
                      <p className="break-words text-xs text-muted-foreground">{formatDisplayDateIST(log.date)} · {log.site?.name || 'Field location'}</p>
                    </div>
                    <span className="shrink-0 text-xs capitalize">{String(log.status).replaceAll('_', ' ')}</span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div><dt className="text-xs text-muted-foreground">In</dt><dd>{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Out</dt><dd>{log.clock_out ? formatDisplayTimeIST(log.clock_out) : '—'}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Distance</dt><dd>{log.distance_meters ? `${Math.round(log.distance_meters)}m` : '—'}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <div className="hidden min-w-0 overflow-x-auto md:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Site</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">In</th>
                    <th className="p-3">Out</th>
                    <th className="p-3">Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {history.paginatedItems.map((log: any) => (
                    <tr key={log.id} className="border-b">
                      <td className="p-3">{formatDisplayDateIST(log.date)}</td>
                      <td className="p-3">{log.profile?.full_name || '—'}</td>
                      <td className="p-3">{log.site?.name || 'Field location'}</td>
                      <td className="p-3">{log.status}</td>
                      <td className="p-3">{log.clock_in ? formatDisplayTimeIST(log.clock_in) : '—'}</td>
                      <td className="p-3">{log.clock_out ? formatDisplayTimeIST(log.clock_out) : '—'}</td>
                      <td className="p-3">{log.distance_meters ? `${Math.round(log.distance_meters)}m` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No matching records.</p> : null}
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
    </AttendanceShell>
  );
}

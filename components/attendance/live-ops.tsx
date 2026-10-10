'use client';

import { Activity, AlertTriangle, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TablePagination, usePagination } from '@/components/table-pagination';
import { formatDisplayTimeIST, getTodayDateStringIST } from '@/lib/ist-date';
import { AttendanceShell } from './attendance-shell';

export function AttendanceLiveOps({ initialData }: { initialData: any }) {
  const today = getTodayDateStringIST();
  const logs = initialData.logs.filter((log: any) => log.date === today);
  const flagged = logs.filter((log: any) => log.status === 'pending_review' || !log.is_geofence_valid);
  const active = logs.filter((log: any) => log.clock_in && !log.clock_out);
  const office = active.filter((log: any) => log.site?.type === 'office');
  const cards = [
    { label: 'Total workforce', value: initialData.profiles.length, icon: Users },
    { label: 'Active now', value: active.length, icon: Activity },
    { label: 'In office', value: office.length, icon: MapPin },
    { label: 'Needs review', value: flagged.length, icon: AlertTriangle },
  ];
  const activity = usePagination(initialData.logs, 10);

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Live operations</p>
          <h1 className="text-2xl font-bold">Attendance command center</h1>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="p-4">
                <Icon className="mb-3 size-5 text-primary" />
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activity.paginatedItems.map((log: any) => (
                <div key={log.id} className="flex flex-col gap-2 border-b pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{log.profile?.full_name || 'Employee'}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      {log.site?.name || 'Field location'} · {log.status.replace('_', ' ')}
                      {log.clock_in ? ` · ${formatDisplayTimeIST(log.clock_in)}` : ''}
                    </p>
                  </div>
                  <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-xs ${log.status === 'pending_review' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                    {log.clock_out ? 'Completed' : 'Active'}
                  </span>
                </div>
              ))}
              {initialData.logs.length === 0 ? <p className="text-sm text-muted-foreground">No attendance activity yet.</p> : null}
            </div>
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

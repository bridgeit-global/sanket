'use client';

import { useMemo } from 'react';
import { Activity, AlertTriangle, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VigilShell } from './vigil-shell';

export function VigilLiveOps({ initialData }: { initialData: any }) {
  const today = new Date().toISOString().slice(0, 10);
  const logs = initialData.logs.filter((log: any) => log.date === today);
  const flagged = logs.filter((log: any) => log.status === 'pending_review' || !log.is_geofence_valid);
  const active = logs.filter((log: any) => log.clock_in && !log.clock_out);
  const office = active.filter((log: any) => log.site?.type === 'office');
  const cards = [{ label: 'Total workforce', value: initialData.profiles.length, icon: Users }, { label: 'Active now', value: active.length, icon: Activity }, { label: 'In office', value: office.length, icon: MapPin }, { label: 'Needs review', value: flagged.length, icon: AlertTriangle }];
  return <VigilShell title="Vigil Admin"><div className="space-y-6"><div><p className="text-sm text-muted-foreground">Live operations</p><h1 className="text-2xl font-bold">Attendance command center</h1></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="p-4"><Icon className="mb-3 size-5 text-primary" /><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Recent activity</CardTitle></CardHeader><CardContent><div className="space-y-3">{initialData.logs.slice(0, 20).map((log: any) => <div key={log.id} className="flex items-center justify-between border-b pb-3 last:border-0"><div><p className="font-medium">{log.profile?.full_name || 'Employee'}</p><p className="text-xs text-muted-foreground">{log.site?.name || 'Site'} · {log.status.replace('_', ' ')}</p></div><span className={`rounded-full px-2 py-1 text-xs ${log.status === 'pending_review' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'}`}>{log.clock_out ? 'Completed' : 'Active'}</span></div>)}{initialData.logs.length === 0 && <p className="text-sm text-muted-foreground">No attendance activity yet.</p>}</div></CardContent></Card></div></VigilShell>;
}

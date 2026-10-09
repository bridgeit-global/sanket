'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, MapPin, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AttendanceShell } from './attendance-shell';

export function AttendanceAdminSites() {
  const [sites, setSites] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [qr, setQr] = useState('');

  useEffect(() => {
    fetch('/api/attendance/admin/sites')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) {
          throw new Error(data.error || 'Could not load sites.');
        }
        setSites(data);
      })
      .catch((error) => {
        setLoadError(error instanceof Error ? error.message : 'Could not load sites.');
      });
  }, []);

  useEffect(() => {
    if (!selected) return;
    QRCode.toDataURL(selected.qr_code_token, { width: 800, margin: 2 }).then(setQr);
  }, [selected]);

  return (
    <AttendanceShell title="Attendance">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Attendance controls</p>
          <h1 className="text-2xl font-bold">QR generator</h1>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <CardHeader><CardTitle>Offices and field sites</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loadError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">Sites could not be loaded.</p>
                  <p className="mt-1">{loadError}</p>
                  <p className="mt-2 text-xs">Apply the attendance database migration before configuring sites.</p>
                </div>
              ) : sites.map((site) => (
                <button key={site.id} type="button" onClick={() => setSelected(site)} className={`flex min-h-14 w-full items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left ${selected?.id === site.id ? 'border-primary bg-primary/5' : ''}`}>
                  <span className="min-w-0">
                    <span className="block break-words font-medium">{site.name}</span>
                    <span className="block break-words text-xs text-muted-foreground">{site.address || 'Address not configured'}</span>
                    <span className="block font-mono text-xs tracking-[0.25em] text-muted-foreground">{site.qr_code_token}</span>
                    <span className="text-xs text-muted-foreground">{site.type === 'office' ? `Office · ${site.geofence_radius_meters}m GPS` : `Field site · ${site.geofence_radius_meters}m GPS`}</span>
                  </span>
                  <MapPin className="mt-1 size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
              {!loadError && sites.length === 0 ? <p className="text-sm text-muted-foreground">No sites configured yet.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Printable QR poster</CardTitle></CardHeader>
            <CardContent className="text-center">
              {selected && qr ? (
                <>
                  <div className="rounded-xl border bg-white p-4">
                    <img src={qr} alt={`QR code for ${selected.name}`} className="mx-auto h-auto w-full max-w-64" />
                    <p className="mt-3 break-words text-xl font-bold text-black">{selected.name}</p>
                    <p className="mt-1 font-mono text-lg font-semibold tracking-[0.3em] text-black">{selected.qr_code_token}</p>
                    <p className="text-sm text-slate-600">Scan to record attendance</p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button className="min-h-12 w-full sm:flex-1" onClick={() => window.print()}><Printer className="mr-2 size-4" />Print</Button>
                    <a href={qr} download={`attendance-${selected.name}.png`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md border px-4 sm:w-auto"><Download className="size-4" />Download</a>
                  </div>
                </>
              ) : <div className="py-12 text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-3 size-10" />Select a site to generate its poster.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </AttendanceShell>
  );
}

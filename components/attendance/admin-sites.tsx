'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, MapPin, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VigilShell } from './vigil-shell';

export function VigilAdminSites() {
  const [sites, setSites] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [qr, setQr] = useState('');

  useEffect(() => {
    fetch('/api/vigil/admin/sites')
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
    <VigilShell title="Vigil Admin">
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Attendance controls</p>
          <h1 className="text-2xl font-bold">QR generator</h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader><CardTitle>Offices and field sites</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {loadError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                  <p className="font-medium">Sites could not be loaded.</p>
                  <p className="mt-1">{loadError}</p>
                  <p className="mt-2 text-xs">Apply the Vigil database migration before configuring sites.</p>
                </div>
              ) : sites.map((site) => (
                <button key={site.id} type="button" onClick={() => setSelected(site)} className={`flex min-h-14 w-full items-center justify-between rounded-lg border px-4 text-left ${selected?.id === site.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                  <span><span className="block font-medium">{site.name}</span><span className="block text-xs text-muted-foreground">{site.address || 'Address not configured'}</span><span className="text-xs text-muted-foreground">{site.type === 'office' ? 'Office · IP + 20m GPS' : `Field site · ${site.geofence_radius_meters}m GPS`}</span></span>
                  <MapPin className="size-4 text-muted-foreground" />
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
                  <div className="rounded-xl border bg-white p-4"><img src={qr} alt={`QR code for ${selected.name}`} className="mx-auto size-64" /><p className="mt-3 text-xl font-bold text-black">{selected.name}</p><p className="text-sm text-slate-600">Scan with Vigil to record attendance</p></div>
                  <div className="mt-4 flex gap-2"><Button className="min-h-12 flex-1" onClick={() => window.print()}><Printer className="mr-2 size-4" />Print</Button><a href={qr} download={`vigil-${selected.name}.png`} className="inline-flex min-h-12 items-center justify-center rounded-md border px-4"><Download className="size-4" /></a></div>
                </>
              ) : <div className="py-12 text-sm text-muted-foreground"><ShieldCheck className="mx-auto mb-3 size-10" />Select a site to generate its poster.</div>}
            </CardContent>
          </Card>
        </div>
      </div>
    </VigilShell>
  );
}

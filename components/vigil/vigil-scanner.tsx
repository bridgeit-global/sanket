'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CheckCircle2, Flashlight, LocateFixed, Radio, ScanLine, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VigilShell } from './vigil-shell';

export function VigilScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [mode, setMode] = useState<'clock_in' | 'clock_out'>('clock_in');
  const [token, setToken] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [message, setMessage] = useState('Point your camera at the site QR code.');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<any>(null);

  useEffect(() => {
    fetch('/api/vigil/network').then((response) => response.json()).then((data) => setIp(data.ip || null)).catch(() => undefined);
    if (!navigator.geolocation) return;
    navigator.geolocation.watchPosition((position) => setLocation({ lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy }), () => setMessage('Location permission is required to verify attendance.'), { enableHighAccuracy: true, maximumAge: 10_000 });
  }, []);

  useEffect(() => {
    let active = true;
    const reader = new BrowserMultiFormatReader();
    if (videoRef.current) {
      reader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } }, audio: false }, videoRef.current, (result) => {
        if (active && result) { setToken(result.getText()); setMessage('QR detected. Ready to submit.'); }
      }).then((controls) => { controlsRef.current = controls; }).catch(() => setMessage('Camera unavailable. You can enter the QR token manually.'));
    }
    return () => { active = false; controlsRef.current?.stop(); };
  }, []);

  const submit = async () => {
    if (!token) return setMessage('Scan a QR code first.');
    if (!location) return setMessage('Waiting for an accurate GPS location.');
    setBusy(true); setMessage('Verifying your attendance…');
    try {
      const response = await fetch('/api/vigil/punch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, mode, latitude: location.lat, longitude: location.lng }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Attendance could not be recorded.');
      navigator.vibrate?.([100, 50, 100]); setSuccess(data.log); setMessage('Attendance recorded successfully.');
    } catch (error) { navigator.vibrate?.(200); setMessage(error instanceof Error ? error.message : 'Verification failed.'); }
    finally { setBusy(false); }
  };

  return <VigilShell><div className="mx-auto max-w-lg space-y-5"><div><p className="text-sm text-muted-foreground">Secure attendance</p><h1 className="text-2xl font-bold">Scan to {mode === 'clock_in' ? 'clock in' : 'clock out'}</h1></div><div className="grid grid-cols-2 rounded-xl bg-muted p-1">{(['clock_in', 'clock_out'] as const).map((value) => <button key={value} type="button" onClick={() => setMode(value)} className={`min-h-12 rounded-lg text-sm font-medium ${mode === value ? 'bg-background shadow' : 'text-muted-foreground'}`}>{value === 'clock_in' ? 'Clock in' : 'Clock out'}</button>)}</div><Card className="overflow-hidden"><CardContent className="p-0"><div className="relative aspect-square bg-black"><video ref={videoRef} className="size-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-12 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]"><ScanLine className="absolute -right-3 -top-3 size-7 text-primary" /></div><div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-black/60 px-3 py-2 text-xs text-white"><span className="flex items-center gap-1"><LocateFixed className="size-3" />{location ? `±${Math.round(location.accuracy)}m` : 'Locating…'}</span><span className="flex items-center gap-1"><Radio className="size-3" />{ip ? 'Network detected' : 'Network unknown'}</span></div></div></CardContent></Card><div className="space-y-3"><label className="block text-sm font-medium" htmlFor="vigil-token">QR token fallback</label><input id="vigil-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token only if camera is unavailable" className="min-h-12 w-full rounded-lg border bg-background px-3" /><Button onClick={submit} disabled={busy} className="min-h-12 w-full">{busy ? 'Verifying…' : <><Camera className="mr-2 size-4" />Verify attendance</>}</Button><p className="text-center text-sm text-muted-foreground">{message}</p></div>{success ? <Card className="border-emerald-500/40 bg-emerald-500/5"><CardContent className="flex items-start gap-3 p-4"><CheckCircle2 className="mt-0.5 size-5 text-emerald-500" /><div><p className="font-semibold">Attendance confirmed</p><p className="text-sm text-muted-foreground">{success.site?.name || 'Verified site'} · {new Date(success.clock_in || success.clock_out).toLocaleString()}</p></div></CardContent></Card> : null}</div></VigilShell>;
}

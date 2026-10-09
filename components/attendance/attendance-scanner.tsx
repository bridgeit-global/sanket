'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser';
import { Camera, CheckCircle2, LocateFixed, Radio, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { normalizeAttendanceQrToken } from '@/lib/attendance/qr-token';
import { formatDisplayDateTimeIST } from '@/lib/ist-date';
import { AttendanceShell } from './attendance-shell';

type GeoFix = { lat: number; lng: number; accuracy: number };
type ScannerControls = { stop: () => void };

function releaseVideo(video: HTMLVideoElement | null) {
  const stream = video?.srcObject;
  if (stream instanceof MediaStream) {
    for (const track of stream.getTracks()) track.stop();
  }
  if (video) {
    video.pause();
    video.srcObject = null;
  }
}

function stopControls(controls: ScannerControls | null) {
  if (!controls) return;
  try {
    const result = controls.stop() as void | Promise<void>;
    if (result && typeof result.then === 'function') {
      void result.catch(() => undefined);
    }
  } catch {
    // The scanner may already have stopped.
  }
}

function releaseCamera(video: HTMLVideoElement | null, controls: ScannerControls | null) {
  stopControls(controls);
  releaseVideo(video);
  try {
    BrowserCodeReader.releaseAllStreams();
  } catch {
    // No tracked streams to release.
  }
}

export function AttendanceScanner({ initialMode = 'clock_in' }: { initialMode?: 'clock_in' | 'clock_out' }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<'clock_in' | 'clock_out'>(initialMode);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);
  const [token, setToken] = useState('');
  const [location, setLocation] = useState<GeoFix | null>(null);
  const [gpsState, setGpsState] = useState<'locating' | 'ready' | 'denied' | 'unavailable'>('locating');
  const [cameraState, setCameraState] = useState<'starting' | 'live' | 'off' | 'blocked'>('starting');
  const [ip, setIp] = useState<string | null>(null);
  const [message, setMessage] = useState('Point your camera at the site QR code.');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ site?: { name?: string }; clock_in?: string; clock_out?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let watchId: number | null = null;

    const stopGps = () => {
      if (watchId != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
    };

    const startGps = () => {
      if (cancelled || document.hidden) return;
      if (!navigator.geolocation) {
        setGpsState('unavailable');
        return;
      }
      stopGps();
      setGpsState((current) => (current === 'ready' ? current : 'locating'));
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          if (cancelled || document.hidden) return;
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
          setGpsState('ready');
        },
        (error) => {
          if (cancelled) return;
          if (error.code === error.PERMISSION_DENIED) {
            setLocation(null);
            setGpsState('denied');
            return;
          }
          setGpsState((current) => (current === 'ready' ? current : 'locating'));
        },
        { enableHighAccuracy: true, maximumAge: 5_000, timeout: 12_000 },
      );
    };

    const onHidden = () => {
      if (document.hidden) stopGps();
      else startGps();
    };

    fetch('/api/attendance/network')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setIp(data.ip || null);
      })
      .catch(() => undefined);

    startGps();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stopGps);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', stopGps);
      stopGps();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;
    let controls: ScannerControls | null = null;
    let runId = 0;
    let chain = Promise.resolve();

    const dropCurrent = () => {
      const current = controls;
      controls = null;
      releaseCamera(video, current);
    };

    const stopCamera = () => {
      runId += 1;
      dropCurrent();
      if (!cancelled) setCameraState('off');
    };

    const startCamera = () => {
      if (cancelled || document.hidden || !video) return;
      runId += 1;
      const ticket = runId;
      dropCurrent();
      setCameraState('starting');

      chain = chain.catch(() => undefined).then(async () => {
        if (cancelled || document.hidden || ticket !== runId || !video) return;
        const reader = new BrowserMultiFormatReader();
        try {
          const next = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            video,
            (result) => {
              if (cancelled || ticket !== runId || !result) return;
              setToken(normalizeAttendanceQrToken(result.getText()));
              setMessage('QR detected. Ready to submit.');
            },
          );
          if (cancelled || document.hidden || ticket !== runId) {
            stopControls(next);
            return;
          }
          controls = next;
          setCameraState('live');
        } catch (error) {
          if (cancelled || ticket !== runId) return;
          const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');
          setCameraState(denied ? 'blocked' : 'off');
          setMessage(denied
            ? 'Camera permission is off. Allow camera for this site, or paste the QR token below.'
            : 'Camera unavailable. You can enter the QR token manually.');
        }
      });
    };

    const onHidden = () => {
      if (document.hidden) stopCamera();
      else void startCamera();
    };

    void startCamera();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stopCamera);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', stopCamera);
      stopCamera();
    };
  }, []);

  const submit = async () => {
    if (!token) return setMessage('Scan a QR code first.');
    if (!location) return setMessage(gpsState === 'denied' ? 'Allow location to verify attendance.' : 'Waiting for an accurate GPS location.');
    setBusy(true);
    setMessage('Verifying your attendance…');
    try {
      const response = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, mode, latitude: location.lat, longitude: location.lng }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Attendance could not be recorded.');
      navigator.vibrate?.([100, 50, 100]);
      setSuccess(data.log);
      setMessage('Attendance recorded successfully.');
    } catch (error) {
      navigator.vibrate?.(200);
      setMessage(error instanceof Error ? error.message : 'Verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmedAt = success?.clock_in || success?.clock_out;
  const gpsLabel = gpsState === 'ready' && location
    ? `±${Math.round(location.accuracy)}m`
    : gpsState === 'denied'
      ? 'Location off'
      : gpsState === 'unavailable'
        ? 'No GPS'
        : 'Locating…';
  const cameraLabel = cameraState === 'live' ? 'Camera on' : cameraState === 'blocked' ? 'Camera blocked' : cameraState === 'starting' ? 'Starting camera' : 'Camera off';

  return (
    <AttendanceShell>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Secure attendance</p>
          <h1 className="text-2xl font-bold">Scan to {mode === 'clock_in' ? 'clock in' : 'clock out'}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Camera and GPS stay on only while this screen is open.</p>
        </div>
        <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
          {(['clock_in', 'clock_out'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              className={`min-h-12 rounded-lg text-sm font-medium ${mode === value ? 'bg-background shadow' : 'text-muted-foreground'}`}
            >
              {value === 'clock_in' ? 'Clock in' : 'Clock out'}
            </button>
          ))}
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-[min(58dvh,28rem)] w-full overflow-hidden bg-black sm:aspect-square sm:h-auto">
              <video ref={videoRef} className="size-full object-cover" muted autoPlay playsInline />
              <div className="pointer-events-none absolute inset-8 rounded-3xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] sm:inset-12" />
              <ScanLine className="pointer-events-none absolute right-5 top-5 size-7 text-primary sm:right-8 sm:top-8" />
              <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/60 px-3 py-2 text-xs text-white">
                <span className="flex items-center gap-1"><LocateFixed className="size-3 shrink-0" />{gpsLabel}</span>
                <span className="flex items-center gap-1"><Camera className="size-3 shrink-0" />{cameraLabel}</span>
                <span className="flex items-center gap-1"><Radio className="size-3 shrink-0" />{ip ? 'Network detected' : 'Network unknown'}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-3">
          <label className="block text-sm font-medium" htmlFor="attendance-token">QR token fallback</label>
          <input
            id="attendance-token"
            value={token}
            onChange={(event) => setToken(normalizeAttendanceQrToken(event.target.value))}
            placeholder="10-character code"
            maxLength={10}
            autoCapitalize="characters"
            className="min-h-12 w-full rounded-lg border bg-background px-3 font-mono text-base uppercase tracking-[0.3em]"
          />
          <Button onClick={submit} disabled={busy} className="min-h-12 w-full">
            {busy ? 'Verifying…' : <><Camera className="mr-2 size-4" />Verify attendance</>}
          </Button>
          <p className="text-center text-sm text-muted-foreground">{message}</p>
          {gpsState === 'denied' ? (
            <p className="text-center text-sm text-amber-700 dark:text-amber-400">Turn location on for this site, then come back to Scan.</p>
          ) : null}
        </div>
        {success ? (
          <Card className="border-emerald-500/40 bg-emerald-500/5">
            <CardContent className="flex items-start gap-3 p-4">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="font-semibold">Attendance confirmed</p>
                <p className="break-words text-sm text-muted-foreground">
                  {success.site?.name || 'Verified site'}
                  {confirmedAt ? ` · ${formatDisplayDateTimeIST(confirmedAt)}` : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AttendanceShell>
  );
}

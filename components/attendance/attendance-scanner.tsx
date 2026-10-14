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

export function AttendanceScanner({
  initialMethod = 'qr',
}: {
  initialMethod?: 'qr' | 'field';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [method, setMethod] = useState<'qr' | 'field'>(initialMethod);

  useEffect(() => {
    setMethod(initialMethod);
  }, [initialMethod]);
  const [token, setToken] = useState('');
  const [location, setLocation] = useState<GeoFix | null>(null);
  const [gpsState, setGpsState] = useState<'locating' | 'ready' | 'denied' | 'unavailable'>('locating');
  const [cameraState, setCameraState] = useState<'starting' | 'live' | 'off' | 'blocked'>('starting');
  const [ip, setIp] = useState<string | null>(null);
  const [message, setMessage] = useState(initialMethod === 'field' ? 'Allow location to mark your field attendance.' : 'Point your camera at the site QR code.');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ site?: { name?: string }; clock_in?: string } | null>(null);

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
      if (cancelled || document.hidden || !video || method !== 'qr') return;
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

    if (method === 'qr') void startCamera();
    else stopCamera();
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', stopCamera);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', stopCamera);
      stopCamera();
    };
  }, [method]);

  const submit = async () => {
    if (method === 'qr' && !token) return setMessage('Scan a QR code first.');
    if (!location) return setMessage(gpsState === 'denied' ? 'Allow location to verify attendance.' : 'Waiting for an accurate GPS location.');
    setBusy(true);
    setMessage('Verifying your attendance…');
    try {
      const response = await fetch('/api/attendance/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(method === 'field'
          ? { locationOnly: true, mode: 'clock_in', latitude: location.lat, longitude: location.lng }
          : { token, mode: 'clock_in', latitude: location.lat, longitude: location.lng }),
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

  const confirmedAt = success?.clock_in;
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
      <div className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-rows-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(16rem,22rem)] sm:grid-rows-1 sm:gap-4">
        <div className="flex min-h-0 flex-col gap-2 sm:col-start-1 sm:row-start-1">
          <div className="shrink-0 min-w-0">
            <p className="text-xs text-muted-foreground sm:text-sm">Secure attendance</p>
            <h1 className="text-lg font-bold leading-tight sm:text-2xl">
              {method === 'field' ? 'Mark present by location' : 'Scan to mark present'}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
              {method === 'field'
                ? 'Use this when you work in the field and do not come to the office. Your current location is saved with the attendance mark.'
                : 'Camera and GPS stay on only while this screen is open.'}
            </p>
          </div>
          <div className="grid shrink-0 grid-cols-2 rounded-xl bg-muted p-1">
            {(['qr', 'field'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMethod(value);
                  setSuccess(null);
                  setMessage(value === 'field' ? 'Allow location to mark your field attendance.' : 'Point your camera at the site QR code.');
                }}
                className={`min-h-10 rounded-lg px-2 text-sm font-medium ${method === value ? 'bg-background shadow' : 'text-muted-foreground'}`}
              >
                {value === 'qr' ? 'Office QR' : 'Field location'}
              </button>
            ))}
          </div>
          {method === 'field' ? (
            <Card className="shrink-0">
              <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                <LocateFixed className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium">Current location</p>
                  <p className="text-sm text-muted-foreground">{gpsLabel}. No site or QR code is required.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex min-h-24 flex-1 flex-col overflow-hidden">
              <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
                  <video ref={videoRef} className="absolute inset-0 size-full object-cover" muted autoPlay playsInline />
                  <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] sm:inset-6" />
                  <ScanLine className="pointer-events-none absolute right-4 top-4 size-6 text-primary" />
                </div>
                <div className="grid shrink-0 grid-cols-3 divide-x divide-white/15 bg-neutral-950 text-[10px] leading-tight text-white sm:text-xs">
                  <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center">
                    <LocateFixed className="size-3.5 shrink-0" />
                    <span className="max-w-full">{gpsLabel}</span>
                  </span>
                  <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center">
                    <Camera className="size-3.5 shrink-0" />
                    <span className="max-w-full">{cameraLabel}</span>
                  </span>
                  <span className="flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center">
                    <Radio className="size-3.5 shrink-0" />
                    <span className="max-w-full">{ip ? 'Network detected' : 'Network unknown'}</span>
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        <div className="flex min-h-0 flex-col justify-end gap-2 sm:col-start-2 sm:row-start-1 sm:justify-center">
          {method === 'qr' ? (
            <>
              <label className="block text-sm font-medium" htmlFor="attendance-token">QR token fallback</label>
              <input
                id="attendance-token"
                value={token}
                onChange={(event) => setToken(normalizeAttendanceQrToken(event.target.value))}
                placeholder="10-character code"
                maxLength={10}
                autoCapitalize="characters"
                className="h-10 w-full rounded-lg border bg-background px-3 font-mono text-base uppercase tracking-[0.2em] sm:h-12 sm:tracking-[0.3em]"
              />
            </>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LocateFixed className="size-4 shrink-0" />
              {gpsLabel}
            </p>
          )}
          <Button onClick={submit} disabled={busy} className="h-10 w-full sm:h-12">
            {busy ? 'Verifying…' : method === 'field'
              ? 'Mark present'
              : <><Camera className="mr-2 size-4" />Mark present</>}
          </Button>
          <p className="text-center text-xs text-muted-foreground sm:text-sm">{message}</p>
          {gpsState === 'denied' ? (
            <p className="text-center text-xs text-amber-700 dark:text-amber-400 sm:text-sm">Turn location on for this site, then come back to Scan.</p>
          ) : null}
          {success ? (
            <Card className="border-emerald-500/40 bg-emerald-500/5">
              <CardContent className="flex items-start gap-3 p-3 sm:p-4">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                <div className="min-w-0">
                  <p className="font-semibold">Attendance confirmed</p>
                  <p className="break-words text-sm text-muted-foreground">
                    {method === 'field' ? 'Field location' : (success.site?.name || 'Verified site')}
                    {confirmedAt ? ` · ${formatDisplayDateTimeIST(confirmedAt)}` : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AttendanceShell>
  );
}

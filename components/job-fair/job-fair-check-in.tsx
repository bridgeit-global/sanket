'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, QrCode, UserRoundPlus } from 'lucide-react';

import { QrScannerDialog } from '@/components/qr-scanner-dialog';
import { toast } from '@/components/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { buildThermalTicketText, shareThermalTicketPdf } from '@/lib/thermal/receipt';
import {
  isJobFairCheckedIn,
  jobFairStatusLabel,
  parseJobFairRegistrationNo,
  type JobFairCheckInRecord,
  type JobFairCheckInVisitor,
} from '@/lib/job-fair/check-in';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  JOB_FAIR_EVENT,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  optionLabel,
} from '@/lib/job-fair/options';

type CheckInResult = {
  registration: JobFairCheckInRecord;
  visitor: JobFairCheckInVisitor;
  alreadyCheckedIn: boolean;
};

function areaText(registration: JobFairCheckInRecord): string {
  return registration.area === AREA_OTHER
    ? registration.areaOther?.trim() || 'Other'
    : optionLabel(AREA_OPTIONS, registration.area);
}

function jobTypesText(registration: JobFairCheckInRecord): string {
  return registration.jobTypes
    .map((value) =>
      value === JOB_TYPE_OTHER && registration.jobTypeOther
        ? `Other: ${registration.jobTypeOther}`
        : optionLabel(JOB_TYPE_OPTIONS, value),
    )
    .filter(Boolean)
    .join(', ');
}

export function JobFairCheckIn({
  initialCode,
  onCheckedIn,
}: {
  initialCode?: string | null;
  onCheckedIn?: () => void;
}) {
  const [draft, setDraft] = useState(initialCode?.trim().toUpperCase() ?? '');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [registration, setRegistration] = useState<JobFairCheckInRecord | null>(null);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const autoLookupCode = useRef<string | null>(null);

  const lookup = useCallback(async (payload: string) => {
    const code = parseJobFairRegistrationNo(payload);
    if (!code) {
      throw new Error('This QR is not a YUVAAZ registration.');
    }
    setDraft(code);
    setLookingUp(true);
    setRegistration(null);
    setResult(null);
    try {
      const res = await fetch(`/api/job-fair/check-in?code=${encodeURIComponent(code)}`);
      const json = (await res.json()) as {
        registration?: JobFairCheckInRecord;
        error?: string;
      };
      if (!res.ok || !json.registration) {
        throw new Error(json.error || 'Could not look up this registration.');
      }
      setRegistration(json.registration);
      return json.registration;
    } finally {
      setLookingUp(false);
    }
  }, []);

  useEffect(() => {
    const code = parseJobFairRegistrationNo(initialCode ?? '');
    if (!code || autoLookupCode.current === code) return;
    autoLookupCode.current = code;
    lookup(code).catch((err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Could not look up this registration.');
    });
  }, [initialCode, lookup]);

  const checkIn = async () => {
    if (!registration) return;
    setCheckingIn(true);
    try {
      const res = await fetch('/api/job-fair/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: registration.registrationNo }),
      });
      const json = (await res.json()) as CheckInResult & { error?: string };
      if (!res.ok || !json.visitor) {
        throw new Error(json.error || 'Could not check in this registration.');
      }
      setRegistration(json.registration);
      setResult(json);
      onCheckedIn?.();
      toast.success(
        json.alreadyCheckedIn
          ? `${json.visitor.name} is already checked in. Visit token ${json.visitor.token}.`
          : `${json.visitor.name} checked in. Visit token ${json.visitor.token}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not check in this registration.');
    } finally {
      setCheckingIn(false);
    }
  };

  const printToken = async () => {
    if (!result) return;
    setPrinting(true);
    try {
      const receiptText = buildThermalTicketText({
        token: result.visitor.token,
        createdAt: new Date(),
        name: result.visitor.name,
        mobile: result.visitor.mobileNumber,
        serviceName: result.visitor.serviceName || JOB_FAIR_EVENT.title,
        width: 32,
      });
      await shareThermalTicketPdf(
        receiptText,
        `thermal-ticket-${result.visitor.token.toLowerCase()}`,
        {
          headerImageUrl: '/images/ncp_election_symbol.png',
          qrValue: result.visitor.token,
          paperWidthMm: 88,
        },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not print the visit token.');
    } finally {
      setPrinting(false);
    }
  };

  const reset = () => {
    setDraft('');
    setRegistration(null);
    setResult(null);
  };

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">YUVAAZ check-in</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Scan the registration QR to confirm the candidate and add them as a visitor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            lookup(draft).catch((err: unknown) => {
              setRegistration(null);
              toast.error(
                err instanceof Error ? err.message : 'Could not look up this registration.',
              );
            });
          }}
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value.toUpperCase())}
            placeholder="YUVAAZ-XXXX"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-10 w-full font-mono"
            aria-label="Registration number"
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full sm:w-auto"
            onClick={() => setScannerOpen(true)}
          >
            <QrCode className="size-4" />
            Scan QR
          </Button>
          <Button type="submit" className="h-10 w-full sm:w-auto" disabled={lookingUp || !draft.trim()}>
            {lookingUp ? <Loader2 className="size-4 animate-spin" /> : null}
            Look up
          </Button>
        </form>

        {registration ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="break-words text-lg font-semibold">{registration.fullName}</div>
                <div className="font-mono text-sm text-muted-foreground">
                  {registration.registrationNo}
                </div>
              </div>
              <Badge variant={isJobFairCheckedIn(registration.status) ? 'default' : 'secondary'}>
                {jobFairStatusLabel(registration.status)}
              </Badge>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              {(
                [
                  ['Mobile', registration.mobile],
                  ['WhatsApp', registration.whatsapp],
                  ['Age', String(registration.age)],
                  ['Gender', optionLabel(GENDER_OPTIONS, registration.gender)],
                  ['Area', areaText(registration)],
                  ['PIN code', registration.pincode],
                  ['Voter ID', registration.epicNumber || '—'],
                  ['Qualification', optionLabel(QUALIFICATION_OPTIONS, registration.qualification)],
                  ['Course', registration.course || '—'],
                  [
                    'Employment',
                    optionLabel(EMPLOYMENT_STATUS_OPTIONS, registration.employmentStatus),
                  ],
                  ['Experience', optionLabel(EXPERIENCE_OPTIONS, registration.experience)],
                  ['Job preference', jobTypesText(registration) || '—'],
                ] as Array<[string, string]>
              ).map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            {result ? (
              <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">
                      {result.alreadyCheckedIn
                        ? 'Already checked in. Visitor token is ready.'
                        : 'Checked in and added as a visitor.'}
                    </div>
                    <div className="mt-1 break-all font-mono text-xl font-bold tracking-wide">
                      {result.visitor.token}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full bg-white sm:w-auto"
                    disabled={printing}
                    onClick={() => void printToken()}
                  >
                    {printing ? <Loader2 className="size-4 animate-spin" /> : null}
                    Print visit token
                  </Button>
                  <Button type="button" variant="outline" className="h-10 w-full bg-white sm:w-auto" onClick={reset}>
                    Scan another
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  className="h-10 w-full sm:w-auto"
                  disabled={checkingIn}
                  onClick={() => void checkIn()}
                >
                  {checkingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserRoundPlus className="size-4" />
                  )}
                  {isJobFairCheckedIn(registration.status)
                    ? 'Add visitor token'
                    : 'Check in and add visitor'}
                </Button>
                <Button type="button" variant="outline" className="h-10 w-full sm:w-auto" onClick={reset}>
                  Clear
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </CardContent>

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={async (payload) => {
          await lookup(payload);
        }}
        title="Scan YUVAAZ QR"
        description="Point the camera at the QR on the registration receipt."
      />
    </Card>
  );
}

/** Visit-desk service name stored on the visitor token. */
export const JOB_FAIR_VISIT_SERVICE = 'YUVAAZ 2026';

/** `YUVAAZ-` plus 4 letters or digits (current codes and older numeric ones). */
const REGISTRATION_NO_RE = /YUVAAZ-[A-Z0-9]{4}/;

export type JobFairCheckInRecord = {
  id: string;
  registrationNo: string;
  fullName: string;
  mobile: string;
  whatsapp: string;
  age: number;
  gender: string;
  area: string;
  areaOther: string | null;
  pincode: string;
  epicNumber: string | null;
  qualification: string;
  course: string | null;
  employmentStatus: string;
  experience: string;
  jobTypes: string[];
  jobTypeOther: string | null;
  status: string;
};

export type JobFairCheckInVisitor = {
  id: string;
  token: string;
  name: string;
  mobileNumber: string;
  serviceName: string | null;
};

export function isJobFairCheckedIn(status: string): boolean {
  return status === 'attended' || status === 'shortlisted' || status === 'placed';
}

export function jobFairStatusLabel(status: string): string {
  if (status === 'attended') return 'Checked in';
  if (status === 'shortlisted') return 'Shortlisted';
  if (status === 'placed') return 'Placed';
  return 'Registered';
}

/** Staff desk URL opened when the receipt QR is scanned. */
export function buildJobFairCheckInPath(registrationNo: string): string {
  const params = new URLSearchParams({
    tab: 'visitor',
    yuvaaz: registrationNo,
  });
  return `/modules/operator?${params.toString()}`;
}

/** Pull a registration number out of a raw code or a check-in URL. */
export function parseJobFairRegistrationNo(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const fromQuery =
      url.searchParams.get('yuvaaz') ?? url.searchParams.get('registrationNo');
    if (fromQuery) {
      const parsed = fromQuery.toUpperCase().match(REGISTRATION_NO_RE);
      if (parsed) return parsed[0];
    }
  } catch {
    // Plain text, not a URL.
  }

  return raw.toUpperCase().match(REGISTRATION_NO_RE)?.[0] ?? null;
}

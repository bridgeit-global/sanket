import { type NextRequest, NextResponse } from 'next/server';

import { listAllJobFairRegistrations } from '@/lib/db/job-fair-queries';
import { parseJobFairFilters, requireJobFairAccess } from '@/lib/job-fair/access';
import { formatDisplayDateTimeIST, getTodayDateStringIST } from '@/lib/ist-date';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HEARD_FROM_OPTIONS,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  optionLabel,
} from '@/lib/job-fair/options';

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const HEADERS = [
  'Registration No',
  'Registered At (IST)',
  'Full Name',
  'Mobile',
  'WhatsApp',
  'Age',
  'Gender',
  'Area / Locality',
  'PIN Code',
  'Voter ID (EPIC)',
  'Highest Qualification',
  'Course / Degree / Trade',
  'Employment Status',
  'Work Experience',
  'Job Types',
  'Heard Via',
  'Resume',
  'Status',
];

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const rows = await listAllJobFairRegistrations(parseJobFairFilters(searchParams));

    const lines = [HEADERS.join(',')];
    for (const r of rows) {
      lines.push(
        [
          r.registrationNo,
          formatDisplayDateTimeIST(r.createdAt),
          r.fullName,
          r.mobile,
          r.whatsapp,
          r.age,
          optionLabel(GENDER_OPTIONS, r.gender),
          r.area === AREA_OTHER
            ? `Other: ${r.areaOther ?? ''}`
            : optionLabel(AREA_OPTIONS, r.area),
          r.pincode,
          r.epicNumber,
          optionLabel(QUALIFICATION_OPTIONS, r.qualification),
          r.course,
          optionLabel(EMPLOYMENT_STATUS_OPTIONS, r.employmentStatus),
          optionLabel(EXPERIENCE_OPTIONS, r.experience),
          r.jobTypes
            .map((t) =>
              t === JOB_TYPE_OTHER && r.jobTypeOther
                ? `Other: ${r.jobTypeOther}`
                : optionLabel(JOB_TYPE_OPTIONS, t),
            )
            .join('; '),
          optionLabel(HEARD_FROM_OPTIONS, r.heardFrom),
          r.resumeStoragePath ? 'Yes' : 'No',
          r.status,
        ]
          .map(csvCell)
          .join(','),
      );
    }

    return new NextResponse(`\uFEFF${lines.join('\r\n')}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="yuvaaz-2026-registrations-${getTodayDateStringIST()}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Error exporting job fair registrations:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

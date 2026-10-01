import { JOB_FAIR_EVENT } from './options';

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');
}

export function buildJobFairIcs(registrationNo?: string | null): string {
  const description = [
    `${JOB_FAIR_EVENT.taglineTop} ${JOB_FAIR_EVENT.taglineBottom}`,
    registrationNo ? `Registration No: ${registrationNo}` : '',
    'Please carry printed copies of your resume and a photo ID.',
    `An initiative by ${JOB_FAIR_EVENT.initiativeBy}, ${JOB_FAIR_EVENT.initiativeRole}`,
  ]
    .filter(Boolean)
    .join('\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//eOffice//YUVAAZ 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${JOB_FAIR_EVENT.code}-${registrationNo ?? 'guest'}@eoffice`,
    `DTSTAMP:${toIcsUtc(new Date().toISOString())}`,
    `DTSTART:${toIcsUtc(JOB_FAIR_EVENT.startsAt)}`,
    `DTEND:${toIcsUtc(JOB_FAIR_EVENT.endsAt)}`,
    `SUMMARY:${escapeIcs(`${JOB_FAIR_EVENT.title} – ${JOB_FAIR_EVENT.subtitle}`)}`,
    `LOCATION:${escapeIcs(JOB_FAIR_EVENT.venueFull)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT12H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(`${JOB_FAIR_EVENT.title} is tomorrow`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadJobFairIcs(registrationNo?: string | null): void {
  const blob = new Blob([buildJobFairIcs(registrationNo)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'yuvaaz-2026.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

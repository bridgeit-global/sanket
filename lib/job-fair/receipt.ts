import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

import {
  AREA_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  JOB_FAIR_EVENT,
  JOB_TYPE_OPTIONS,
  QUALIFICATION_OPTIONS,
  optionLabel,
} from '@/lib/job-fair/options';
import type { JobFairFormValues } from '@/lib/job-fair/schema';

export type JobFairReceiptInput = {
  registrationNo: string;
  values: JobFairFormValues;
  resumeFileName?: string | null;
};

const PRIMARY: [number, number, number] = [163, 31, 99];
const INK: [number, number, number] = [28, 20, 24];
const MUTED: [number, number, number] = [110, 90, 98];

function areaLabel(values: JobFairFormValues): string {
  if (values.area === 'other') return values.areaOther.trim() || 'Other';
  return optionLabel(AREA_OPTIONS, values.area);
}

function jobTypesLabel(values: JobFairFormValues): string {
  const labels = values.jobTypes.map((value) => {
    if (value === 'other' && values.jobTypeOther.trim()) {
      return `Other (${values.jobTypeOther.trim()})`;
    }
    return optionLabel(JOB_TYPE_OPTIONS, value);
  });
  return labels.filter(Boolean).join(', ');
}

async function loadLogo(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  const src = new URL('/images/ncp_election_symbol.png', window.location.origin).href;
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const context = canvas.getContext('2d');
        if (!context) {
          resolve(null);
          return;
        }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

export async function downloadJobFairReceipt(input: JobFairReceiptInput): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `${input.registrationNo} – YUVAAZ 2026 registration receipt`,
    subject: 'YUVAAZ 2026 job fair registration receipt',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;

  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageWidth, 46, 'F');

  const logo = await loadLogo();
  let titleX = margin;
  if (logo) {
    doc.addImage(logo, 'PNG', margin, 10, 24, 24);
    titleX = margin + 30;
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('YUVAAZ 2026', titleX, 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(JOB_FAIR_EVENT.subtitle, titleX, 26);
  doc.setFontSize(9);
  doc.text(
    `${JOB_FAIR_EVENT.taglineTop} ${JOB_FAIR_EVENT.taglineBottom}`,
    titleX,
    33,
  );

  doc.setTextColor(...INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Registration receipt', margin, 58);

  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, 64, pageWidth - margin * 2, 36, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text('REGISTRATION NO.', margin + 6, 73);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(...PRIMARY);
  doc.text(input.registrationNo, margin + 6, 86);

  try {
    const qr = await QRCode.toDataURL(input.registrationNo, {
      margin: 0,
      errorCorrectionLevel: 'M',
      width: 256,
    });
    const qrSize = 26;
    doc.addImage(qr, 'PNG', pageWidth - margin - 6 - qrSize, 69, qrSize, qrSize);
  } catch {
    // Receipt is still valid without the QR.
  }

  const rows: Array<[string, string]> = [
    ['Full name', input.values.fullName.trim()],
    ['Mobile', input.values.mobile.trim()],
    ['WhatsApp', input.values.whatsapp.trim()],
    ['Age', input.values.age.trim()],
    ['Gender', optionLabel(GENDER_OPTIONS, input.values.gender)],
    ['Area', areaLabel(input.values)],
    ['PIN code', input.values.pincode.trim()],
    ['Highest qualification', optionLabel(QUALIFICATION_OPTIONS, input.values.qualification)],
    ['Course / stream', input.values.course.trim() || '—'],
    ['Employment status', optionLabel(EMPLOYMENT_STATUS_OPTIONS, input.values.employmentStatus)],
    ['Work experience', optionLabel(EXPERIENCE_OPTIONS, input.values.experience)],
    ['Job preference', jobTypesLabel(input.values) || '—'],
    ['Resume', input.resumeFileName?.trim() || 'Bring printed copies to the venue'],
  ];
  if (input.values.epicNumber.trim()) {
    rows.splice(7, 0, ['Voter ID (EPIC)', input.values.epicNumber.trim()]);
  }

  let y = 112;
  const labelX = margin;
  const valueX = margin + 52;
  const valueWidth = pageWidth - margin - valueX;

  for (const [label, value] of rows) {
    const lines = doc.splitTextToSize(value, valueWidth) as string[];
    const rowHeight = Math.max(7, lines.length * 4.6 + 2.4);
    if (y + rowHeight > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(label, labelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INK);
    doc.text(lines, valueX, y);
    y += rowHeight;
  }

  y += 2;
  doc.setFillColor(253, 242, 248);
  const eventLines = doc.splitTextToSize(JOB_FAIR_EVENT.venueFull, pageWidth - margin * 2 - 12) as string[];
  const eventHeight = 28 + eventLines.length * 5;
  doc.roundedRect(margin, y, pageWidth - margin * 2, eventHeight, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...PRIMARY);
  doc.text('Event details', margin + 6, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`${JOB_FAIR_EVENT.dateLabel}  ·  ${JOB_FAIR_EVENT.timeLabel}`, margin + 6, y + 16);
  doc.text(eventLines, margin + 6, y + 23);

  y += eventHeight + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Please bring', margin, y);
  doc.setFont('helvetica', 'normal');
  const notes = [
    'This receipt (show the registration number at the desk).',
    '3–5 printed copies of your resume / CV.',
    'A photo ID (Aadhaar / Voter ID) and mark sheets or certificates.',
    'Reach early — entry from 10:00 AM.',
  ];
  y += 5;
  for (const note of notes) {
    doc.text(`•  ${note}`, margin, y);
    y += 5;
  }

  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    `An initiative by ${JOB_FAIR_EVENT.initiativeBy}, ${JOB_FAIR_EVENT.initiativeRole}`,
    margin,
    y,
  );

  doc.save(`${input.registrationNo}-receipt.pdf`);
}

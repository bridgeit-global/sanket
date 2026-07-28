import {
  getWardIssueLabel,
  resolveWardIssueType,
} from '@/lib/letters/ward-issue-presets';
import type { LetterLocale } from '@/lib/letters/templates';

/** Private Supabase Storage bucket for letter PDFs. */
export const LETTER_PDF_BUCKET = 'letters';

export const LETTER_PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Stable object path for a letter PDF (upserted on regenerate). */
export function letterPdfStoragePath(letterId: string): string {
  return `${letterId}/letter.pdf`;
}

function sanitizeFileNameSegment(value: string): string {
  return value
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Issue-type label from saved ward letter fields (empty for other types). */
export function wardIssueLabelFromLetterFields(
  letterType: string | null | undefined,
  fields: unknown,
  locale: LetterLocale | string | null | undefined = 'en',
): string {
  if (letterType !== 'ward') return '';
  const record =
    fields && typeof fields === 'object'
      ? (fields as Record<string, unknown>)
      : {};
  const issueType = resolveWardIssueType(record.issueType);
  const letterLocale: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  return getWardIssueLabel(issueType, letterLocale);
}

/**
 * Browser-safe download name for a letter PDF.
 * Strips path separators / Windows-illegal chars so titles like
 * `शुल्क…-General/152` don't become percent-encoded paths.
 * Ward letters include the issue type when provided (or not already in title).
 */
export function letterPdfDownloadFileName(
  title: string | null | undefined,
  referenceNo: string | null | undefined,
  issueLabel?: string | null,
): string {
  const titlePart = sanitizeFileNameSegment(title?.trim() || 'letter');
  const issuePart = sanitizeFileNameSegment(issueLabel?.trim() || '');
  const refPart = sanitizeFileNameSegment(referenceNo?.trim() || 'letter');
  const segments = [titlePart];
  if (issuePart && !titlePart.includes(issuePart)) {
    segments.push(issuePart);
  }
  segments.push(refPart);
  const sanitized = segments.filter(Boolean).join('-').trim();
  return `${sanitized || 'letter'}.pdf`;
}

/** RFC 6266 / 5987 Content-Disposition so Unicode names decode in Chrome. */
export function contentDispositionAttachment(fileName: string): string {
  const asciiFallback =
    fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') ||
    'letter.pdf';
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

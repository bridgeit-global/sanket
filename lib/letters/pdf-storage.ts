/** Private Supabase Storage bucket for letter PDFs. */
export const LETTER_PDF_BUCKET = 'letters';

export const LETTER_PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Stable object path for a letter PDF (upserted on regenerate). */
export function letterPdfStoragePath(letterId: string): string {
  return `${letterId}/letter.pdf`;
}

/**
 * Browser-safe download name for a letter PDF.
 * Strips path separators / Windows-illegal chars so titles like
 * `शुल्क…-General/152` don't become percent-encoded paths.
 */
export function letterPdfDownloadFileName(
  title: string | null | undefined,
  referenceNo: string | null | undefined,
): string {
  const base = `${title?.trim() || 'letter'}-${referenceNo?.trim() || 'letter'}`;
  const sanitized = base
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  return `${sanitized || 'letter'}.pdf`;
}

/** RFC 6266 / 5987 Content-Disposition so Unicode names decode in Chrome. */
export function contentDispositionAttachment(fileName: string): string {
  const asciiFallback =
    fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') ||
    'letter.pdf';
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

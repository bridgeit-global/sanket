/** Private Supabase Storage bucket for letter PDFs. */
export const LETTER_PDF_BUCKET = 'letters';

export const LETTER_PDF_MAX_BYTES = 10 * 1024 * 1024; // 10MB

/** Stable object path for a letter PDF (upserted on regenerate). */
export function letterPdfStoragePath(letterId: string): string {
  return `${letterId}/letter.pdf`;
}

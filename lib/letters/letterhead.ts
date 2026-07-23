import type { LetterPaperSize } from '@/lib/letters/paper-size';

/** Built-in letterhead images by paper size. */
export const DEFAULT_LETTERHEAD_URLS: Record<LetterPaperSize, string> = {
  a4: '/images/letterheads/sana-malik-a4.jpg',
  a5: '/images/letterheads/sana-malik-a5.jpg',
  b5: '/images/letterheads/sana-malik-b5.jpg',
};

/**
 * Top body inset (mm) below built-in letterhead artwork.
 * Tuned per size from letterhead JPG header height + clearance gap.
 * Must use mm (not %) — CSS percentage padding is relative to page width.
 */
export const LETTERHEAD_CONTENT_PADDING_MM: Record<LetterPaperSize, number> = {
  a4: 60,
  a5: 43,
  b5: 50,
};

const LETTERHEAD_STRIP_PATTERN =
  /<div[^>]*class="[^"]*letter-letterhead[^"]*"[^>]*>[\s\S]*?<\/div>/i;

export function resolveLetterheadUrl(
  paperSize: LetterPaperSize,
  customUrl?: string | null,
): string | null {
  const trimmed = customUrl?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_LETTERHEAD_URLS[paperSize];
}

export function stripLetterheadFromHtml(html: string): string {
  return html.replace(LETTERHEAD_STRIP_PATTERN, '').trim();
}

export function getLetterheadContentPaddingMm(paperSize: LetterPaperSize): number {
  return LETTERHEAD_CONTENT_PADDING_MM[paperSize];
}

export const LETTER_PAPER_ASPECT_RATIO: Record<LetterPaperSize, string> = {
  a4: '210 / 297',
  a5: '148 / 210',
  b5: '176 / 250',
};

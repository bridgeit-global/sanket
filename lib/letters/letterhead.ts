import {
  LETTER_PAPER_DIMENSIONS_MM,
  type LetterPaperSize,
} from '@/lib/letters/paper-size';

/** Built-in letterhead images by paper size. */
export const DEFAULT_LETTERHEAD_URLS: Record<LetterPaperSize, string> = {
  a4: '/images/letterheads/sana-malik-a4.jpg',
  a5: '/images/letterheads/sana-malik-a5.jpg',
  b5: '/images/letterheads/sana-malik-b5.jpg',
};

/** Fraction of page height reserved for the letterhead header area. */
export const LETTERHEAD_HEADER_HEIGHT_RATIO = 0.18;

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
  if (paperSize === 'a5') return 41;
  const { heightMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  return Math.round(heightMm * LETTERHEAD_HEADER_HEIGHT_RATIO);
}

export const LETTER_PAPER_ASPECT_RATIO: Record<LetterPaperSize, string> = {
  a4: '210 / 297',
  a5: '148 / 210',
  b5: '176 / 250',
};

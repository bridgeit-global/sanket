import type { LetterPaperSize } from '@/lib/letters/paper-size';

/** Built-in letterhead images by paper size. */
export const DEFAULT_LETTERHEAD_URLS: Record<LetterPaperSize, string> = {
  a4: '/images/letterheads/sana-malik-a4.jpg',
  a5: '/images/letterheads/sana-malik-a5.jpg',
  b5: '/images/letterheads/sana-malik-b5.jpg',
};

/** Top text inset below letterhead — same mm on A4, A5, and B5. */
export const LETTERHEAD_CONTENT_PADDING_MM = 41;

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

export function getLetterheadContentPaddingMm(
  _paperSize?: LetterPaperSize,
): number {
  return LETTERHEAD_CONTENT_PADDING_MM;
}

export const LETTER_PAPER_ASPECT_RATIO: Record<LetterPaperSize, string> = {
  a4: '210 / 297',
  a5: '148 / 210',
  b5: '176 / 250',
};

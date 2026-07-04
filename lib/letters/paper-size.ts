import type { LetterType } from '@/lib/letters/templates';

export type LetterPaperSize = 'a4' | 'a5' | 'b5';

export const LETTER_PAPER_SIZES: LetterPaperSize[] = ['a4', 'a5', 'b5'];

/** ISO portrait page sizes in mm. */
export const LETTER_PAPER_DIMENSIONS_MM: Record<
  LetterPaperSize,
  { widthMm: number; heightMm: number }
> = {
  a4: { widthMm: 210, heightMm: 297 },
  a5: { widthMm: 148, heightMm: 210 },
  b5: { widthMm: 176, heightMm: 250 },
};

export const LETTER_PAPER_MARGIN_MM: Record<LetterPaperSize, number> = {
  a4: 15,
  a5: 12,
  b5: 12,
};

/**
 * Default paper size by letter type:
 * - Ration Card → B5
 * - Small subjects (fees, income, domicile) → A5
 * - VIP / remaining → A4
 */
export function getDefaultLetterPaperSize(
  letterType: LetterType | string,
): LetterPaperSize {
  switch (letterType) {
    case 'ration':
      return 'b5';
    case 'fees':
    case 'income':
    case 'domicile':
      return 'a5';
    default:
      return 'a4';
  }
}

/** @deprecated Use getDefaultLetterPaperSize */
export const getLetterPaperSize = getDefaultLetterPaperSize;

export function isLetterPaperSize(value: unknown): value is LetterPaperSize {
  return value === 'a4' || value === 'a5' || value === 'b5';
}

export function normalizeLetterPaperSize(
  value: unknown,
  fallback: LetterPaperSize = 'a4',
): LetterPaperSize {
  return isLetterPaperSize(value) ? value : fallback;
}

export function resolveLetterPaperSize(
  paperSize: unknown,
  letterType: LetterType | string,
): LetterPaperSize {
  return normalizeLetterPaperSize(paperSize, getDefaultLetterPaperSize(letterType));
}

/** Printable content width (page width minus side margins) at 96dpi. */
export function getLetterPaperContentWidthPx(paperSize: LetterPaperSize): number {
  const { widthMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
  const contentWidthMm = widthMm - marginMm * 2;
  return Math.round((contentWidthMm * 96) / 25.4);
}

export function getLetterPaperLabel(paperSize: LetterPaperSize): string {
  return paperSize.toUpperCase();
}

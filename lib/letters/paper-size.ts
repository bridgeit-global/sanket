import { isWardLetterType, type LetterType } from '@/lib/letters/templates';

export type LetterPaperSize = 'a4' | 'a5' | 'b5';

export const LETTER_PAPER_SIZES: LetterPaperSize[] = ['a4', 'a5', 'b5'];

/** Ration card letters: A5 / B5 only (never A4). */
export const RATION_LETTER_PAPER_SIZES: LetterPaperSize[] = ['a5', 'b5'];

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
  a5: 15,
  b5: 12,
};

/** Bottom page inset (mm). 0 so letter content can use the full page height. */
export const LETTER_PAPER_BOTTOM_MARGIN_MM: Record<LetterPaperSize, number> = {
  a4: 0,
  a5: 0,
  b5: 0,
};

export function isRationLetterPaperType(letterType: LetterType | string): boolean {
  return (
    typeof letterType === 'string' &&
    (letterType === 'ration' || letterType.startsWith('ration-'))
  );
}

/**
 * Paper sizes the user may pick for a letter type.
 * Ration card letters are limited to A5 and B5.
 */
export function getAllowedLetterPaperSizes(
  letterType: LetterType | string,
): LetterPaperSize[] {
  if (isRationLetterPaperType(letterType)) return RATION_LETTER_PAPER_SIZES;
  return LETTER_PAPER_SIZES;
}

/**
 * Default paper size by letter type:
 * - Ration Card → B5
 * - Small subjects (fees, income, domicile, identity, qr-birth-certificate, medical-assistance) → A5
 * - VIP / remaining → A4
 */
export function getDefaultLetterPaperSize(
  letterType: LetterType | string,
): LetterPaperSize {
  if (isWardLetterType(letterType)) return 'a5';
  if (isRationLetterPaperType(letterType)) return 'b5';
  switch (letterType) {
    case 'general':
      return 'a4';
    case 'fees':
    case 'school-admission':
    case 'college-admission':
    case 'school-transfer':
    case 'income':
    case 'domicile':
    case 'identity':
    case 'qr-birth-certificate':
    case 'medical-assistance':
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
  const fallback = getDefaultLetterPaperSize(letterType);
  const normalized = normalizeLetterPaperSize(paperSize, fallback);
  const allowed = getAllowedLetterPaperSizes(letterType);
  return allowed.includes(normalized) ? normalized : fallback;
}

/** Full page width at 96dpi. */
export function getLetterPaperWidthPx(paperSize: LetterPaperSize): number {
  const { widthMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  return Math.round((widthMm * 96) / 25.4);
}

/** Full page height at 96dpi. */
export function getLetterPaperHeightPx(paperSize: LetterPaperSize): number {
  const { heightMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  return Math.round((heightMm * 96) / 25.4);
}

/** Printable content width (page width minus side margins) at 96dpi. */
export function getLetterPaperContentWidthPx(paperSize: LetterPaperSize): number {
  const { widthMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
  const contentWidthMm = widthMm - marginMm * 2;
  return Math.round((contentWidthMm * 96) / 25.4);
}

/**
 * CSS-px height of the text area on one PDF/preview page (below letterhead /
 * top inset, above bottom margin). Preview + PDF must share this so breaks match.
 */
export function getLetterPageContentHeightCssPx(
  paperSize: LetterPaperSize,
  hasLetterhead: boolean,
  headerPaddingMm: number,
): number {
  const { widthMm, heightMm } = LETTER_PAPER_DIMENSIONS_MM[paperSize];
  const marginMm = LETTER_PAPER_MARGIN_MM[paperSize];
  const bottomMarginMm = LETTER_PAPER_BOTTOM_MARGIN_MM[paperSize];
  const topInsetMm = hasLetterhead ? headerPaddingMm : marginMm;
  const contentHeightMm = Math.max(1, heightMm - topInsetMm - bottomMarginMm);
  const contentWidthMm = Math.max(1, widthMm - marginMm * 2);
  const contentWidthPx = getLetterPaperContentWidthPx(paperSize);
  return contentHeightMm * (contentWidthPx / contentWidthMm);
}

export function getLetterPaperLabel(paperSize: LetterPaperSize): string {
  return paperSize.toUpperCase();
}

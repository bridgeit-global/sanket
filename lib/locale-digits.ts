import type { LetterLocale } from '@/lib/letters/templates';

const DEVANAGARI_DIGITS = '०१२३४५६७८९';
const MAX_AMOUNT_DIGITS = 15;

/** Convert Devanagari digits to Western (0-9). Leaves other characters unchanged. */
export function toWesternDigits(value: string): string {
  return value.replace(/[०-९]/g, (ch) => {
    const index = DEVANAGARI_DIGITS.indexOf(ch);
    return index >= 0 ? String(index) : ch;
  });
}

/** Format digits for display in the active locale. */
export function toLocaleDigits(value: string | number, locale: LetterLocale): string {
  const text = String(value);
  if (locale !== 'mr') return text;
  return text.replace(/\d/g, (digit) => DEVANAGARI_DIGITS[Number(digit)] ?? digit);
}

/** Digits-only western form of an amount (strips grouping and Devanagari). */
export function normalizeAmountDigits(value: string): string {
  return toWesternDigits(value).replace(/\D/g, '').slice(0, MAX_AMOUNT_DIGITS);
}

/**
 * Format a numeric amount with Indian grouping (lakhs/crores).
 * Marathi locale uses Devanagari digits (e.g. १,५०,०००).
 */
export function formatIndianAmount(
  value: string | number,
  locale: LetterLocale = 'en',
): string {
  const digits = normalizeAmountDigits(String(value));
  if (!digits) return '';
  const formatted = Number(digits).toLocaleString('en-IN');
  return toLocaleDigits(formatted, locale);
}

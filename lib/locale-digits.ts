import type { LetterLocale } from '@/lib/letters/templates';

const DEVANAGARI_DIGITS = '०१२३४५६७८९';

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

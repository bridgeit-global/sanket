import type { LetterLocale } from '@/lib/letters/templates';

const DEVANAGARI_CHAR = /[\u0900-\u097F]/;
const LATIN_LETTER = /[A-Za-z]/;
/** Digits and punctuation commonly used in Indian addresses. */
const SHARED_CHAR = /[\d\s.,/\-#()&'":;+@]/;

/**
 * Keep only characters appropriate for the given locale script.
 * - English: Latin letters + shared digits/punctuation (no Devanagari)
 * - Marathi: Devanagari + shared digits/punctuation (no Latin letters)
 */
export function filterLocaleText(value: string, locale: LetterLocale): string {
  return [...value]
    .filter((ch) => {
      if (SHARED_CHAR.test(ch)) return true;
      if (locale === 'mr') return DEVANAGARI_CHAR.test(ch);
      return LATIN_LETTER.test(ch);
    })
    .join('');
}

import type { LetterLocale } from '@/lib/letters/templates';

/**
 * Previously restricted input to the locale's script. Now a no-op so users can
 * type in any language/script (e.g. Marathi in English fields and vice versa).
 */
export function filterLocaleText(value: string, _locale: LetterLocale): string {
  return value;
}

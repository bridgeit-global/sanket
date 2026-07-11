import enMessages from '@/messages/en.json';
import mrMessages from '@/messages/mr.json';

import type { LetterLocale } from '@/lib/letters/templates';

const LETTER_MESSAGE_CATALOG: Record<LetterLocale, Record<string, unknown>> = {
  en: enMessages,
  mr: mrMessages,
};

/** Resolve a translation key using the letter language (not the UI locale). */
export function letterMessage(locale: LetterLocale, key: string): string {
  const parts = key.split('.');
  let value: unknown = LETTER_MESSAGE_CATALOG[locale];

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }

  return typeof value === 'string' ? value : key;
}

import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

export type ParsedReference = {
  prefix: string;
  number: string;
};

/** Default letter/outward reference prefix by UI locale. */
export function defaultReferencePrefix(locale: LetterLocale | string): string {
  return locale === 'mr' ? 'सामान्य' : 'General';
}

/** Trim prefix and strip a trailing slash. */
export function normalizeReferencePrefix(prefix: string): string {
  return prefix.trim().replace(/\/+$/, '');
}

/** Format as `prefix/number` (or just the number when prefix is empty). */
export function formatReference(prefix: string, number: string | number): string {
  const normalizedPrefix = normalizeReferencePrefix(prefix);
  const normalizedNumber = toWesternDigits(String(number).trim());
  if (!normalizedPrefix) return normalizedNumber;
  if (!normalizedNumber) return normalizedPrefix;
  return `${normalizedPrefix}/${normalizedNumber}`;
}

/**
 * Split a stored ref into prefix + number.
 * Uses the last `/` before a trailing numeric segment when present.
 */
export function parseReference(full: string): ParsedReference {
  const trimmed = full.trim();
  if (!trimmed) return { prefix: '', number: '' };

  const western = toWesternDigits(trimmed);
  const lastSlash = western.lastIndexOf('/');
  if (lastSlash < 0) {
    if (/^\d+$/.test(western)) {
      return { prefix: '', number: western };
    }
    return { prefix: normalizeReferencePrefix(trimmed), number: '' };
  }

  const prefixPart = trimmed.slice(0, lastSlash);
  const numberPart = western.slice(lastSlash + 1).trim();
  if (/^\d+$/.test(numberPart)) {
    return {
      prefix: normalizeReferencePrefix(prefixPart),
      number: numberPart,
    };
  }

  return { prefix: normalizeReferencePrefix(trimmed), number: '' };
}

function prefixesMatch(a: string, b: string): boolean {
  return normalizeReferencePrefix(a).toLowerCase() === normalizeReferencePrefix(b).toLowerCase();
}

/** Numeric suffix when `full` belongs to `prefix`; otherwise null. */
export function extractSequenceNumber(full: string, prefix: string): number | null {
  const parsed = parseReference(full);
  if (!parsed.number) return null;
  if (!prefixesMatch(parsed.prefix, prefix)) return null;
  const value = Number.parseInt(parsed.number, 10);
  return Number.isFinite(value) ? value : null;
}

/** Next sequence number for a prefix given existing full refs (max + 1, or 1). */
export function nextSequenceNumber(refs: string[], prefix: string): number {
  let max = 0;
  for (const ref of refs) {
    const value = extractSequenceNumber(ref, prefix);
    if (value != null && value > max) max = value;
  }
  return max + 1;
}

/** Digits-only reference number for the active locale (Devanagari when `mr`). */
export function formatReferenceNumberForLocale(
  number: string | number,
  locale: LetterLocale | string,
): string {
  const western = toWesternDigits(String(number)).replace(/\D/g, '');
  return toLocaleDigits(western, locale === 'mr' ? 'mr' : 'en');
}

/** Display a stored full ref with locale-appropriate digits. */
export function formatReferenceForDisplay(
  full: string,
  locale: LetterLocale | string,
): string {
  const parsed = parseReference(full);
  if (!parsed.number) return full;
  const localizedNumber = formatReferenceNumberForLocale(parsed.number, locale);
  return parsed.prefix
    ? `${parsed.prefix}/${localizedNumber}`
    : localizedNumber;
}

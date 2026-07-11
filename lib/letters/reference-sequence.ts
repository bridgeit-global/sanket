import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';

export type ParsedReference = {
  prefix: string;
  number: string;
};

/** Seed / fallback document type codes (DB is source of truth). */
export const DOCUMENT_TYPES = ['VIP', 'Department', 'General'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number] | string;

const LEGACY_PREFIX_ALIASES: Record<string, string> = {
  general: 'General',
  सामान्य: 'General',
  vip: 'VIP',
  department: 'Department',
  विभाग: 'Department',
};

export function isDocumentType(value: string): boolean {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

/** Map a free-text / legacy prefix onto a known seed document type when possible. */
export function coerceDocumentType(prefix: string): string | null {
  const normalized = normalizeReferencePrefix(prefix);
  if (!normalized) return null;
  if (isDocumentType(normalized)) return normalized;
  return LEGACY_PREFIX_ALIASES[normalized.toLowerCase()] ?? null;
}

/** Default reference prefix (Document Type). Locale no longer changes the stored prefix. */
export function defaultReferencePrefix(_locale?: LetterLocale | string): string {
  return 'General';
}

const DOCUMENT_TYPE_LABELS: Record<LetterLocale, Record<string, string>> = {
  en: {
    VIP: 'VIP',
    Department: 'Department',
    General: 'General',
  },
  mr: {
    VIP: 'VIP',
    Department: 'विभाग',
    General: 'सामान्य',
  },
};

export type DocumentTypeLabelSource = {
  code: string;
  labelEn?: string;
  labelMr?: string;
};

/** Localized Document Type label for UI / letter body (stored value stays as code). */
export function documentTypeLabel(
  type: string,
  locale: LetterLocale | string = 'en',
  sources?: DocumentTypeLabelSource[],
): string {
  const lang: LetterLocale = locale === 'mr' ? 'mr' : 'en';
  const normalized = normalizeReferencePrefix(type);
  const fromMaster = sources?.find(
    (item) => item.code.toLowerCase() === normalized.toLowerCase(),
  );
  if (fromMaster) {
    const label = lang === 'mr' ? fromMaster.labelMr : fromMaster.labelEn;
    if (label?.trim()) return label.trim();
  }

  const coerced = coerceDocumentType(type) ?? (isDocumentType(type) ? type : null);
  if (coerced && DOCUMENT_TYPE_LABELS[lang][coerced]) {
    return DOCUMENT_TYPE_LABELS[lang][coerced];
  }
  return type;
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

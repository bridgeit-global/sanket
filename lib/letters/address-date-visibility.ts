import { toWesternDigits } from '@/lib/locale-digits';

export type AddressDateVisibilityParts = {
  startDate?: string | null;
  endDate?: string | null;
  isActive?: boolean;
};

/**
 * Parse letter display dates like `09/07/2026` (ASCII or locale digits) to `yyyy-MM-dd`.
 * Returns null when the value cannot be parsed.
 */
export function parseLetterDisplayDateToIso(displayValue: string): string | null {
  const normalized = toWesternDigits(String(displayValue ?? '').trim());
  const m = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const iso = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : iso;
}

function normalizeIsoDate(value: string | null | undefined): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return raw;
}

/**
 * Whether an address master entry should appear in letter pickers for a letter date.
 * - Inactive entries are never visible (callers may still filter type separately).
 * - No `endDate` → always visible.
 * - With `endDate` → letter date must fall in `[startDate, endDate]`
 *   (`startDate` null = open start). Unparseable letter dates fail open (visible).
 */
export function isAddressVisibleForLetterDate(
  address: AddressDateVisibilityParts,
  letterDateDisplay: string | null | undefined,
  options?: { requireActive?: boolean },
): boolean {
  const requireActive = options?.requireActive !== false;
  if (requireActive && address.isActive === false) return false;

  const endDate = normalizeIsoDate(address.endDate);
  if (!endDate) return true;

  const letterIso = parseLetterDisplayDateToIso(String(letterDateDisplay ?? ''));
  if (!letterIso) return true;

  const startDate = normalizeIsoDate(address.startDate);
  if (startDate && letterIso < startDate) return false;
  if (letterIso > endDate) return false;
  return true;
}

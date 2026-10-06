/** Indian voter ID: three letters, then seven digits (e.g. ABC1234567). */
export const EPIC_NUMBER_PATTERN = /^[A-Z]{3}[0-9]{7}$/;

export const EPIC_NUMBER_INVALID_MESSAGE =
  'Enter a valid EPIC number (e.g. ABC1234567)';

/** Canonical EPIC form for lookups (DB stores uppercase). */
export function normalizeEpicNumber(epicNumber: string): string {
  return epicNumber.trim().toUpperCase();
}

/** Keep only a partial or complete EPIC while the user types or pastes. */
export function sanitizeEpicInput(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let letters = '';
  let digits = '';
  for (const ch of upper) {
    if (digits.length === 0 && letters.length < 3 && /[A-Z]/.test(ch)) {
      letters += ch;
    } else if (letters.length === 3 && digits.length < 7 && /[0-9]/.test(ch)) {
      digits += ch;
    }
  }
  return letters + digits;
}

export function isCompleteEpicNumber(value: string): boolean {
  return EPIC_NUMBER_PATTERN.test(normalizeEpicNumber(value));
}

/**
 * Empty or whitespace becomes null. A non-empty value must be a complete EPIC.
 */
export function assertOptionalEpicNumber(
  value: string | null | undefined,
): string | null {
  if (value == null) return null;
  const normalized = normalizeEpicNumber(value);
  if (!normalized) return null;
  if (!EPIC_NUMBER_PATTERN.test(normalized)) {
    throw new Error(EPIC_NUMBER_INVALID_MESSAGE);
  }
  return normalized;
}

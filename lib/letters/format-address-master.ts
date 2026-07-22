import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import type { LetterLocale } from '@/lib/letters/templates';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';

export type AddressMasterAddressParts = {
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
  line3En: string;
  line3Mr: string;
  cityEn: string;
  cityMr: string;
  stateEn: string;
  stateMr: string;
  pincode: string;
};

export const EMPTY_ADDRESS_PARTS: AddressMasterAddressParts = {
  line1En: '',
  line1Mr: '',
  line2En: '',
  line2Mr: '',
  line3En: '',
  line3Mr: '',
  cityEn: '',
  cityMr: '',
  stateEn: '',
  stateMr: '',
  pincode: '',
};

function pickLocaleField(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  field: 'line1' | 'line2' | 'line3' | 'city' | 'state',
): string {
  if (locale === 'mr') {
    if (field === 'line1') return parts.line1Mr;
    if (field === 'line2') return parts.line2Mr;
    if (field === 'line3') return parts.line3Mr;
    if (field === 'city') return parts.cityMr;
    return parts.stateMr;
  }
  if (field === 'line1') return parts.line1En;
  if (field === 'line2') return parts.line2En;
  if (field === 'line3') return parts.line3En;
  if (field === 'city') return parts.cityEn;
  return parts.stateEn;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove trailing city/state that were accidentally baked into a street line. */
export function stripTrailingLocationFromLine(
  line: string,
  city: string,
  state: string,
): string {
  let result = line.trim();
  if (!result) return '';

  const cityTrim = city.trim();
  const stateTrim = state.trim();
  const candidates = [
    cityTrim && stateTrim ? `${cityTrim}, ${stateTrim}` : '',
    cityTrim && stateTrim ? `${stateTrim}, ${cityTrim}` : '',
    stateTrim,
    cityTrim,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const pattern = new RegExp(`(?:,\\s*)?${escapeRegExp(candidate)}\\s*$`, 'iu');
    const next = result.replace(pattern, '').trim().replace(/,\s*$/, '').trim();
    if (next !== result) {
      result = next;
      break;
    }
  }

  return result;
}

function localizeAddressText(value: string, locale: LetterLocale): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return locale === 'mr' ? toLocaleDigits(trimmed, 'mr') : trimmed;
}

export function formatAddressMaster(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): string {
  const city = pickLocaleField(parts, locale, 'city').trim();
  const state = pickLocaleField(parts, locale, 'state').trim();
  const segments = [
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line1'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line2'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line3'), city, state),
    city,
    state,
  ]
    .map((value) => localizeAddressText(value, locale))
    .filter(Boolean);

  const base = segments.join(', ');
  const pincode = toLocaleDigits(parts.pincode.trim(), locale);

  if (!base && !pincode) return '';
  if (!pincode) return base;
  if (!base) return pincode;
  return `${base} - ${pincode}`;
}

/**
 * Format an address with each street line on its own line and the
 * city/state/pincode grouped on a final line. Intended for recipient address
 * blocks in letter templates, so the separator defaults to an HTML `<br>`.
 */
export function formatAddressMasterMultiline(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  separator = '<br>',
): string {
  const city = pickLocaleField(parts, locale, 'city').trim();
  const state = pickLocaleField(parts, locale, 'state').trim();

  const streetLines = [
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line1'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line2'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line3'), city, state),
  ]
    .map((value) => localizeAddressText(value, locale))
    .filter(Boolean);

  const locationSegments = [
    localizeAddressText(city, locale),
    localizeAddressText(state, locale),
  ].filter(Boolean);
  let locationLine = locationSegments.join(', ');
  const pincode = toLocaleDigits(parts.pincode.trim(), locale);
  if (pincode) {
    locationLine = locationLine ? `${locationLine} - ${pincode}` : pincode;
  }

  return [...streetLines, locationLine].filter(Boolean).join(separator);
}

export function hasAddressContent(parts: AddressMasterAddressParts): boolean {
  return Boolean(
    formatAddressMaster(parts, 'en').trim() || formatAddressMaster(parts, 'mr').trim(),
  );
}

/** Line 1, city, state, and a 6-digit pincode are required; line 2 is optional. */
export function hasRequiredAddressFields(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): boolean {
  const line1 = pickLocaleField(parts, locale, 'line1').trim();
  const city = pickLocaleField(parts, locale, 'city').trim();
  const state = pickLocaleField(parts, locale, 'state').trim();
  const pincode = toWesternDigits(parts.pincode).replace(/\D/g, '');
  return Boolean(line1 && city && state && pincode.length === 6);
}

function assignLocaleFields(
  result: Partial<AddressMasterAddressParts>,
  locale: LetterLocale,
  values: {
    line1?: string;
    line2?: string;
    line3?: string;
    city?: string;
    state?: string;
  },
): void {
  const localize = (value: string) => localizeAddressText(value, locale);
  if (locale === 'mr') {
    if (values.line1 !== undefined) result.line1Mr = localize(values.line1);
    if (values.line2 !== undefined) result.line2Mr = localize(values.line2);
    if (values.line3 !== undefined) result.line3Mr = localize(values.line3);
    if (values.city !== undefined) result.cityMr = localize(values.city);
    if (values.state !== undefined) result.stateMr = localize(values.state);
  } else {
    if (values.line1 !== undefined) result.line1En = localize(values.line1);
    if (values.line2 !== undefined) result.line2En = localize(values.line2);
    if (values.line3 !== undefined) result.line3En = localize(values.line3);
    if (values.city !== undefined) result.cityEn = localize(values.city);
    if (values.state !== undefined) result.stateEn = localize(values.state);
  }
}

/** Best-effort parse of a free-text address into structured parts for one locale. */
export function parseFreeTextAddressForLocale(
  text: string,
  locale: LetterLocale,
): Partial<AddressMasterAddressParts> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const barePincode = toWesternDigits(trimmed).replace(/\D/g, '');
  if (barePincode.length === 6 && toWesternDigits(trimmed).replace(/[\s]/g, '') === barePincode) {
    return { pincode: barePincode };
  }

  const pincodeMatch = trimmed.match(/\s*-\s*([\d०-९][\d०-९\s]{4,8}[\d०-९])\s*$/);
  const pincode = pincodeMatch
    ? toWesternDigits(pincodeMatch[1].replace(/\s/g, ''))
    : '';
  const withoutPincode = pincodeMatch
    ? trimmed.slice(0, pincodeMatch.index).trim()
    : trimmed;

  const lines = withoutPincode.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parts = withoutPincode.split(',').map((part) => part.trim()).filter(Boolean);

  const result: Partial<AddressMasterAddressParts> = {};
  if (pincode) result.pincode = pincode;

  // Multi-line addresses keep explicit line breaks as structure.
  if (lines.length >= 4) {
    assignLocaleFields(result, locale, {
      line1: lines[0],
      line2: lines[1],
      line3: lines.slice(2, lines.length - 2).join(', '),
      city: lines[lines.length - 2],
      state: lines[lines.length - 1],
    });
    return result;
  }

  if (lines.length === 3) {
    assignLocaleFields(result, locale, {
      line1: lines[0],
      line2: lines[1],
      city: lines[2],
    });
    return result;
  }

  if (lines.length === 2) {
    assignLocaleFields(result, locale, {
      line1: lines[0],
      line2: lines[1],
    });
    return result;
  }

  // Single-line / comma-separated: "line1[, line2[, line3...]], city, state"
  if (parts.length >= 3) {
    const lineParts = parts.slice(0, -2);
    assignLocaleFields(result, locale, {
      line1: lineParts[0] ?? '',
      line2: lineParts[1] ?? '',
      line3: lineParts.length > 2 ? lineParts.slice(2).join(', ') : '',
      city: parts[parts.length - 2],
      state: parts[parts.length - 1],
    });
    return result;
  }

  if (parts.length === 2) {
    assignLocaleFields(result, locale, {
      line1: parts[0],
      line2: parts[1],
    });
    return result;
  }

  assignLocaleFields(result, locale, { line1: withoutPincode });
  return result;
}

/** Apply locale digit script to street/city/state fields for the given locale. */
export function localizeAddressPartsDigits(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): AddressMasterAddressParts {
  if (locale !== 'mr') return { ...parts, pincode: toWesternDigits(parts.pincode).replace(/\D/g, '') || parts.pincode };
  return {
    line1En: parts.line1En,
    line2En: parts.line2En,
    line3En: parts.line3En,
    cityEn: parts.cityEn,
    stateEn: parts.stateEn,
    line1Mr: toLocaleDigits(parts.line1Mr, 'mr'),
    line2Mr: toLocaleDigits(parts.line2Mr, 'mr'),
    line3Mr: toLocaleDigits(parts.line3Mr, 'mr'),
    cityMr: toLocaleDigits(parts.cityMr, 'mr'),
    stateMr: toLocaleDigits(parts.stateMr, 'mr'),
    pincode: toWesternDigits(parts.pincode).replace(/\D/g, '') || parts.pincode,
  };
}

/** Drop city/state accidentally stored inside street lines for both locales. */
export function sanitizeAddressPartsLocations(
  parts: AddressMasterAddressParts,
): AddressMasterAddressParts {
  return {
    ...parts,
    line1En: stripTrailingLocationFromLine(parts.line1En, parts.cityEn, parts.stateEn),
    line2En: stripTrailingLocationFromLine(parts.line2En, parts.cityEn, parts.stateEn),
    line3En: stripTrailingLocationFromLine(parts.line3En, parts.cityEn, parts.stateEn),
    line1Mr: stripTrailingLocationFromLine(parts.line1Mr, parts.cityMr, parts.stateMr),
    line2Mr: stripTrailingLocationFromLine(parts.line2Mr, parts.cityMr, parts.stateMr),
    line3Mr: stripTrailingLocationFromLine(parts.line3Mr, parts.cityMr, parts.stateMr),
  };
}

export function mergeAddressParts(
  ...partials: Array<Partial<AddressMasterAddressParts>>
): AddressMasterAddressParts {
  return partials.reduce<AddressMasterAddressParts>(
    (acc, partial) => ({
      line1En: partial.line1En?.trim() || acc.line1En,
      line1Mr: partial.line1Mr?.trim() || acc.line1Mr,
      line2En: partial.line2En?.trim() || acc.line2En,
      line2Mr: partial.line2Mr?.trim() || acc.line2Mr,
      line3En: partial.line3En?.trim() || acc.line3En,
      line3Mr: partial.line3Mr?.trim() || acc.line3Mr,
      cityEn: partial.cityEn?.trim() || acc.cityEn,
      cityMr: partial.cityMr?.trim() || acc.cityMr,
      stateEn: partial.stateEn?.trim() || acc.stateEn,
      stateMr: partial.stateMr?.trim() || acc.stateMr,
      pincode: partial.pincode?.trim() || acc.pincode,
    }),
    { ...EMPTY_ADDRESS_PARTS },
  );
}

export function enrichAddressPartsWithPincodeLookup(
  parts: AddressMasterAddressParts,
  lookup: PincodeLookupResult,
): AddressMasterAddressParts {
  return {
    ...parts,
    cityEn: parts.cityEn.trim() || lookup.city,
    stateEn: parts.stateEn.trim() || lookup.state,
  };
}

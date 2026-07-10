import type { LetterLocale } from '@/lib/letters/templates';
import type { PincodeLookupResult } from '@/lib/letters/pincode-lookup';

export type AddressMasterAddressParts = {
  line1En: string;
  line1Mr: string;
  line2En: string;
  line2Mr: string;
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
  cityEn: '',
  cityMr: '',
  stateEn: '',
  stateMr: '',
  pincode: '',
};

function pickLocaleField(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  field: 'line1' | 'line2' | 'city' | 'state',
): string {
  if (locale === 'mr') {
    if (field === 'line1') return parts.line1Mr;
    if (field === 'line2') return parts.line2Mr;
    if (field === 'city') return parts.cityMr;
    return parts.stateMr;
  }
  if (field === 'line1') return parts.line1En;
  if (field === 'line2') return parts.line2En;
  if (field === 'city') return parts.cityEn;
  return parts.stateEn;
}

export function formatAddressMaster(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): string {
  const segments = [
    pickLocaleField(parts, locale, 'line1'),
    pickLocaleField(parts, locale, 'line2'),
    pickLocaleField(parts, locale, 'city'),
    pickLocaleField(parts, locale, 'state'),
  ]
    .map((value) => value.trim())
    .filter(Boolean);

  const base = segments.join(', ');
  const pincode = parts.pincode.trim();

  if (!base && !pincode) return '';
  if (!pincode) return base;
  if (!base) return pincode;
  return `${base} - ${pincode}`;
}

export function hasAddressContent(parts: AddressMasterAddressParts): boolean {
  return Boolean(
    formatAddressMaster(parts, 'en').trim() || formatAddressMaster(parts, 'mr').trim(),
  );
}

function assignLocaleFields(
  result: Partial<AddressMasterAddressParts>,
  locale: LetterLocale,
  values: { line1?: string; line2?: string; city?: string; state?: string },
): void {
  if (locale === 'mr') {
    if (values.line1 !== undefined) result.line1Mr = values.line1;
    if (values.line2 !== undefined) result.line2Mr = values.line2;
    if (values.city !== undefined) result.cityMr = values.city;
    if (values.state !== undefined) result.stateMr = values.state;
  } else {
    if (values.line1 !== undefined) result.line1En = values.line1;
    if (values.line2 !== undefined) result.line2En = values.line2;
    if (values.city !== undefined) result.cityEn = values.city;
    if (values.state !== undefined) result.stateEn = values.state;
  }
}

/** Best-effort parse of a free-text address into structured parts for one locale. */
export function parseFreeTextAddressForLocale(
  text: string,
  locale: LetterLocale,
): Partial<AddressMasterAddressParts> {
  const trimmed = text.trim();
  if (!trimmed) return {};

  const pincodeMatch = trimmed.match(/\s*-\s*(\d[\d\s]{4,8}\d)\s*$/);
  const pincode = pincodeMatch ? pincodeMatch[1].replace(/\s/g, '') : '';
  const withoutPincode = pincodeMatch
    ? trimmed.slice(0, pincodeMatch.index).trim()
    : trimmed;

  const lines = withoutPincode.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const parts = withoutPincode.split(',').map((part) => part.trim()).filter(Boolean);

  const result: Partial<AddressMasterAddressParts> = { pincode };

  if (lines.length >= 4) {
    assignLocaleFields(result, locale, {
      line1: lines[0],
      line2: lines[1],
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

  if (lines.length === 1) {
    assignLocaleFields(result, locale, { line1: lines[0] });
    return result;
  }

  if (parts.length >= 4) {
    assignLocaleFields(result, locale, {
      line1: parts[0],
      line2: parts[1],
      city: parts[parts.length - 2],
      state: parts[parts.length - 1],
    });
    return result;
  }

  if (parts.length === 3) {
    assignLocaleFields(result, locale, {
      line1: parts[0],
      line2: parts[1],
      city: parts[2],
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

export function mergeAddressParts(
  ...partials: Array<Partial<AddressMasterAddressParts>>
): AddressMasterAddressParts {
  return partials.reduce<AddressMasterAddressParts>(
    (acc, partial) => ({
      line1En: partial.line1En?.trim() || acc.line1En,
      line1Mr: partial.line1Mr?.trim() || acc.line1Mr,
      line2En: partial.line2En?.trim() || acc.line2En,
      line2Mr: partial.line2Mr?.trim() || acc.line2Mr,
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

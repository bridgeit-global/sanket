import type { LetterLocale } from '@/lib/letters/templates';

export type AddressMasterAddressParts = {
  houseNumberEn: string;
  houseNumberMr: string;
  localityStreetEn: string;
  localityStreetMr: string;
  townVillageEn: string;
  townVillageMr: string;
  pincode: string;
};

export const EMPTY_ADDRESS_PARTS: AddressMasterAddressParts = {
  houseNumberEn: '',
  houseNumberMr: '',
  localityStreetEn: '',
  localityStreetMr: '',
  townVillageEn: '',
  townVillageMr: '',
  pincode: '',
};

function pickLocaleField(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  field: 'houseNumber' | 'localityStreet' | 'townVillage',
): string {
  if (locale === 'mr') {
    if (field === 'houseNumber') return parts.houseNumberMr;
    if (field === 'localityStreet') return parts.localityStreetMr;
    return parts.townVillageMr;
  }
  if (field === 'houseNumber') return parts.houseNumberEn;
  if (field === 'localityStreet') return parts.localityStreetEn;
  return parts.townVillageEn;
}

export function formatAddressMaster(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): string {
  const segments = [
    pickLocaleField(parts, locale, 'houseNumber'),
    pickLocaleField(parts, locale, 'localityStreet'),
    pickLocaleField(parts, locale, 'townVillage'),
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

  if (lines.length >= 2) {
    const house = lines[0];
    const locality = lines.slice(1, -1).join(', ');
    const town = lines[lines.length - 1];
    if (locale === 'mr') {
      result.houseNumberMr = house;
      result.localityStreetMr = locality || '';
      result.townVillageMr = town;
    } else {
      result.houseNumberEn = house;
      result.localityStreetEn = locality || '';
      result.townVillageEn = town;
    }
    return result;
  }

  if (parts.length >= 3) {
    const house = parts[0];
    const locality = parts.slice(1, -1).join(', ');
    const town = parts[parts.length - 1];
    if (locale === 'mr') {
      result.houseNumberMr = house;
      result.localityStreetMr = locality;
      result.townVillageMr = town;
    } else {
      result.houseNumberEn = house;
      result.localityStreetEn = locality;
      result.townVillageEn = town;
    }
    return result;
  }

  if (parts.length === 2) {
    if (locale === 'mr') {
      result.localityStreetMr = parts[0];
      result.townVillageMr = parts[1];
    } else {
      result.localityStreetEn = parts[0];
      result.townVillageEn = parts[1];
    }
    return result;
  }

  if (locale === 'mr') {
    result.localityStreetMr = withoutPincode;
  } else {
    result.localityStreetEn = withoutPincode;
  }
  return result;
}

export function mergeAddressParts(
  ...partials: Array<Partial<AddressMasterAddressParts>>
): AddressMasterAddressParts {
  return partials.reduce<AddressMasterAddressParts>(
    (acc, partial) => ({
      houseNumberEn: partial.houseNumberEn?.trim() || acc.houseNumberEn,
      houseNumberMr: partial.houseNumberMr?.trim() || acc.houseNumberMr,
      localityStreetEn: partial.localityStreetEn?.trim() || acc.localityStreetEn,
      localityStreetMr: partial.localityStreetMr?.trim() || acc.localityStreetMr,
      townVillageEn: partial.townVillageEn?.trim() || acc.townVillageEn,
      townVillageMr: partial.townVillageMr?.trim() || acc.townVillageMr,
      pincode: partial.pincode?.trim() || acc.pincode,
    }),
    { ...EMPTY_ADDRESS_PARTS },
  );
}

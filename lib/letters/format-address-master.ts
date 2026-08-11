import { toLocaleDigits, toWesternDigits } from '@/lib/locale-digits';
import { isMinisterAddressType } from '@/lib/letters/address-types';
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

/**
 * Letter/print display for Indian PIN codes: full 6 digits
 * (e.g. 400043 → 400043, ४०००४३ → ४०००४३).
 */
export function formatPincodeForLetter(
  pincode: string,
  locale: LetterLocale,
): string {
  const cleaned = toWesternDigits(pincode).replace(/\D/g, '');
  if (!cleaned) return '';
  return toLocaleDigits(cleaned, locale);
}

/**
 * Normalize PIN suffixes in letter HTML/field values to locale digits
 * while keeping the full 6-digit pincode (e.g. 400043).
 */
export function truncateAddressPincodesForLetter(
  text: string,
  locale: LetterLocale,
): string {
  if (!text) return text;

  const trimmed = text.trim();
  const bareWestern = toWesternDigits(trimmed).replace(/\D/g, '');
  if (
    bareWestern.length === 6 &&
    toWesternDigits(trimmed).replace(/[\s]/g, '') === bareWestern
  ) {
    return toLocaleDigits(bareWestern, locale);
  }

  return text.replace(
    /(\s*-\s*)([\d०-९](?:[\s]*[\d०-९]){5})(?![\d०-९])/g,
    (match, sep: string, pinGroup: string) => {
      const western = toWesternDigits(pinGroup).replace(/\D/g, '');
      if (western.length !== 6) return match;
      return `${sep}${toLocaleDigits(western, locale)}`;
    },
  );
}

export function formatAddressMaster(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  options?: { pincodeDisplay?: 'full' | 'last2' },
): string {
  const city = pickLocaleField(parts, locale, 'city').trim();
  const state = pickLocaleField(parts, locale, 'state').trim();
  // State is kept in structured data but omitted from letter/display text —
  // local constituency letters do not need "Maharashtra" on every address.
  const segments = [
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line1'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line2'), city, state),
    stripTrailingLocationFromLine(pickLocaleField(parts, locale, 'line3'), city, state),
    city,
  ]
    .map((value) => localizeAddressText(value, locale))
    .filter(Boolean);

  const base = segments.join(', ');
  const rawPin = parts.pincode.trim();
  const cleanedPin = toWesternDigits(rawPin).replace(/\D/g, '');
  const pincode =
    options?.pincodeDisplay === 'last2'
      ? cleanedPin
        ? toLocaleDigits(cleanedPin.slice(-2), locale)
        : ''
      : formatPincodeForLetter(rawPin, locale);

  if (!base && !pincode) return '';
  if (!pincode) return base;
  if (!base) return pincode;
  // Letter/display format: "line1, line2, line3, city - 400043"
  return `${base} - ${pincode}`;
}

export type AddressMasterRecipientParts = AddressMasterAddressParts & {
  holderNameEn?: string;
  holderNameMr?: string;
  /** @deprecated Prefer holderNameEn */
  name?: string;
  /** @deprecated Prefer holderNameMr */
  nameMr?: string;
  addressType?: string;
  typeLabelEn?: string;
  typeLabelMr?: string;
  positionTitleEn?: string;
  positionTitleMr?: string;
};

function pickHolderName(
  parts: AddressMasterRecipientParts,
  locale: LetterLocale,
): string {
  if (locale === 'mr') {
    return (parts.holderNameMr || parts.nameMr || parts.holderNameEn || parts.name || '').trim();
  }
  return (parts.holderNameEn || parts.name || parts.holderNameMr || parts.nameMr || '').trim();
}

function pickTypeLabel(
  parts: AddressMasterRecipientParts,
  locale: LetterLocale,
): string {
  if (locale === 'mr') {
    return (parts.typeLabelMr || parts.typeLabelEn || '').trim();
  }
  return (parts.typeLabelEn || parts.typeLabelMr || '').trim();
}

function pickPositionTitle(
  parts: AddressMasterRecipientParts,
  locale: LetterLocale,
): string {
  if (locale === 'mr') {
    return (parts.positionTitleMr || parts.positionTitleEn || '').trim();
  }
  return (parts.positionTitleEn || parts.positionTitleMr || '').trim();
}

/**
 * Full recipient line for letter To blocks.
 * Minister types: holder, type label, position, address.
 * Other types: holder + address (legacy school/office/ration behaviour).
 */
export function formatAddressMasterRecipient(
  parts: AddressMasterRecipientParts,
  locale: LetterLocale,
  options?: {
    multiline?: boolean;
    pincodeDisplay?: 'full' | 'last2';
  },
): string {
  const holder = pickHolderName(parts, locale);
  const addressText = options?.multiline
    ? formatAddressMasterMultiline(parts, locale, undefined, {
        pincodeDisplay: options?.pincodeDisplay,
      })
    : formatAddressMaster(parts, locale, {
        pincodeDisplay: options?.pincodeDisplay,
      });

  if (isMinisterAddressType(parts.addressType)) {
    const typeLabel = pickTypeLabel(parts, locale);
    const position = pickPositionTitle(parts, locale);
    const head = [holder, typeLabel, position].filter(Boolean).join(', ');
    if (!head) return addressText;
    if (!addressText) return head;
    return options?.multiline ? `${head},<br>${addressText}` : `${head}, ${addressText}`;
  }

  if (!holder) return addressText;
  if (!addressText) return holder;
  return options?.multiline ? `${holder},<br>${addressText}` : `${holder}, ${addressText}`;
}

function escapeAddressHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Soft-wrap comma-separated address segments within each hard line.
 * Each segment keeps its trailing comma (`पहिला मजला,`) so wraps happen
 * between parts. Explicit newlines / `<br>` from multiline formatting stay
 * hard breaks. Idempotent over prior soft-wrap span / `<wbr>` markup.
 */
export function formatAddressSoftWrapHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Keep intentional HTML (e.g. bold ration/school name on its own line).
      if (/<span\b[^>]*class=["']var["']/i.test(line)) {
        return line.replace(/<wbr\s*\/?>/gi, '');
      }

      const cleaned = line
        .replace(
          /<span\b[^>]*style=["'][^"']*display:\s*inline-block[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi,
          '$1',
        )
        .replace(/<wbr\s*\/?>/gi, '')
        .replace(/&nbsp;/gi, ' ')
        .trim();
      if (!cleaned) return '';

      // Preserve a trailing comma on hard lines like `line1,` after split.
      const hadTrailingComma = /[,，،]\s*$/.test(cleaned);
      const parts = cleaned
        .split(/[,，،]/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length <= 1) return escapeAddressHtmlText(cleaned);

      return parts
        .map((part, index) => {
          const isLast = index === parts.length - 1;
          const label = !isLast || hadTrailingComma ? `${part},` : part;
          // inline-block wraps as a unit so the comma stays with the segment;
          // max-width lets an oversized single segment still break inside.
          return `<span style="display:inline-block;max-width:100%;vertical-align:top">${escapeAddressHtmlText(label)}</span>`;
        })
        .join(' ');
    })
    .filter(Boolean)
    .join('<br>');
}

/**
 * Format an address for letter recipient ("To") blocks with hard line breaks:
 *
 *   line1,
 *   line2, city - 400043
 *
 * When line3 is present:
 *
 *   line1,
 *   line2,
 *   line3, city - 400043
 *
 * Long line1/line2 segments soft-wrap at commas (comma stays with the part)
 * via `formatAddressSoftWrapHtml` at render. Inline body placeholders still
 * use `formatAddressMaster` (single line).
 *
 * @param separator Legacy join override. Omit (or pass `', '` / `',<br>'`) for
 *   the standard layout above. Other values still rewrite comma joins.
 */
export function formatAddressMasterMultiline(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
  separator?: string,
  options?: { pincodeDisplay?: 'full' | 'last2' },
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

  const localizedCity = localizeAddressText(city, locale);
  const rawPin = parts.pincode.trim();
  const cleanedPin = toWesternDigits(rawPin).replace(/\D/g, '');
  const pincode =
    options?.pincodeDisplay === 'last2'
      ? cleanedPin
        ? toLocaleDigits(cleanedPin.slice(-2), locale)
        : ''
      : formatPincodeForLetter(rawPin, locale);

  let locationTail = '';
  if (localizedCity && pincode) {
    locationTail = `${localizedCity} - ${pincode}`;
  } else {
    locationTail = localizedCity || pincode;
  }

  if (streetLines.length === 0) return locationTail;

  // Legacy override for callers that still need a custom join.
  if (separator && separator !== ', ' && separator !== ',<br>') {
    const singleLine = formatAddressMaster(parts, locale, options);
    return singleLine ? singleLine.replace(/[,，،]\s*/g, separator) : '';
  }

  const leading = streetLines.slice(0, -1).map((line) => `${line},`);
  const lastStreet = streetLines[streetLines.length - 1]!;
  const lastLine = locationTail ? `${lastStreet}, ${locationTail}` : lastStreet;

  return [...leading, lastLine].join('<br>');
}

export function hasAddressContent(parts: AddressMasterAddressParts): boolean {
  return Boolean(
    formatAddressMaster(parts, 'en').trim() || formatAddressMaster(parts, 'mr').trim(),
  );
}

/** Line 1, city, and a 6-digit pincode are required; line 2/3 and state are optional. */
export function hasRequiredAddressFields(
  parts: AddressMasterAddressParts,
  locale: LetterLocale,
): boolean {
  const line1 = pickLocaleField(parts, locale, 'line1').trim();
  const city = pickLocaleField(parts, locale, 'city').trim();
  const pincode = toWesternDigits(parts.pincode).replace(/\D/g, '');
  return Boolean(line1 && city && pincode.length === 6);
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

  const pincodeMatch = trimmed.match(
    /(?:\s*-\s*|\s+)([\d०-९][\d०-९\s]{4,8}[\d०-९])\s*$/,
  );
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

/**
 * Drop city/state accidentally stored inside street lines for both locales.
 * Never wipe a line entirely — if the whole line was just city/state, keep it so
 * required Line 1 content is not destroyed before save validation.
 */
export function sanitizeAddressPartsLocations(
  parts: AddressMasterAddressParts,
): AddressMasterAddressParts {
  const stripPreservingContent = (line: string, city: string, state: string) => {
    const original = line.trim();
    if (!original) return '';
    return stripTrailingLocationFromLine(original, city, state) || original;
  };

  return {
    ...parts,
    line1En: stripPreservingContent(parts.line1En, parts.cityEn, parts.stateEn),
    line2En: stripPreservingContent(parts.line2En, parts.cityEn, parts.stateEn),
    line3En: stripPreservingContent(parts.line3En, parts.cityEn, parts.stateEn),
    line1Mr: stripPreservingContent(parts.line1Mr, parts.cityMr, parts.stateMr),
    line2Mr: stripPreservingContent(parts.line2Mr, parts.cityMr, parts.stateMr),
    line3Mr: stripPreservingContent(parts.line3Mr, parts.cityMr, parts.stateMr),
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

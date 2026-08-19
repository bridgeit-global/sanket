import { ADDRESS_TYPES, type AddressType, isAddressType } from '@/lib/letters/address-types';
import { resolveLetterFormBase } from '@/lib/letters/letter-type-options';
import {
  LETTER_TYPES,
  WARD_LETTER_TYPES,
  type LetterType,
  isLetterType,
} from '@/lib/letters/templates';

/** Address picker slots used in letter generation forms. */
export const LETTER_ADDRESS_FIELDS = [
  'school',
  'applicant',
  'rationOffice',
  'office',
  'to',
  'fromRationOffice',
  'toRationOffice',
] as const;

export type LetterAddressField = (typeof LETTER_ADDRESS_FIELDS)[number];

export function isLetterAddressField(value: unknown): value is LetterAddressField {
  return (
    typeof value === 'string' &&
    (LETTER_ADDRESS_FIELDS as readonly string[]).includes(value)
  );
}

export type LetterAddressTypeLinkSeed = {
  letterType: LetterType;
  addressField: LetterAddressField;
  addressType: AddressType;
  sortOrder: number;
};

/** Defaults matching historical hardcoded letter → addressType mapping. */
export function getDefaultLetterAddressTypeLinks(): LetterAddressTypeLinkSeed[] {
  return [
    { letterType: 'fees', addressField: 'school', addressType: 'school', sortOrder: 1 },
    {
      letterType: 'school-admission',
      addressField: 'school',
      addressType: 'school',
      sortOrder: 1,
    },
    {
      letterType: 'school-admission',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'college-admission',
      addressField: 'school',
      addressType: 'school',
      sortOrder: 1,
    },
    {
      letterType: 'college-admission',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'school-transfer',
      addressField: 'school',
      addressType: 'school',
      sortOrder: 1,
    },
    {
      letterType: 'school-transfer',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'ration-new',
      addressField: 'rationOffice',
      addressType: 'ration_office',
      sortOrder: 1,
    },
    {
      letterType: 'ration-new',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'ration-add-members',
      addressField: 'rationOffice',
      addressType: 'ration_office',
      sortOrder: 1,
    },
    {
      letterType: 'ration-add-members',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'ration-delete-members',
      addressField: 'rationOffice',
      addressType: 'ration_office',
      sortOrder: 1,
    },
    {
      letterType: 'ration-delete-members',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'ration-transfer',
      addressField: 'rationOffice',
      addressType: 'ration_office',
      sortOrder: 1,
    },
    {
      letterType: 'ration-transfer',
      addressField: 'fromRationOffice',
      addressType: 'ration_office',
      sortOrder: 2,
    },
    {
      letterType: 'ration-transfer',
      addressField: 'toRationOffice',
      addressType: 'ration_office',
      sortOrder: 3,
    },
    {
      letterType: 'ration-transfer',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 4,
    },
    { letterType: 'income', addressField: 'office', addressType: 'office', sortOrder: 1 },
    { letterType: 'income', addressField: 'applicant', addressType: 'general', sortOrder: 2 },
    { letterType: 'domicile', addressField: 'office', addressType: 'office', sortOrder: 1 },
    {
      letterType: 'domicile',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    {
      letterType: 'identity',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 1,
    },
    {
      letterType: 'medical-assistance',
      addressField: 'school',
      addressType: 'school',
      sortOrder: 1,
    },
    {
      letterType: 'medical-assistance',
      addressField: 'applicant',
      addressType: 'general',
      sortOrder: 2,
    },
    { letterType: 'ward', addressField: 'to', addressType: 'office', sortOrder: 1 },
    ...WARD_LETTER_TYPES.map((letterType) => ({
      letterType,
      addressField: 'to' as const,
      addressType: 'office' as const,
      sortOrder: 1,
    })),
  ];
}

/** Fallback when DB has no row for a letter/field pair. */
export function getFallbackAddressType(
  letterType: LetterType | string,
  addressField: LetterAddressField,
): AddressType {
  const match = getDefaultLetterAddressTypeLinks().find(
    (row) => row.letterType === letterType && row.addressField === addressField,
  );
  if (match) return match.addressType;
  const formBase = resolveLetterFormBase(String(letterType));
  if (formBase !== letterType) {
    return getFallbackAddressType(formBase, addressField);
  }
  return 'general';
}

export function resolveAddressTypeForLetterField(
  links: Array<{ letterType: string; addressField: string; addressType: string }>,
  letterType: LetterType | string,
  addressField: LetterAddressField,
): AddressType {
  const match = links.find(
    (row) => row.letterType === letterType && row.addressField === addressField,
  );
  if (match && isAddressType(match.addressType)) return match.addressType;
  const formBase = resolveLetterFormBase(String(letterType));
  if (formBase !== letterType) {
    const formMatch = links.find(
      (row) => row.letterType === formBase && row.addressField === addressField,
    );
    if (formMatch && isAddressType(formMatch.addressType)) {
      return formMatch.addressType;
    }
  }
  return getFallbackAddressType(letterType, addressField);
}

export { LETTER_TYPES, ADDRESS_TYPES, isLetterType, isAddressType };
export type { AddressType, LetterType };

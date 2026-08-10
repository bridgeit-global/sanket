export const ADDRESS_TYPES = [
  'school',
  'office',
  'ration_office',
  'general',
  'guardian_minister',
  'co_guardian_minister',
  'cabinet_minister',
  'state_minister',
  'chief_minister',
  'deputy_chief_minister',
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

/** Types that print holder + type label + position + address in letter To blocks. */
export const MINISTER_ADDRESS_TYPES: readonly AddressType[] = [
  'guardian_minister',
  'co_guardian_minister',
  'cabinet_minister',
  'state_minister',
  'chief_minister',
  'deputy_chief_minister',
] as const;

export function isAddressType(value: unknown): value is AddressType {
  return typeof value === 'string' && (ADDRESS_TYPES as readonly string[]).includes(value);
}

export function isMinisterAddressType(value: unknown): boolean {
  return typeof value === 'string' && (MINISTER_ADDRESS_TYPES as readonly string[]).includes(value);
}

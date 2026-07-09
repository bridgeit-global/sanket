export const ADDRESS_TYPES = [
  'school',
  'office',
  'ration_office',
  'general',
] as const;

export type AddressType = (typeof ADDRESS_TYPES)[number];

export function isAddressType(value: unknown): value is AddressType {
  return typeof value === 'string' && (ADDRESS_TYPES as readonly string[]).includes(value);
}

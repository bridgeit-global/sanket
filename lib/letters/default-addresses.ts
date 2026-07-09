import type { AddressType } from '@/lib/letters/address-types';
import {
  DEFAULT_OFFICE_ADDRESS,
  DEFAULT_RATION_OFFICE_ADDRESS,
  type LetterLocale,
} from '@/lib/letters/templates';

export type DefaultAddressSeed = {
  name: string;
  addressType: AddressType;
  addressEn: string;
  addressMr: string;
  sortOrder: number;
};

export function getDefaultAddressSeeds(): DefaultAddressSeed[] {
  return [
    {
      name: 'Tahsildar Office, Kurla',
      addressType: 'office',
      addressEn: DEFAULT_OFFICE_ADDRESS.en,
      addressMr: DEFAULT_OFFICE_ADDRESS.mr,
      sortOrder: 1,
    },
    {
      name: 'Shivajinagar Ration Office',
      addressType: 'ration_office',
      addressEn: DEFAULT_RATION_OFFICE_ADDRESS.en,
      addressMr: DEFAULT_RATION_OFFICE_ADDRESS.mr,
      sortOrder: 2,
    },
  ];
}

export function getAddressTextForLocale(
  addressEn: string,
  addressMr: string,
  locale: LetterLocale,
): string {
  return locale === 'mr' ? addressMr : addressEn;
}

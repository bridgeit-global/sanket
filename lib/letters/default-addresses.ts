import type { AddressType } from '@/lib/letters/address-types';
import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';
import {
  DEFAULT_OFFICE_ADDRESS,
  DEFAULT_RATION_OFFICE_ADDRESS,
} from '@/lib/letters/templates';

export type DefaultAddressSeed = {
  name: string;
  nameMr: string;
  addressType: AddressType;
  sortOrder: number;
} & AddressMasterAddressParts;

export function getDefaultAddressSeeds(): DefaultAddressSeed[] {
  return [
    {
      name: 'Tahsildar Office, Kurla',
      nameMr: 'तहसीलदार कार्यालय, कुर्ला',
      addressType: 'office',
      line1En: '',
      line1Mr: '',
      line2En: 'Tahsildar Office, Kurla',
      line2Mr: 'तहसीलदार कार्यालय, कुर्ला',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '',
      sortOrder: 1,
    },
    {
      name: 'Shivajinagar Ration Office',
      nameMr: 'शिवाजीनगर रेशन कार्यालय',
      addressType: 'ration_office',
      line1En: 'Shivajinagar 44-E Office',
      line1Mr: 'शिवाजीनगर ४४ ई कार्यालय',
      line2En: 'Shivajinagar, Govandi',
      line2Mr: 'शिवाजीनगर, गोवंडी',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '400043',
      sortOrder: 2,
    },
  ];
}

export function getLegacyDefaultAddressText(
  addressType: 'office' | 'ration_office',
  locale: 'en' | 'mr',
): string {
  if (addressType === 'office') return DEFAULT_OFFICE_ADDRESS[locale];
  return DEFAULT_RATION_OFFICE_ADDRESS[locale];
}

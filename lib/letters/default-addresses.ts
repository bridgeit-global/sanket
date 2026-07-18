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

/** Subset of ADM seed kept as runtime fallbacks for fresh DBs. */
export function getDefaultAddressSeeds(): DefaultAddressSeed[] {
  return [
    {
      name: 'Tahsildar Office, Kurla',
      nameMr: 'तहसीलदार कार्यालय, कुर्ला',
      addressType: 'office',
      line1En: 'Tahsildar Office Kurla (Mulund), 1st Floor, Topiwala College Building',
      line1Mr: 'तहसीलदार कार्यालय कुर्ला (मुलुंड), पहिला मजला, टोपिवाला कॉलेज इमारत',
      line2En: 'Sarojini Naidu Road, Mulund (W)',
      line2Mr: 'सरोजिनी नायडू रोड, मुलुंड (पश्चिम)',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '400080',
      sortOrder: 11,
    },
    {
      name: 'Rationing Office 44-E, Govandi',
      nameMr: 'रेशनिंग कार्यालय ४४-ई, गोवंडी',
      addressType: 'ration_office',
      line1En: 'Shivaji Nagar Bus Depot Baji Prabhu',
      line1Mr: 'शिवाजी नगर बस डेपो बाजी प्रभु',
      line2En: 'Deshpande Road, Govandi',
      line2Mr: 'देशपांडे रोड, गोवंडी',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '400043',
      sortOrder: 7,
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

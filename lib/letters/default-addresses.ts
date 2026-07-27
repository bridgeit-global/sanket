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
      line3En: '',
      line3Mr: '',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '400080',
      sortOrder: 11,
    },
    {
      name: 'Rationing Office 49-E, Anushakti Nagar',
      nameMr: 'रेशनिंग कार्यालय ४९-ई, अणुशक्ती नगर',
      addressType: 'ration_office',
      line1En: '1st Floor',
      line1Mr: 'पहिला मजला',
      line2En: 'Supreme Elanor Building, Govandi Station Road, Deonar, Govandi (E)',
      line2Mr: 'सुप्रीम एलनॉर इमारत, गोवंडी स्टेशन रोड, देवनार, गोवंडी (पूर्व)',
      line3En: '',
      line3Mr: '',
      cityEn: 'Mumbai',
      cityMr: 'मुंबई',
      stateEn: 'Maharashtra',
      stateMr: 'महाराष्ट्र',
      pincode: '400088',
      sortOrder: 9,
    },
  ];
}

/** Preferred default ration office for Anushakti Nagar constituency letters. */
export const DEFAULT_RATION_OFFICE_PINCODE = '400088';
export const DEFAULT_RATION_OFFICE_NAME = 'Rationing Office 49-E, Anushakti Nagar';

export function getLegacyDefaultAddressText(
  addressType: 'office' | 'ration_office',
  locale: 'en' | 'mr',
): string {
  if (addressType === 'office') return DEFAULT_OFFICE_ADDRESS[locale];
  return DEFAULT_RATION_OFFICE_ADDRESS[locale];
}

/** Pick the constituency default ration office from address master rows. */
export function findDefaultRationOfficeAddress<
  T extends {
    name: string;
    addressType: string;
    pincode: string;
    isActive?: boolean;
  },
>(addresses: T[]): T | undefined {
  const active = addresses.filter(
    (row) =>
      row.addressType === 'ration_office' && row.isActive !== false,
  );
  return (
    active.find((row) => row.name === DEFAULT_RATION_OFFICE_NAME) ??
    active.find((row) => row.pincode === DEFAULT_RATION_OFFICE_PINCODE)
  );
}

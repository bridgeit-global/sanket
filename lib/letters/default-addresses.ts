import type { AddressType } from '@/lib/letters/address-types';
import type { AddressMasterAddressParts } from '@/lib/letters/format-address-master';
import {
  DEFAULT_OFFICE_ADDRESS,
  DEFAULT_RATION_OFFICE_ADDRESS,
} from '@/lib/letters/templates';

export type DefaultAddressSeed = {
  name: string;
  addressType: AddressType;
  sortOrder: number;
} & AddressMasterAddressParts;

export function getDefaultAddressSeeds(): DefaultAddressSeed[] {
  return [
    {
      name: 'Tahsildar Office, Kurla',
      addressType: 'office',
      houseNumberEn: '',
      houseNumberMr: '',
      localityStreetEn: 'Tahsildar Office, Kurla',
      localityStreetMr: 'तहसीलदार कार्यालय, कुर्ला',
      townVillageEn: 'Mumbai',
      townVillageMr: 'मुंबई',
      pincode: '',
      sortOrder: 1,
    },
    {
      name: 'Shivajinagar Ration Office',
      addressType: 'ration_office',
      houseNumberEn: 'Shivajinagar 44-E Office',
      houseNumberMr: 'शिवाजीनगर ४४ ई कार्यालय',
      localityStreetEn: 'Shivajinagar, Govandi',
      localityStreetMr: 'शिवाजीनगर, गोवंडी',
      townVillageEn: 'Mumbai',
      townVillageMr: 'मुंबई',
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

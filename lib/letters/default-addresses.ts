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

const BMC_M_EAST_ADDRESS_PARTS: AddressMasterAddressParts = {
  line1En: 'Brihanmumbai Municipal Corporation, M/East Ward Office Building',
  line1Mr: 'बृहन्मुंबई महानगरपालिका, एम/पूर्व प्रभाग कार्यालय इमारत',
  line2En: 'Late Madhukar Tukaram Kadam Marg, Govandi (West)',
  line2Mr: 'स्व. मधुकर तुकाराम कदम मार्ग, गोवंडी (पश्चिम)',
  line3En: '',
  line3Mr: '',
  cityEn: 'Mumbai',
  cityMr: 'मुंबई',
  stateEn: 'Maharashtra',
  stateMr: 'महाराष्ट्र',
  pincode: '400043',
};

/** Canonical English names for ward officer address masters. */
export const WARD_OFFICER_ADDRESS_NAMES = {
  swm: 'Assistant Engineer (SWM) M/East Ward',
  garden: 'Assistant Garden Superintendent - M/East Ward',
  water: 'Assistant Engineer (Water Works)',
  maintenance: 'Assistant Engineer (Maintenance)',
} as const;

export type WardOfficerKey = keyof typeof WARD_OFFICER_ADDRESS_NAMES;

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
    {
      name: WARD_OFFICER_ADDRESS_NAMES.swm,
      nameMr: 'सहाय्यक अभियंता (घ. क. व्य.) एम/पूर्व प्रभाग',
      addressType: 'office',
      ...BMC_M_EAST_ADDRESS_PARTS,
      sortOrder: 20,
    },
    {
      name: WARD_OFFICER_ADDRESS_NAMES.garden,
      nameMr: 'सहाय्यक उद्यान अधीक्षक - एम/पूर्व प्रभाग',
      addressType: 'office',
      ...BMC_M_EAST_ADDRESS_PARTS,
      sortOrder: 21,
    },
    {
      name: WARD_OFFICER_ADDRESS_NAMES.water,
      nameMr: 'सहाय्यक अभियंता (जलकामे)',
      addressType: 'office',
      ...BMC_M_EAST_ADDRESS_PARTS,
      sortOrder: 22,
    },
    {
      name: WARD_OFFICER_ADDRESS_NAMES.maintenance,
      nameMr: 'मा. सहाय्यक अभियंता (परिरक्षण)',
      addressType: 'office',
      ...BMC_M_EAST_ADDRESS_PARTS,
      sortOrder: 23,
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

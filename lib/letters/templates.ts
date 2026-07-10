export const LETTER_TYPES = [
  'fees',
  'school-admission',
  'school-transfer',
  'ration-new',
  'ration-add-members',
  'ration-delete-members',
  'ration-transfer',
  'income',
  'domicile',
] as const;

export type LetterType = (typeof LETTER_TYPES)[number];

/** @deprecated Use specific ration-* letter types */
export type RationLetterPurpose = 'new' | 'add-members' | 'delete-members' | 'transfer';

export type LetterLocale = 'en' | 'mr';

export type CommonLetterFields = {
  referencePrefix: string;
  referenceNo: string;
  date: string;
  signatory: string;
};

export type FeesLetterFields = CommonLetterFields & {
  schoolName: string;
  schoolAddress: string;
  standard: string;
  studentName: string;
};

export type SchoolAdmissionLetterFields = CommonLetterFields & {
  schoolName: string;
  schoolAddress: string;
  standard: string;
  studentName: string;
  parentName: string;
  address: string;
  reasonText: string;
};

export type SchoolTransferLetterFields = CommonLetterFields & {
  schoolName: string;
  schoolAddress: string;
  standard: string;
  studentName: string;
  parentName: string;
  address: string;
  previousSchoolName: string;
  currentStandard: string;
  transferReason: string;
};

export type PersonGender = 'male' | 'female' | 'other';

export type RationLetterFields = CommonLetterFields & {
  gender: PersonGender;
  salutation: string;
  fullName: string;
  address: string;
  familyMembers: string;
  rationOfficeAddress: string;
  rationCardNo?: string;
  fromRationOffice?: string;
  toRationOffice?: string;
};

export type IncomeLetterFields = CommonLetterFields & {
  gender: PersonGender;
  salutation: string;
  fullName: string;
  address: string;
  officeAddress: string;
  aadhaarNo: string;
  annualIncome: string;
};

export type DomicileLetterFields = CommonLetterFields & {
  gender: PersonGender;
  salutation: string;
  fullName: string;
  address: string;
  officeAddress: string;
  aadhaarNo: string;
};

export type LetterFields =
  | FeesLetterFields
  | SchoolAdmissionLetterFields
  | SchoolTransferLetterFields
  | RationLetterFields
  | IncomeLetterFields
  | DomicileLetterFields;

export const DEFAULT_SIGNATORY: Record<LetterLocale, string> = {
  mr: 'सना मलिक शेख',
  en: 'Sana Malik Shaikh',
};

export const DEFAULT_RATION_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'शिवाजीनगर ४४ ई कार्यालय, शिवाजीनगर, गोवंडी, मुंबई - ४०० ०४३',
  en: 'Shivajinagar 44-E Office, Shivajinagar, Govandi, Mumbai - 400 043',
};

export const DEFAULT_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'तहसीलदार कार्यालय, कुर्ला, मुंबई',
  en: 'Tahsildar Office, Kurla, Mumbai',
};

export function isLetterType(value: unknown): value is LetterType {
  return typeof value === 'string' && (LETTER_TYPES as readonly string[]).includes(value);
}

/** Map legacy `ration` type + purpose to new letter type. */
export function resolveLegacyRationLetterType(
  letterType: string,
  purpose?: unknown,
): LetterType {
  if (letterType !== 'ration') {
    return isLetterType(letterType) ? letterType : 'fees';
  }
  switch (purpose) {
    case 'add-members':
      return 'ration-add-members';
    case 'delete-members':
      return 'ration-delete-members';
    case 'transfer':
      return 'ration-transfer';
    default:
      return 'ration-new';
  }
}

export function buildLetterBody(
  type: LetterType,
  fields: LetterFields,
  locale: LetterLocale = 'mr',
): string {
  void locale;
  void fields;
  // Fallback plain-text body when no HTML template is configured.
  return `[${type}]`;
}

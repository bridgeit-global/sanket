export const LETTER_TYPES = [
  'general',
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
  officeName: string;
  officeAddress: string;
  aadhaarNo: string;
  annualIncome: string;
};

export type DomicileLetterFields = CommonLetterFields & {
  gender: PersonGender;
  salutation: string;
  fullName: string;
  address: string;
  officeName: string;
  officeAddress: string;
  aadhaarNo: string;
};

export type GeneralLetterFields = CommonLetterFields & {
  to: string;
  subject: string;
  /** One paragraph per line. */
  paragraphs: string;
  /** One signature line per line. */
  signatureParagraphs: string;
};

export type LetterFields =
  | GeneralLetterFields
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
  mr: 'शिवाजी नगर बस डेपो बाजी प्रभु, देशपांडे रोड, गोवंडी, मुंबई, महाराष्ट्र - ४०००४३',
  en: 'Shivaji Nagar Bus Depot Baji Prabhu, Deshpande Road, Govandi, Mumbai, Maharashtra - 400043',
};

export const DEFAULT_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'तहसीलदार कार्यालय कुर्ला (मुलुंड), पहिला मजला, टोपिवाला कॉलेज इमारत, सरोजिनी नायडू रोड, मुलुंड (पश्चिम), मुंबई, महाराष्ट्र - ४०००८०',
  en: 'Tahsildar Office Kurla (Mulund), 1st Floor, Topiwala College Building, Sarojini Naidu Road, Mulund (W), Mumbai, Maharashtra - 400080',
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

export const WARD_ISSUE_TYPES = [
  'garbage',
  'drain',
  'tree-trim',
  'tree-dead',
  'tree-hazard',
  'water-contaminated',
  'water-low-pressure',
  'water-none',
  'water-tanker',
  'road-repair',
  'footpath-repair',
  'street-lights',
  'speed-breaker',
] as const;

export type WardIssueType = (typeof WARD_ISSUE_TYPES)[number];

/** One letter type per ward civic complaint (form base remains `ward`). */
export const WARD_LETTER_TYPES = [
  'ward-garbage',
  'ward-drain',
  'ward-tree-trim',
  'ward-tree-dead',
  'ward-tree-hazard',
  'ward-water-contaminated',
  'ward-water-low-pressure',
  'ward-water-none',
  'ward-water-tanker',
  'ward-road-repair',
  'ward-footpath-repair',
  'ward-street-lights',
  'ward-speed-breaker',
] as const;

export type WardLetterType = (typeof WARD_LETTER_TYPES)[number];

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
  /** @deprecated Prefer specific ward-* letter types */
  'ward',
  ...WARD_LETTER_TYPES,
] as const;

export type LetterType = (typeof LETTER_TYPES)[number];

export function isWardIssueType(value: unknown): value is WardIssueType {
  return (
    typeof value === 'string' &&
    (WARD_ISSUE_TYPES as readonly string[]).includes(value)
  );
}

export function isWardLetterType(value: unknown): boolean {
  return typeof value === 'string' && (value === 'ward' || value.startsWith('ward-'));
}

/** Map `ward-water-low-pressure` → `water-low-pressure`. Null for generic `ward`. */
export function wardIssueTypeFromLetterType(
  letterType: string | null | undefined,
): WardIssueType | null {
  if (!letterType || letterType === 'ward') return null;
  if (!letterType.startsWith('ward-')) return null;
  const issue = letterType.slice('ward-'.length);
  return isWardIssueType(issue) ? issue : null;
}

export function letterTypeFromWardIssue(issueType: WardIssueType): WardLetterType {
  return `ward-${issueType}` as WardLetterType;
}

export function isSpecificWardLetterType(value: unknown): boolean {
  return typeof value === 'string' && wardIssueTypeFromLetterType(value) !== null;
}

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

export type WardLetterFields = CommonLetterFields & {
  issueType: WardIssueType;
  /** Full recipient block (officer name + address) for the letter body. */
  to: string;
  /** Officer / office name used by the address master picker. */
  toName: string;
  complainantName: string;
  contactNo: string;
  location: string;
  duration: string;
};

export type LetterFields =
  | GeneralLetterFields
  | FeesLetterFields
  | SchoolAdmissionLetterFields
  | SchoolTransferLetterFields
  | RationLetterFields
  | IncomeLetterFields
  | DomicileLetterFields
  | WardLetterFields;

export const DEFAULT_SIGNATORY: Record<LetterLocale, string> = {
  mr: 'सना मलिक शेख',
  en: 'Sana Malik Shaikh',
};

export const DEFAULT_RATION_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'पहिला मजला, सुप्रीम एलनॉर इमारत, गोवंडी स्टेशन रोड, देवनार, गोवंडी (पूर्व), मुंबई - ४०००८८',
  en: '1st Floor, Supreme Elanor Building, Govandi Station Road, Deonar, Govandi (E), Mumbai - 400088',
};

export const DEFAULT_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'तहसीलदार कार्यालय कुर्ला (मुलुंड), पहिला मजला, टोपिवाला कॉलेज इमारत, सरोजिनी नायडू रोड, मुलुंड (पश्चिम), मुंबई - ४०००८०',
  en: 'Tahsildar Office Kurla (Mulund), 1st Floor, Topiwala College Building, Sarojini Naidu Road, Mulund (W), Mumbai - 400080',
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
  type: LetterType | string,
  fields: LetterFields,
  locale: LetterLocale = 'mr',
): string {
  void locale;
  void fields;
  // Fallback plain-text body when no HTML template is configured.
  return `[${type}]`;
}

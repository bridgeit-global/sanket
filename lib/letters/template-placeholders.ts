import { resolveLetterFormBase } from '@/lib/letters/letter-type-options';
import type { LetterType } from '@/lib/letters/templates';

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

const COMMON_PLACEHOLDER_KEYS = [
  'referencePrefix',
  'referenceNo',
  'date',
  'signatory',
] as const;

/** Keys are form bases (`resolveLetterFormBase`), not every letter-type code. */
const KNOWN_PLACEHOLDERS_BY_FORM: Partial<
  Record<LetterType, readonly string[]>
> &
  Record<'general' | 'ward', readonly string[]> = {
  general: [
    ...COMMON_PLACEHOLDER_KEYS,
    'to',
    'subject',
    'paragraphs',
    'signatureParagraphs',
    'toBlock',
    'paragraphsBlock',
    'signatureBlock',
  ],
  fees: [
    ...COMMON_PLACEHOLDER_KEYS,
    'schoolName',
    'schoolAddress',
    'standard',
    'studentName',
  ],
  'school-admission': [
    ...COMMON_PLACEHOLDER_KEYS,
    'schoolName',
    'schoolAddress',
    'standard',
    'studentName',
    'parentName',
    'address',
    'reasonText',
  ],
  'college-admission': [
    ...COMMON_PLACEHOLDER_KEYS,
    'collegeName',
    'collegeAddress',
    'courseName',
    'studentName',
    'parentName',
    'address',
    'reasonText',
  ],
  'school-transfer': [
    ...COMMON_PLACEHOLDER_KEYS,
    'schoolName',
    'schoolAddress',
    'standard',
    'studentName',
    'parentName',
    'address',
    'previousSchoolName',
    'currentStandard',
    'transferReason',
  ],
  'ration-new': [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'familyMembers',
    'rationOfficeAddress',
    'familyMembersBlock',
    'genderPronounSubject',
  ],
  'ration-add-members': [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'familyMembers',
    'rationOfficeAddress',
    'rationCardNo',
    'familyMembersBlock',
    'genderPronounSubject',
  ],
  'ration-delete-members': [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'familyMembers',
    'rationOfficeAddress',
    'rationCardNo',
    'familyMembersBlock',
    'genderPronounSubject',
  ],
  'ration-transfer': [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'familyMembers',
    'rationOfficeAddress',
    'rationCardNo',
    'fromRationOffice',
    'toRationOffice',
    'familyMembersBlock',
    'genderPronounSubject',
  ],
  income: [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'officeName',
    'officeAddress',
    'aadhaarNo',
    'annualIncome',
    'genderPronounSubject',
  ],
  domicile: [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'officeName',
    'officeAddress',
    'aadhaarNo',
    'genderPronounSubject',
  ],
  identity: [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'fullName',
    'address',
    'aadhaarNo',
    'genderPronounSubject',
    'reason',
  ],
  'medical-assistance': [
    ...COMMON_PLACEHOLDER_KEYS,
    'gender',
    'salutation',
    'hospitalName',
    'hospitalAddress',
    'fullName',
    'age',
    'address',
    'ailment',
    'treatment',
  ],
  ward: [
    ...COMMON_PLACEHOLDER_KEYS,
    'issueType',
    'to',
    'toName',
    'complainantName',
    'contactNo',
    'location',
    'duration',
    'subject',
    'toBlock',
    'paragraphsBlock',
  ],
};

/** Unique `{{token}}` names in template HTML, in first-seen order. */
export function extractTemplatePlaceholders(templateHtml: string): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  const pattern = new RegExp(PLACEHOLDER_PATTERN.source, 'g');
  for (const match of templateHtml.matchAll(pattern)) {
    const key = match[1];
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }
  return keys;
}

export function getKnownPlaceholderKeys(
  letterType: LetterType | string,
): ReadonlySet<string> {
  const formBase = resolveLetterFormBase(letterType);
  return new Set(
    KNOWN_PLACEHOLDERS_BY_FORM[formBase] ?? KNOWN_PLACEHOLDERS_BY_FORM.general,
  );
}

/**
 * Placeholders in the template that are not backed by the letter form
 * (or computed from it). These should get dynamic inputs when generating.
 */
export function getCustomTemplatePlaceholders(
  templateHtml: string,
  letterType: LetterType | string,
): string[] {
  const known = getKnownPlaceholderKeys(letterType);
  return extractTemplatePlaceholders(templateHtml).filter(
    (key) => !known.has(key),
  );
}

/** `projectName` → `Project Name` */
export function humanizePlaceholderKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

import {
  LETTER_TYPES,
  isLetterType,
  isWardLetterType,
  letterTypeFromWardIssue,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';
import { getDefaultTemplateName } from '@/lib/letters/default-template-html';
import { resolveWardIssueTypeFromServiceName } from '@/lib/letters/ward-issue-presets';

export const LETTER_TYPE_CODE_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;

export type LetterTypeOption = {
  code: string;
  labelEn: string;
  labelMr: string;
  formBase: LetterType;
  isBuiltIn: boolean;
  isActive: boolean;
  sortOrder: number;
  id?: string;
};

/**
 * Form UI / field shape for a letter type.
 * Specific `ward-*` complaint types share the ward form.
 */
export function resolveLetterFormBase(letterType: string): LetterType {
  if (isWardLetterType(letterType)) return 'ward';
  if (isLetterType(letterType)) return letterType;
  return 'general';
}

/** School family letters use General; all other letter types use Departmental. */
export function documentTypeForLetterType(
  letterType: string,
): 'General' | 'Department' {
  const base = resolveLetterFormBase(letterType);
  if (
    base === 'fees' ||
    base === 'school-admission' ||
    base === 'school-transfer'
  ) {
    return 'General';
  }
  return 'Department';
}

export function isValidLetterTypeCode(value: unknown): value is string {
  return typeof value === 'string' && LETTER_TYPE_CODE_PATTERN.test(value);
}

export function normalizeLetterTypeCode(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function getBuiltInLetterTypeOptions(): LetterTypeOption[] {
  return LETTER_TYPES.map((code, index) => ({
    code,
    labelEn: getDefaultTemplateName(code, 'en'),
    labelMr: getDefaultTemplateName(code, 'mr'),
    formBase: resolveLetterFormBase(code),
    isBuiltIn: true,
    isActive: true,
    sortOrder: index,
  }));
}

export function letterTypeLabel(
  option: Pick<LetterTypeOption, 'code' | 'labelEn' | 'labelMr'> | null | undefined,
  locale: LetterLocale,
  fallbackCode?: string,
): string {
  if (!option) return fallbackCode ?? '';
  const label = locale === 'mr' ? option.labelMr : option.labelEn;
  return label.trim() || option.code;
}

/** Normalize a service / catalog name for fuzzy matching. */
function normalizeServiceNameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Exact / near-exact catalog names → letter type codes.
 * Order matters for first-match substring rules below.
 */
const SERVICE_NAME_TO_LETTER_TYPE: Array<{ match: string; letterType: string }> = [
  { match: 'fees concession', letterType: 'fees' },
  { match: 'fee concession', letterType: 'fees' },
  { match: 'school / college new admission', letterType: 'school-admission' },
  { match: 'school college new admission', letterType: 'school-admission' },
  { match: 'school new admission', letterType: 'school-admission' },
  { match: 'school admission', letterType: 'school-admission' },
  { match: 'college admission', letterType: 'school-admission' },
  {
    match: 'school / college transfer admission',
    letterType: 'school-transfer',
  },
  { match: 'school college transfer admission', letterType: 'school-transfer' },
  { match: 'school transfer admission', letterType: 'school-transfer' },
  { match: 'school leaving certificate', letterType: 'school-transfer' },
  { match: 'college leaving certificate', letterType: 'school-transfer' },
  { match: 'school-related general request', letterType: 'general' },
  // Specific ration variants before generic "ration card".
  { match: 'ration card - name addition', letterType: 'ration-add-members' },
  { match: 'ration card name addition', letterType: 'ration-add-members' },
  { match: 'ration card - name deletion', letterType: 'ration-delete-members' },
  { match: 'ration card name deletion', letterType: 'ration-delete-members' },
  { match: 'ration card - transfer', letterType: 'ration-transfer' },
  { match: 'ration card transfer', letterType: 'ration-transfer' },
  { match: 'ration card - new', letterType: 'ration-new' },
  { match: 'ration card new', letterType: 'ration-new' },
  { match: 'ration card', letterType: 'ration-new' },
  { match: 'ration donation', letterType: 'ration-new' },
  { match: 'income certificate', letterType: 'income' },
  { match: 'domicile certificate', letterType: 'domicile' },
  { match: 'request letter', letterType: 'general' },
  { match: 'handover letter request', letterType: 'general' },
  { match: 'ward letter', letterType: 'ward' },
  { match: 'ward complaint', letterType: 'ward' },
];

/**
 * Infer the letter type to open from a beneficiary service / catalog name.
 * Falls back to `general` when nothing matches.
 */
export function resolveLetterTypeFromServiceName(
  serviceName: string | null | undefined,
): string {
  const raw = (serviceName ?? '').trim();
  if (!raw) return 'general';

  const asCode = normalizeLetterTypeCode(raw);
  if (isLetterType(asCode)) return asCode;
  // Service name already stored as a letter-type code (e.g. custom types).
  const rawLower = raw.toLowerCase();
  if (isValidLetterTypeCode(rawLower) && asCode === rawLower) {
    return asCode;
  }

  // Prefer specific ward complaint types (e.g. BMC – Low Water Pressure).
  const wardIssue = resolveWardIssueTypeFromServiceName(raw);
  if (wardIssue) return letterTypeFromWardIssue(wardIssue);

  const key = normalizeServiceNameKey(raw);
  if (!key) return 'general';

  for (const { match, letterType } of SERVICE_NAME_TO_LETTER_TYPE) {
    if (key === match || key.includes(match)) {
      return letterType;
    }
  }

  // Loose token heuristics for slight name variants.
  if (/\bfees?\b/.test(key) && /\bconcession\b/.test(key)) return 'fees';
  if (/\badmission\b/.test(key) && /\b(school|college)\b/.test(key)) {
    return 'school-admission';
  }
  if (/\b(transfer|leaving)\b/.test(key) && /\b(school|college)\b/.test(key)) {
    return 'school-transfer';
  }
  if (/\bration\b/.test(key)) {
    if (/\bname addition\b/.test(key) || /\badd members?\b/.test(key)) {
      return 'ration-add-members';
    }
    if (/\bname deletion\b/.test(key) || /\bdelete members?\b/.test(key)) {
      return 'ration-delete-members';
    }
    if (/\btransfer\b/.test(key)) return 'ration-transfer';
    return 'ration-new';
  }
  if (/\bincome\b/.test(key)) return 'income';
  if (/\bdomicile\b/.test(key)) return 'domicile';
  if (/\bward\b/.test(key)) return 'ward';

  return 'general';
}

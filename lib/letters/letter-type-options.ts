import {
  LETTER_TYPES,
  isLetterType,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';
import { getDefaultTemplateName } from '@/lib/letters/default-template-html';

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

/** Built-in types always use themselves as the form base. */
export function resolveLetterFormBase(letterType: string): LetterType {
  if (isLetterType(letterType)) return letterType;
  return 'general';
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
    formBase: code,
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

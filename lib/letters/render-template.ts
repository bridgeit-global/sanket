import type {
  DomicileLetterFields,
  FeesLetterFields,
  IncomeLetterFields,
  LetterFields,
  LetterLocale,
  LetterType,
  RationLetterFields,
  SchoolAdmissionLetterFields,
  SchoolTransferLetterFields,
} from '@/lib/letters/templates';

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export type LetterheadMode = 'half' | 'full';

export function normalizeLetterheadMode(value: unknown): LetterheadMode {
  return value === 'half' ? 'half' : 'full';
}

export function wrapLetterWithLetterhead(
  contentHtml: string,
  letterheadUrl: string | null | undefined,
  letterheadMode: LetterheadMode = 'full',
): string {
  const trimmedUrl = letterheadUrl?.trim();
  if (!trimmedUrl) {
    return contentHtml;
  }

  const mode = normalizeLetterheadMode(letterheadMode);
  const isFull = mode === 'full';
  const wrapperStyle = isFull
    ? 'margin: -1.5rem -1.5rem 1rem -1.5rem; width: calc(100% + 3rem);'
    : 'margin-bottom: 1rem; text-align: center;';
  const imgStyle = isFull
    ? 'width: 100%; max-width: 100%; height: auto; display: block;'
    : 'width: 50%; max-width: 50%; height: auto; display: block; margin: 0 auto;';
  const modeClass = isFull ? 'letter-letterhead--full' : 'letter-letterhead--half';

  const letterhead = `<div class="letter-letterhead ${modeClass}" style="${wrapperStyle}"><img src="${trimmedUrl}" alt="Letterhead" style="${imgStyle}" /></div>`;
  return `${letterhead}${contentHtml}`;
}

export function renderLetterTemplate(
  templateHtml: string,
  fields: Record<string, string>,
): string {
  return templateHtml.replace(PLACEHOLDER_PATTERN, (_, key: string) => fields[key] ?? '');
}

function toFieldRecord(fields: LetterFields): Record<string, string> {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [key, String(value ?? '')]),
  );
}

export function buildRenderFields(
  type: LetterType,
  fields: LetterFields,
  locale: LetterLocale,
): Record<string, string> {
  const base = toFieldRecord(fields);

  if (type.startsWith('ration-')) {
    const rationFields = fields as RationLetterFields;
    const familyMembers = rationFields.familyMembers.trim();
    const familyMembersBlock = familyMembers ? familyMembers : '';
    return {
      ...base,
      familyMembersBlock,
      rationCardNo: rationFields.rationCardNo ?? '',
      fromRationOffice: rationFields.fromRationOffice ?? '',
      toRationOffice: rationFields.toRationOffice ?? '',
    };
  }

  if (type === 'income') {
    const incomeFields = fields as IncomeLetterFields;
    return {
      ...base,
      aadhaarNo: incomeFields.aadhaarNo,
      annualIncome: incomeFields.annualIncome,
      officeAddress: incomeFields.officeAddress,
    };
  }

  if (type === 'domicile') {
    const domicileFields = fields as DomicileLetterFields;
    return {
      ...base,
      aadhaarNo: domicileFields.aadhaarNo,
      officeAddress: domicileFields.officeAddress,
    };
  }

  if (type === 'school-admission') {
    return { ...base, ...(fields as SchoolAdmissionLetterFields) };
  }

  if (type === 'school-transfer') {
    return { ...base, ...(fields as SchoolTransferLetterFields) };
  }

  if (type === 'fees') {
    return { ...base, ...(fields as FeesLetterFields) };
  }

  void locale;
  return base;
}

export function buildRenderedLetterHtml(
  type: LetterType,
  templateHtml: string,
  fields: LetterFields,
  locale: LetterLocale,
  letterheadUrl?: string | null,
  letterheadMode: LetterheadMode = 'full',
): string {
  const renderFields = buildRenderFields(type, fields, locale);
  const contentHtml = renderLetterTemplate(templateHtml, renderFields);
  return wrapLetterWithLetterhead(contentHtml, letterheadUrl, letterheadMode);
}

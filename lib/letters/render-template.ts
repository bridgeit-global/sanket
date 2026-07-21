import {
  formatIndianAmount,
  toLocaleDigits,
  toWesternDigits,
} from '@/lib/locale-digits';
import {
  coerceDocumentType,
  documentTypeLabel,
  type DocumentTypeLabelSource,
} from '@/lib/letters/reference-sequence';
import type {
  DomicileLetterFields,
  FeesLetterFields,
  IncomeLetterFields,
  LetterFields,
  LetterLocale,
  LetterType,
  PersonGender,
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

function escapeHtmlText(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** One member per line from the form → HTML line breaks for letter body. */
function formatFamilyMembersBlock(familyMembers: string): string {
  return familyMembers
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(escapeHtmlText)
    .join('<br>');
}

function resolveGenderTokens(gender: PersonGender | undefined, locale: LetterLocale) {
  const resolvedGender: PersonGender = gender ?? 'other';
  if (locale === 'mr') {
    // Marathi honorific demonstratives used in our default templates.
    // male => "हे", female => "या", other => "हे"
    return {
      genderPronounSubject: resolvedGender === 'female' ? 'या' : 'हे',
    };
  }
  return {
    genderPronounSubject:
      resolvedGender === 'male' ? 'he' : resolvedGender === 'female' ? 'she' : 'they',
  };
}

function withLocalizedReferenceFields(
  record: Record<string, string>,
  locale: LetterLocale,
  documentTypes?: DocumentTypeLabelSource[],
): Record<string, string> {
  const storedPrefix =
    coerceDocumentType(record.referencePrefix) ?? record.referencePrefix;
  return {
    ...record,
    referencePrefix: documentTypeLabel(storedPrefix, locale, documentTypes),
    referenceNo: toLocaleDigits(
      toWesternDigits(record.referenceNo ?? ''),
      locale,
    ),
  };
}

export function buildRenderFields(
  type: LetterType,
  fields: LetterFields,
  locale: LetterLocale,
  documentTypes?: DocumentTypeLabelSource[],
): Record<string, string> {
  const base = toFieldRecord(fields);
  let renderFields: Record<string, string>;

  if (type.startsWith('ration-')) {
    const rationFields = fields as RationLetterFields;
    const familyMembersBlock = formatFamilyMembersBlock(rationFields.familyMembers);
    renderFields = {
      ...base,
      ...resolveGenderTokens(rationFields.gender, locale),
      familyMembersBlock,
      rationCardNo: rationFields.rationCardNo ?? '',
      fromRationOffice: rationFields.fromRationOffice ?? '',
      toRationOffice: rationFields.toRationOffice ?? '',
    };
  } else if (type === 'income') {
    const incomeFields = fields as IncomeLetterFields;
    renderFields = {
      ...base,
      ...resolveGenderTokens(incomeFields.gender, locale),
      aadhaarNo: toLocaleDigits(
        toWesternDigits(incomeFields.aadhaarNo).replace(/\D/g, ''),
        locale,
      ),
      annualIncome: formatIndianAmount(incomeFields.annualIncome, locale),
      officeName: incomeFields.officeName,
      officeAddress: incomeFields.officeAddress,
    };
  } else if (type === 'domicile') {
    const domicileFields = fields as DomicileLetterFields;
    renderFields = {
      ...base,
      ...resolveGenderTokens(domicileFields.gender, locale),
      aadhaarNo: toLocaleDigits(
        toWesternDigits(domicileFields.aadhaarNo).replace(/\D/g, ''),
        locale,
      ),
      officeName: domicileFields.officeName,
      officeAddress: domicileFields.officeAddress,
    };
  } else if (type === 'school-admission') {
    renderFields = { ...base, ...(fields as SchoolAdmissionLetterFields) };
  } else if (type === 'school-transfer') {
    renderFields = { ...base, ...(fields as SchoolTransferLetterFields) };
  } else if (type === 'fees') {
    renderFields = { ...base, ...(fields as FeesLetterFields) };
  } else {
    renderFields = base;
  }

  // Apply last so type-specific spreads cannot overwrite localized values.
  return withLocalizedReferenceFields(renderFields, locale, documentTypes);
}

export function buildRenderedLetterHtml(
  type: LetterType,
  templateHtml: string,
  fields: LetterFields,
  locale: LetterLocale,
  letterheadUrl?: string | null,
  letterheadMode: LetterheadMode = 'full',
  documentTypes?: DocumentTypeLabelSource[],
): string {
  const renderFields = buildRenderFields(type, fields, locale, documentTypes);
  const contentHtml = renderLetterTemplate(templateHtml, renderFields);
  return wrapLetterWithLetterhead(contentHtml, letterheadUrl, letterheadMode);
}

import {
  formatIndianAmount,
  toLocaleDigits,
  toWesternDigits,
} from '@/lib/locale-digits';
import { formatAddressSoftWrapHtml } from '@/lib/letters/format-address-master';
import {
  coerceDocumentType,
  documentTypeLabel,
  type DocumentTypeLabelSource,
} from '@/lib/letters/reference-sequence';
import type {
  DomicileLetterFields,
  FeesLetterFields,
  GeneralLetterFields,
  IncomeLetterFields,
  LetterFields,
  LetterLocale,
  LetterType,
  PersonGender,
  RationLetterFields,
  SchoolAdmissionLetterFields,
  SchoolTransferLetterFields,
} from '@/lib/letters/templates';
import { isLetterType } from '@/lib/letters/templates';

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

function toFieldRecord(fields: LetterFields & Record<string, string>): Record<string, string> {
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
  const lines = familyMembers
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map(escapeHtmlText)
    .join('<br>');
  if (!lines) return '';
  // Reset paragraph text-indent so the numbered member list stays flush left.
  return `<span style="display:block;text-indent:0">${lines}</span>`;
}

function formatMultilineHtmlBlock(text: string): string {
  // Explicit newlines stay hard breaks. Comma-separated address/"To" parts
  // soft-wrap as units so trailing commas stay visible (en + mr).
  return formatAddressSoftWrapHtml(text);
}

function formatParagraphsBlock(paragraphs: string): string {
  return paragraphs
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((text) => `<p class="paragraph">${escapeHtmlText(text)}</p>`)
    .join('');
}

function formatSignatureBlock(signatureParagraphs: string): string {
  const lines = signatureParagraphs
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';

  return lines
    .map((text, index) => {
      const isLast = index === lines.length - 1;
      const className = isLast ? 'right-tab-sign' : 'right-tab';
      return `<div class="${className} signature-line">${escapeHtmlText(text)}</div>`;
    })
    .join('');
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
  type: LetterType | string,
  fields: LetterFields & Record<string, string>,
  locale: LetterLocale,
  documentTypes?: DocumentTypeLabelSource[],
): Record<string, string> {
  const base = toFieldRecord(fields);
  let renderFields: Record<string, string>;
  const formType = isLetterType(type) ? type : 'general';

  if (formType === 'general') {
    const generalFields = fields as GeneralLetterFields;
    renderFields = {
      ...base,
      to: generalFields.to,
      subject: generalFields.subject,
      toBlock: formatMultilineHtmlBlock(generalFields.to),
      paragraphsBlock: formatParagraphsBlock(generalFields.paragraphs),
      signatureBlock: formatSignatureBlock(generalFields.signatureParagraphs),
    };
  } else if (formType.startsWith('ration-')) {
    const rationFields = fields as RationLetterFields;
    const familyMembersBlock = formatFamilyMembersBlock(rationFields.familyMembers);
    renderFields = {
      ...base,
      ...resolveGenderTokens(rationFields.gender, locale),
      familyMembersBlock,
      rationCardNo: rationFields.rationCardNo ?? '',
      fromRationOffice: rationFields.fromRationOffice ?? '',
      toRationOffice: rationFields.toRationOffice ?? '',
      rationOfficeAddress: formatAddressSoftWrapHtml(
        rationFields.rationOfficeAddress ?? '',
      ),
    };
  } else if (formType === 'income') {
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
      officeAddress: formatAddressSoftWrapHtml(incomeFields.officeAddress),
    };
  } else if (formType === 'domicile') {
    const domicileFields = fields as DomicileLetterFields;
    renderFields = {
      ...base,
      ...resolveGenderTokens(domicileFields.gender, locale),
      aadhaarNo: toLocaleDigits(
        toWesternDigits(domicileFields.aadhaarNo).replace(/\D/g, ''),
        locale,
      ),
      officeName: domicileFields.officeName,
      officeAddress: formatAddressSoftWrapHtml(domicileFields.officeAddress),
    };
  } else if (formType === 'school-admission') {
    const schoolFields = fields as SchoolAdmissionLetterFields;
    renderFields = {
      ...base,
      ...schoolFields,
      schoolAddress: formatAddressSoftWrapHtml(schoolFields.schoolAddress),
    };
  } else if (formType === 'school-transfer') {
    const schoolFields = fields as SchoolTransferLetterFields;
    renderFields = {
      ...base,
      ...schoolFields,
      schoolAddress: formatAddressSoftWrapHtml(schoolFields.schoolAddress),
    };
  } else if (formType === 'fees') {
    const fees = fields as FeesLetterFields;
    renderFields = {
      ...base,
      ...fees,
      schoolAddress: formatAddressSoftWrapHtml(fees.schoolAddress),
    };
  } else {
    renderFields = base;
  }

  // Apply last so type-specific spreads cannot overwrite localized values.
  return withLocalizedReferenceFields(renderFields, locale, documentTypes);
}

export function buildRenderedLetterHtml(
  type: LetterType | string,
  templateHtml: string,
  fields: LetterFields & Record<string, string>,
  locale: LetterLocale,
  letterheadUrl?: string | null,
  letterheadMode: LetterheadMode = 'full',
  documentTypes?: DocumentTypeLabelSource[],
): string {
  const renderFields = buildRenderFields(type, fields, locale, documentTypes);
  const contentHtml = renderLetterTemplate(templateHtml, renderFields);
  return wrapLetterWithLetterhead(contentHtml, letterheadUrl, letterheadMode);
}

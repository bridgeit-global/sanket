import {
  formatIndianAmount,
  toLocaleDigits,
  toWesternDigits,
} from '@/lib/locale-digits';
import {
  formatAddressSoftWrapHtml,
  truncateAddressPincodesForLetter,
} from '@/lib/letters/format-address-master';
import {
  coerceDocumentType,
  documentTypeLabel,
  type DocumentTypeLabelSource,
} from '@/lib/letters/reference-sequence';
import {
  buildWardParagraphs,
  buildWardSubject,
  resolveWardIssueType,
} from '@/lib/letters/ward-issue-presets';
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
  CollegeAdmissionLetterFields,
  SchoolAdmissionLetterFields,
  SchoolTransferLetterFields,
  WardLetterFields,
} from '@/lib/letters/templates';
import { resolveLetterFormBase } from '@/lib/letters/letter-type-options';

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
  // Explicit newlines / `<br>` from recipient address formatting stay hard breaks.
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

function formatAadhaarForLetter(aadhaarNo: string, locale: LetterLocale): string {
  const digits = toWesternDigits(aadhaarNo).replace(/\D/g, '');
  const grouped = digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  return toLocaleDigits(grouped, locale);
}

function formatIdentityReasonBlock(reason: string, locale: LetterLocale): string {
  const trimmed = reason.trim();
  if (!trimmed) return '';
  const escaped = escapeHtmlText(trimmed);
  if (locale === 'mr') {
    return `<p class="paragraph">सदरचे ओळखपत्र त्यांना त्यांच्या विनंतीनुसार <span class="var">${escaped}</span> देण्यात येत आहे.</p>`;
  }
  return `<p class="paragraph">This identity card is being issued to them at their request <span class="var">${escaped}</span>.</p>`;
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
  const formType = resolveLetterFormBase(
    typeof type === 'string' ? type : 'general',
  );

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
  } else if (formType === 'domicile' || formType === 'identity') {
    const domicileFields = fields as DomicileLetterFields;
    const reason = (domicileFields.reason ?? '').trim();
    renderFields = {
      ...base,
      ...resolveGenderTokens(domicileFields.gender, locale),
      aadhaarNo:
        formType === 'identity'
          ? formatAadhaarForLetter(domicileFields.aadhaarNo, locale)
          : toLocaleDigits(
              toWesternDigits(domicileFields.aadhaarNo).replace(/\D/g, ''),
              locale,
            ),
      officeName: domicileFields.officeName,
      officeAddress: formatAddressSoftWrapHtml(domicileFields.officeAddress),
      reason,
      reasonBlock:
        formType === 'identity' ? formatIdentityReasonBlock(reason, locale) : '',
    };
  } else if (formType === 'school-admission') {
    const schoolFields = fields as SchoolAdmissionLetterFields;
    renderFields = {
      ...base,
      ...schoolFields,
      schoolAddress: formatAddressSoftWrapHtml(schoolFields.schoolAddress),
    };
  } else if (formType === 'college-admission') {
    const collegeFields = fields as CollegeAdmissionLetterFields;
    renderFields = {
      ...base,
      ...collegeFields,
      collegeAddress: formatAddressSoftWrapHtml(collegeFields.collegeAddress),
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
  } else if (formType === 'ward') {
    const wardFields = fields as WardLetterFields;
    const issueType = resolveWardIssueType(wardFields.issueType);
    const contactDigits = toWesternDigits(wardFields.contactNo ?? '').replace(/\D/g, '');
    const values = {
      location: toLocaleDigits(wardFields.location ?? '', locale),
      complainantName: wardFields.complainantName ?? '',
      contactNo: toLocaleDigits(contactDigits, locale),
      duration: toLocaleDigits(wardFields.duration ?? '', locale),
    };
    const subject = toLocaleDigits(
      buildWardSubject(issueType, locale, values),
      locale,
    );
    const paragraphs = toLocaleDigits(
      buildWardParagraphs(issueType, locale, values),
      locale,
    );
    renderFields = {
      ...base,
      issueType,
      to: wardFields.to,
      complainantName: values.complainantName,
      contactNo: values.contactNo,
      location: values.location,
      duration: values.duration,
      subject,
      toBlock: formatMultilineHtmlBlock(toLocaleDigits(wardFields.to ?? '', locale)),
      paragraphsBlock: formatParagraphsBlock(paragraphs),
    };
  } else {
    renderFields = base;
  }

  // Apply last so type-specific spreads cannot overwrite localized values.
  const localized = withLocalizedReferenceFields(renderFields, locale, documentTypes);
  // Letter preview/print: keep full 6-digit PINs in addresses (e.g. 400043).
  return Object.fromEntries(
    Object.entries(localized).map(([key, value]) => [
      key,
      truncateAddressPincodesForLetter(value, locale),
    ]),
  );
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

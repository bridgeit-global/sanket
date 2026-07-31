import { EN_TEMPLATE_HTML } from '@/lib/letters/en-template-html';
import { MR_TEMPLATE_HTML } from '@/lib/letters/mr-template-html';
import {
  LETTER_TYPES,
  WARD_LETTER_TYPES,
  isLetterType,
  wardIssueTypeFromLetterType,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';
import {
  getWardIssueCatalogName,
  getWardIssueLabel,
} from '@/lib/letters/ward-issue-presets';

const BASE_TEMPLATE_NAMES: Record<
  Exclude<LetterType, (typeof WARD_LETTER_TYPES)[number]>,
  Record<LetterLocale, string>
> = {
  general: { en: 'General Letter', mr: 'सामान्य पत्र' },
  fees: { en: 'Fee Concession Recommendation', mr: 'शुल्क सवलत शिफारस' },
  'school-admission': {
    en: 'School New Admission',
    mr: 'शाळा नवीन प्रवेश शिफारस',
  },
  'school-transfer': {
    en: 'School Transfer Admission',
    mr: 'शाळा स्थानांतरण प्रवेश शिफारस',
  },
  'ration-new': { en: 'Ration Card — New', mr: 'शिधापत्रिका — नवीन' },
  'ration-add-members': {
    en: 'Ration Card — Name Addition',
    mr: 'शिधापत्रिका — नाव समाविष्ट',
  },
  'ration-delete-members': {
    en: 'Ration Card — Name Deletion',
    mr: 'शिधापत्रिका — नाव वगळणे',
  },
  'ration-transfer': {
    en: 'Ration Card — Transfer',
    mr: 'शिधापत्रिका — हस्तांतरण',
  },
  income: { en: 'Income Certificate', mr: 'उत्पन्न प्रमाणपत्र' },
  domicile: { en: 'Domicile Certificate', mr: 'अधिवास प्रमाणपत्र' },
  ward: { en: 'Ward Letter', mr: 'प्रभाग पत्र' },
};

const WARD_TEMPLATE_NAMES = Object.fromEntries(
  WARD_LETTER_TYPES.map((letterType) => {
    const issueType = wardIssueTypeFromLetterType(letterType);
    return [
      letterType,
      {
        en: issueType ? getWardIssueCatalogName(issueType) : letterType,
        mr: issueType
          ? `प्रभाग – ${getWardIssueLabel(issueType, 'mr')}`
          : letterType,
      },
    ];
  }),
) as Record<(typeof WARD_LETTER_TYPES)[number], Record<LetterLocale, string>>;

const DEFAULT_TEMPLATE_NAMES: Record<LetterType, Record<LetterLocale, string>> =
  {
    ...BASE_TEMPLATE_NAMES,
    ...WARD_TEMPLATE_NAMES,
  };

const DEFAULT_TEMPLATE_HTML: Record<LetterType, Record<LetterLocale, string>> =
  Object.fromEntries(
    LETTER_TYPES.map((letterType) => [
      letterType,
      {
        en: EN_TEMPLATE_HTML[letterType],
        mr: MR_TEMPLATE_HTML[letterType],
      },
    ]),
  ) as Record<LetterType, Record<LetterLocale, string>>;

export function getDefaultTemplateHtml(
  letterType: LetterType | string,
  letterLocale: LetterLocale,
): string {
  if (isLetterType(letterType)) {
    return DEFAULT_TEMPLATE_HTML[letterType][letterLocale];
  }
  return DEFAULT_TEMPLATE_HTML.general[letterLocale];
}

export function getDefaultTemplateName(
  letterType: LetterType | string,
  letterLocale: LetterLocale,
): string {
  if (isLetterType(letterType)) {
    return DEFAULT_TEMPLATE_NAMES[letterType][letterLocale];
  }
  return letterLocale === 'mr' ? 'सानुकूल पत्र' : 'Custom Letter';
}

export function getAllDefaultLetterMasters(): Array<{
  name: string;
  letterType: LetterType;
  letterLocale: LetterLocale;
  templateHtml: string;
}> {
  const locales: LetterLocale[] = ['en', 'mr'];

  return LETTER_TYPES.flatMap((letterType) =>
    locales.map((letterLocale) => ({
      name: getDefaultTemplateName(letterType, letterLocale),
      letterType,
      letterLocale,
      templateHtml: getDefaultTemplateHtml(letterType, letterLocale),
    })),
  );
}

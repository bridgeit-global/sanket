import { MR_TEMPLATE_HTML } from '@/lib/letters/mr-template-html';
import {
  LETTER_TYPES,
  type LetterLocale,
  type LetterType,
} from '@/lib/letters/templates';

const DEFAULT_TEMPLATE_NAMES: Record<LetterType, Record<LetterLocale, string>> = {
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
};

/** English templates reuse Marathi HTML structure with English placeholder labels for now. */
const EN_TEMPLATE_HTML: Record<LetterType, string> = Object.fromEntries(
  LETTER_TYPES.map((type) => [type, MR_TEMPLATE_HTML[type]]),
) as Record<LetterType, string>;

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
  letterType: LetterType,
  letterLocale: LetterLocale,
): string {
  return DEFAULT_TEMPLATE_HTML[letterType][letterLocale];
}

export function getDefaultTemplateName(
  letterType: LetterType,
  letterLocale: LetterLocale,
): string {
  return DEFAULT_TEMPLATE_NAMES[letterType][letterLocale];
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

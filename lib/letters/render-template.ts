import type {
  DomicileLetterFields,
  FeesLetterFields,
  IncomeLetterFields,
  LetterLocale,
  LetterType,
  RationLetterFields,
} from '@/lib/letters/templates';

type LetterFields =
  | FeesLetterFields
  | RationLetterFields
  | IncomeLetterFields
  | DomicileLetterFields;

const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

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

  if (type === 'fees') {
    const feesFields = fields as FeesLetterFields;
    return {
      ...base,
      genderPossessive: feesFields.studentGender === 'female' ? 'her' : 'his',
      genderSuffix: feesFields.studentGender === 'female' ? 'हिला' : 'याला',
    };
  }

  if (type === 'ration') {
    const rationFields = fields as RationLetterFields;
    const familyMembers = rationFields.familyMembers.trim();
    const familyMembersBlock = familyMembers ? `\n${familyMembers}\n` : '\n';
    const purposeText =
      rationFields.purpose === 'new'
        ? locale === 'en'
          ? 'obtaining a new ration card in the names of their family members'
          : 'त्यांच्या कुटुंबियांच्या नावे नवीन शिधापत्रिका मिळणेकरिता'
        : locale === 'en'
          ? 'including the names of their family members in the ration card'
          : 'त्यांच्या कुटुंबियांची नावे शिधापत्रिकेमध्ये समाविष्ट करणेकरिता';

    return {
      ...base,
      familyMembersBlock,
      purposeText,
    };
  }

  return base;
}

export function buildRenderedLetterHtml(
  type: LetterType,
  templateHtml: string,
  fields: LetterFields,
  locale: LetterLocale,
): string {
  const renderFields = buildRenderFields(type, fields, locale);
  return renderLetterTemplate(templateHtml, renderFields);
}

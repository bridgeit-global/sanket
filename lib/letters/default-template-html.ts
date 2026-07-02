import type { LetterLocale, LetterType } from '@/lib/letters/templates';

const LETTER_BODY_STYLE =
  'white-space: pre-wrap; font-family: inherit; font-size: 15px; line-height: 1.75; color: #000; margin: 0;';

function wrapLetterHtml(content: string): string {
  return `<div class="letter-content" style="${LETTER_BODY_STYLE}">${content}</div>`;
}

const DEFAULT_TEMPLATE_HTML: Record<
  LetterType,
  Record<LetterLocale, string>
> = {
  fees: {
    en: wrapLetterHtml(`Ref. No. General/{{referenceNo}}                    Date: {{date}}

To,
The Principal / Head of Institution,
{{schoolName}}
{{schoolAddress}}

Subject: Request for fees concession for {{studentName}} studying in {{standard}}

Sir / Madam,

Through this letter, we request you to kindly grant a fees concession to {{studentName}}, who is studying in {{standard}} at your institution.

The financial condition of {{genderPossessive}} parents is extremely poor and they are currently unable to pay the full fees. We therefore humbly request you to kindly consider this sympathetically and grant full or partial fee concession, and also provide additional time and/or instalment facility for fee payment.

Kindly also permit the said student to attend school/college regularly so that {{genderPossessive}} education is not affected.

We expect you will consider this matter sympathetically and take a positive decision.

                                                                                           Yours faithfully,
                                                                                       ({{signatory}})`),
    mr: wrapLetterHtml(`संदर्भ क्र. सामान्य/{{referenceNo}}                    दि. {{date}}

प्रति,
मुख्याध्यापक / प्राचार्य,
{{schoolName}}
{{schoolAddress}}

विषय: {{standard}} मधील {{studentName}} याला शुल्क सवलतीसाठी विनंती

महोदय / महोदया,

सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, आपल्या शाळेत {{standard}} मध्ये शिकत असलेल्या {{studentName}} {{genderSuffix}} शुल्क सवलत मंजूर करावी.

त्याच्या पालकांची आर्थिक परिस्थिती अत्यंत हलाखीची असून सध्या संपूर्ण शुल्क भरणे त्यांना शक्य नाही. म्हणून, आपण कृपया सहानुभूतीपूर्वक विचार करून संपूर्ण किंवा अंशतः शुल्क द्यावी, तसेच शुल्क भरण्यासाठी थोडा अधिक कालावधी आणि/किंवा हप्त्यांमध्ये भरण्याची सुविधा उपलब्ध करून द्यावी, ही नम्र विनंती आहे.

तसेच, कृपया सदर विद्यार्थ्याला नियमित शाळेत/कॉलेजमध्ये हजर राहण्याची परवानगी द्यावी, जेणेकरून त्याच्या शिक्षणावर कोणताही परिणाम होणार नाही.

आपण या प्रकरणाचा सहानुभूतीपूर्वक विचार करून सकारात्मक निर्णय घ्याल, अशी अपेक्षा आहे.

                                                                                           आपली विश्वासू,
                                                                                       ({{signatory}})`),
  },
  ration: {
    en: wrapLetterHtml(`Ref. No. General/{{referenceNo}}                    Date: {{date}}

Along with this, {{salutation}} {{fullName}}, R/O {{address}}, is being sent to you for {{purposeText}}.
{{familyMembersBlock}}
You are requested to verify the documentary evidence available with {{salutation}} {{fullName}} and take appropriate action.

({{signatory}})

To, Rationing Officer, {{rationOfficeAddress}}`),
    mr: wrapLetterHtml(`संदर्भ क्र. सामान्य/{{referenceNo}}                    दि. {{date}}

सोबत आपणाकडे {{salutation}} {{fullName}} रा. {{address}} यांस {{purposeText}} आपणाकडे पाठवीत आहे.
{{familyMembersBlock}}
तरी {{salutation}} {{fullName}} यांच्याकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून इष्ट ती कार्यवाही गठीत करण्यात यावी.

({{signatory}})

प्रति, शिधावाटप अधिकारी, {{rationOfficeAddress}}`),
  },
  income: {
    en: wrapLetterHtml(`Ref. No. General/{{referenceNo}}                    Date: {{date}}

To,

{{salutation}} {{fullName}}, R/O {{address}}, resides at the above address. Their {{idType}} No. is {{idNumber}}. As per the information provided by them, their annual income is Rs. {{income}}/-.

This certificate is being issued as per their request.

({{signatory}})`),
    mr: wrapLetterHtml(`संदर्भ क्र. सामान्य/{{referenceNo}}                    दि. {{date}}

प्रति,

{{salutation}} {{fullName}} रा. {{address}} हे वरील पत्त्यावर वास्तव्य करीत आहेत. त्यांचा {{idType}} क्र. {{idNumber}} आहे, त्यांनी दिलेल्या माहितीनुसार त्यांचे वार्षिक उत्पन्न रु. {{income}}/- असल्याचे समजते.

सदरचा दाखला त्यांनी केलेल्या विनंतीनुसार देण्यात येत आहे.

({{signatory}})`),
  },
  domicile: {
    en: wrapLetterHtml(`Ref. No. General/{{referenceNo}}                    Date: {{date}}

To,

{{salutation}} {{fullName}}, R/O {{address}}, has been residing at the above address for a long period. Their {{idType}} No. is {{idNumber}}.

This domicile certificate is being issued as per their request.

({{signatory}})`),
    mr: wrapLetterHtml(`संदर्भ क्र. सामान्य/{{referenceNo}}                    दि. {{date}}

प्रति,

{{salutation}} {{fullName}} रा. {{address}} हे वरील दीर्घ काळापासून वास्तव्य करीत आहेत. त्यांचा {{idType}} क्र. {{idNumber}} आहे.

सदरचा अधिवास दाखला त्यांनी केलेल्या विनंतीनुसार देण्यात येत आहे.

({{signatory}})`),
  },
};

const DEFAULT_TEMPLATE_NAMES: Record<
  LetterType,
  Record<LetterLocale, string>
> = {
  fees: { en: 'Fees Concession Letter', mr: 'शुल्क सवलत पत्र' },
  ration: { en: 'Ration Card Letter', mr: 'शिधापत्रिका पत्र' },
  income: { en: 'Income Certificate Letter', mr: 'उत्पन्न दाखला पत्र' },
  domicile: { en: 'Domicile Certificate Letter', mr: 'अधिवास दाखला पत्र' },
};

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
  const letterTypes: LetterType[] = ['fees', 'ration', 'income', 'domicile'];
  const locales: LetterLocale[] = ['en', 'mr'];

  return letterTypes.flatMap((letterType) =>
    locales.map((letterLocale) => ({
      name: getDefaultTemplateName(letterType, letterLocale),
      letterType,
      letterLocale,
      templateHtml: getDefaultTemplateHtml(letterType, letterLocale),
    })),
  );
}

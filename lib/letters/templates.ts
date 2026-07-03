export type LetterType = 'fees' | 'ration' | 'income' | 'domicile';
export type LetterLocale = 'en' | 'mr';

export type RationLetterPurpose = 'new' | 'add-members';

export type CommonLetterFields = {
  referenceNo: string;
  date: string;
  signatory: string;
};

export type FeesLetterFields = CommonLetterFields & {
  schoolName: string;
  schoolAddress: string;
  standard: string;
  studentName: string;
  studentGender: 'male' | 'female';
};

export type RationLetterFields = CommonLetterFields & {
  salutation: string;
  fullName: string;
  address: string;
  purpose: RationLetterPurpose;
  familyMembers: string;
  rationOfficeAddress: string;
};

export type IncomeLetterFields = CommonLetterFields & {
  salutation: string;
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
  income: string;
};

export type DomicileLetterFields = CommonLetterFields & {
  salutation: string;
  fullName: string;
  address: string;
  idType: string;
  idNumber: string;
};

export const DEFAULT_SIGNATORY: Record<LetterLocale, string> = {
  mr: 'सना मलिक शेख',
  en: 'Sana Malik Shaikh',
};

export const DEFAULT_RATION_OFFICE_ADDRESS: Record<LetterLocale, string> = {
  mr: 'शिवाजीनगर ४४ ई कार्यालय, शिवाजीनगर, गोवंडी, मुंबई - ४०० ०४३',
  en: 'Shivajinagar 44-E Office, Shivajinagar, Govandi, Mumbai - 400 043',
};

function referenceLine(
  referenceNo: string,
  date: string,
  locale: LetterLocale,
): string {
  if (locale === 'en') {
    return `Ref. No. General/${referenceNo}                    Date: ${date}`;
  }
  return `संदर्भ क्र. सामान्य/${referenceNo}                    दि. ${date}`;
}

export function buildFeesLetterBody(
  fields: FeesLetterFields,
  locale: LetterLocale = 'mr',
): string {
  if (locale === 'en') {
    const possessive = fields.studentGender === 'female' ? 'her' : 'his';
    return [
      referenceLine(fields.referenceNo, fields.date, locale),
      '',
      'To,',
      'The Principal / Head of Institution,',
      fields.schoolName,
      fields.schoolAddress,
      '',
      `Subject: Request for fees concession for ${fields.studentName} studying in ${fields.standard}`,
      '',
      'Sir / Madam,',
      '',
      `Through this letter, we request you to kindly grant a fees concession to ${fields.studentName}, who is studying in ${fields.standard} at your institution.`,
      '',
      `The financial condition of ${possessive} parents is extremely poor and they are currently unable to pay the full fees. We therefore humbly request you to kindly consider this sympathetically and grant full or partial fee concession, and also provide additional time and/or instalment facility for fee payment.`,
      '',
      `Kindly also permit the said student to attend school/college regularly so that ${possessive} education is not affected.`,
      '',
      'We expect you will consider this matter sympathetically and take a positive decision.',
      '',
      '                                                                                           Yours faithfully,',
      `                                                                                       (${fields.signatory})`,
    ].join('\n');
  }

  const genderSuffix = fields.studentGender === 'female' ? 'हिला' : 'याला';
  return [
    referenceLine(fields.referenceNo, fields.date, locale),
    '',
    'प्रति,',
    'मुख्याध्यापक / प्राचार्य,',
    fields.schoolName,
    fields.schoolAddress,
    '',
    `विषय: ${fields.standard} मधील ${fields.studentName} याला शुल्क सवलतीसाठी विनंती`,
    '',
    'महोदय / महोदया,',
    '',
    `सदर पत्राद्वारे आपणास विनंती करण्यात येत आहे की, आपल्या शाळेत ${fields.standard} मध्ये शिकत असलेल्या ${fields.studentName} ${genderSuffix} शुल्क सवलत मंजूर करावी.`,
    '',
    'त्याच्या पालकांची आर्थिक परिस्थिती अत्यंत हलाखीची असून सध्या संपूर्ण शुल्क भरणे त्यांना शक्य नाही. म्हणून, आपण कृपया सहानुभूतीपूर्वक विचार करून संपूर्ण किंवा अंशतः शुल्क द्यावी, तसेच शुल्क भरण्यासाठी थोडा अधिक कालावधी आणि/किंवा हप्त्यांमध्ये भरण्याची सुविधा उपलब्ध करून द्यावी, ही नम्र विनंती आहे.',
    '',
    'तसेच, कृपया सदर विद्यार्थ्याला नियमित शाळेत/कॉलेजमध्ये हजर राहण्याची परवानगी द्यावी, जेणेकरून त्याच्या शिक्षणावर कोणताही परिणाम होणार नाही.',
    '',
    'आपण या प्रकरणाचा सहानुभूतीपूर्वक विचार करून सकारात्मक निर्णय घ्याल, अशी अपेक्षा आहे.',
    '',
    '                                                                                           आपली विश्वासू,',
    `                                                                                       (${fields.signatory})`,
  ].join('\n');
}

export function buildRationLetterBody(
  fields: RationLetterFields,
  locale: LetterLocale = 'mr',
): string {
  const familyBlock = fields.familyMembers.trim()
    ? `\n${fields.familyMembers.trim()}\n`
    : '\n';

  if (locale === 'en') {
    const purposeText =
      fields.purpose === 'new'
        ? 'obtaining a new ration card in the names of their family members'
        : 'including the names of their family members in the ration card';

    return [
      referenceLine(fields.referenceNo, fields.date, locale),
      '',
      `Along with this, ${fields.salutation} ${fields.fullName}, R/O ${fields.address}, is being sent to you for ${purposeText}.`,
      familyBlock,
      `You are requested to verify the documentary evidence available with ${fields.salutation} ${fields.fullName} and take appropriate action.`,
      '',
      `(${fields.signatory})`,
      '',
      `To, Rationing Officer, ${fields.rationOfficeAddress}`,
    ].join('\n');
  }

  const purposeText =
    fields.purpose === 'new'
      ? 'त्यांच्या कुटुंबियांच्या नावे नवीन शिधापत्रिका मिळणेकरिता'
      : 'त्यांच्या कुटुंबियांची नावे शिधापत्रिकेमध्ये समाविष्ट करणेकरिता';

  return [
    referenceLine(fields.referenceNo, fields.date, locale),
    '',
    `सोबत आपणाकडे ${fields.salutation} ${fields.fullName} रा. ${fields.address} यांस ${purposeText} आपणाकडे पाठवीत आहे.`,
    familyBlock,
    `तरी ${fields.salutation} ${fields.fullName} यांच्याकडे असलेल्या पुरावादर्शक कागदपत्रांची पडताळणी करून इष्ट ती कार्यवाही गठीत करण्यात यावी.`,
    '',
    `(${fields.signatory})`,
    '',
    `प्रति, शिधावाटप अधिकारी, ${fields.rationOfficeAddress}`,
  ].join('\n');
}

export function buildIncomeLetterBody(
  fields: IncomeLetterFields,
  locale: LetterLocale = 'mr',
): string {
  if (locale === 'en') {
    return [
      referenceLine(fields.referenceNo, fields.date, locale),
      '',
      'To,',
      '',
      `${fields.salutation} ${fields.fullName}, R/O ${fields.address}, resides at the above address. Their ${fields.idType} No. is ${fields.idNumber}. As per the information provided by them, their annual income is Rs. ${fields.income}/-.`,
      '',
      'This certificate is being issued as per their request.',
      '',
      `(${fields.signatory})`,
    ].join('\n');
  }

  return [
    referenceLine(fields.referenceNo, fields.date, locale),
    '',
    'प्रति,',
    '',
    `${fields.salutation} ${fields.fullName} रा. ${fields.address} हे वरील पत्त्यावर वास्तव्य करीत आहेत. त्यांचा ${fields.idType} क्र. ${fields.idNumber} आहे, त्यांनी दिलेल्या माहितीनुसार त्यांचे वार्षिक उत्पन्न रु. ${fields.income}/- असल्याचे समजते.`,
    '',
    'सदरचा दाखला त्यांनी केलेल्या विनंतीनुसार देण्यात येत आहे.',
    '',
    `(${fields.signatory})`,
  ].join('\n');
}

export function buildDomicileLetterBody(
  fields: DomicileLetterFields,
  locale: LetterLocale = 'mr',
): string {
  if (locale === 'en') {
    return [
      referenceLine(fields.referenceNo, fields.date, locale),
      '',
      'To,',
      '',
      `${fields.salutation} ${fields.fullName}, R/O ${fields.address}, has been residing at the above address for a long period. Their ${fields.idType} No. is ${fields.idNumber}.`,
      '',
      'This domicile certificate is being issued as per their request.',
      '',
      `(${fields.signatory})`,
    ].join('\n');
  }

  return [
    referenceLine(fields.referenceNo, fields.date, locale),
    '',
    'प्रति,',
    '',
    `${fields.salutation} ${fields.fullName} रा. ${fields.address} हे वरील दीर्घ काळापासून वास्तव्य करीत आहेत. त्यांचा ${fields.idType} क्र. ${fields.idNumber} आहे.`,
    '',
    'सदरचा अधिवास दाखला त्यांनी केलेल्या विनंतीनुसार देण्यात येत आहे.',
    '',
    `(${fields.signatory})`,
  ].join('\n');
}

export function buildLetterBody(
  type: LetterType,
  fields:
    | FeesLetterFields
    | RationLetterFields
    | IncomeLetterFields
    | DomicileLetterFields,
  locale: LetterLocale = 'mr',
): string {
  switch (type) {
    case 'fees':
      return buildFeesLetterBody(fields as FeesLetterFields, locale);
    case 'ration':
      return buildRationLetterBody(fields as RationLetterFields, locale);
    case 'income':
      return buildIncomeLetterBody(fields as IncomeLetterFields, locale);
    case 'domicile':
      return buildDomicileLetterBody(fields as DomicileLetterFields, locale);
    default:
      return '';
  }
}

export type LetterType = 'fees' | 'ration' | 'income' | 'domicile';

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

export const DEFAULT_SIGNATORY = 'सना मलिक शेख';
export const DEFAULT_RATION_OFFICE_ADDRESS =
  'शिवाजीनगर ४४ ई कार्यालय, शिवाजीनगर, गोवंडी, मुंबई - ४०० ०४३';

function referenceLine(referenceNo: string, date: string): string {
  return `संदर्भ क्र. सामान्य/${referenceNo}                    दि. ${date}`;
}

export function buildFeesLetterBody(fields: FeesLetterFields): string {
  const genderSuffix = fields.studentGender === 'female' ? 'हिला' : 'याला';
  return [
    referenceLine(fields.referenceNo, fields.date),
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

export function buildRationLetterBody(fields: RationLetterFields): string {
  const purposeText =
    fields.purpose === 'new'
      ? 'त्यांच्या कुटुंबियांच्या नावे नवीन शिधापत्रिका मिळणेकरिता'
      : 'त्यांच्या कुटुंबियांची नावे शिधापत्रिकेमध्ये समाविष्ट करणेकरिता';

  const familyBlock = fields.familyMembers.trim()
    ? `\n${fields.familyMembers.trim()}\n`
    : '\n';

  return [
    referenceLine(fields.referenceNo, fields.date),
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

export function buildIncomeLetterBody(fields: IncomeLetterFields): string {
  return [
    referenceLine(fields.referenceNo, fields.date),
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

export function buildDomicileLetterBody(fields: DomicileLetterFields): string {
  return [
    referenceLine(fields.referenceNo, fields.date),
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
): string {
  switch (type) {
    case 'fees':
      return buildFeesLetterBody(fields as FeesLetterFields);
    case 'ration':
      return buildRationLetterBody(fields as RationLetterFields);
    case 'income':
      return buildIncomeLetterBody(fields as IncomeLetterFields);
    case 'domicile':
      return buildDomicileLetterBody(fields as DomicileLetterFields);
    default:
      return '';
  }
}

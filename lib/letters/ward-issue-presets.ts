import {
  isWardIssueType,
  type LetterLocale,
  type WardIssueType,
  WARD_ISSUE_TYPES,
} from '@/lib/letters/templates';
import {
  WARD_OFFICER_ADDRESS_NAMES,
  type WardOfficerKey,
} from '@/lib/letters/default-addresses';

const BMC_M_EAST_OFFICE = {
  mr: `बृहन्मुंबई महानगरपालिका,
एम/पूर्व प्रभाग कार्यालय इमारत,
स्व. मधुकर तुकाराम कदम मार्ग,
गोवंडी (पश्चिम), मुंबई - ४०० ०४३.`,
  en: `Brihanmumbai Municipal Corporation,
M/East Ward Office Building,
Late Madhukar Tukaram Kadam Marg,
Govandi (West), Mumbai - 400 043.`,
} as const;

const WARD_ISSUE_OFFICER_KEY: Record<WardIssueType, WardOfficerKey> = {
  garbage: 'swm',
  drain: 'swm',
  'tree-trim': 'garden',
  'tree-dead': 'garden',
  'tree-hazard': 'garden',
  'water-contaminated': 'water',
  'water-low-pressure': 'water',
  'water-none': 'water',
  'water-tanker': 'water',
  'road-repair': 'maintenance',
  'footpath-repair': 'maintenance',
  'street-lights': 'maintenance',
  'speed-breaker': 'maintenance',
};

export function getWardIssueOfficerKey(issueType: WardIssueType): WardOfficerKey {
  return WARD_ISSUE_OFFICER_KEY[issueType];
}

export function getWardIssueOfficerSeedName(issueType: WardIssueType): string {
  return WARD_OFFICER_ADDRESS_NAMES[getWardIssueOfficerKey(issueType)];
}

function officerName(locale: LetterLocale, key: WardOfficerKey): string {
  if (locale === 'en') return WARD_OFFICER_ADDRESS_NAMES[key];
  switch (key) {
    case 'swm':
      return 'सहाय्यक अभियंता (घ. क. व्य.) एम/पूर्व प्रभाग';
    case 'garden':
      return 'सहाय्यक उद्यान अधीक्षक - एम/पूर्व प्रभाग';
    case 'water':
      return 'सहाय्यक अभियंता (जलकामे)';
    case 'maintenance':
      return 'मा. सहाय्यक अभियंता (परिरक्षण)';
  }
}

function buildDefaultTo(locale: LetterLocale, key: WardOfficerKey): string {
  return `${officerName(locale, key)},
${BMC_M_EAST_OFFICE[locale]}`;
}

function swmAeTo(locale: LetterLocale): string {
  return buildDefaultTo(locale, 'swm');
}

function gardenTo(locale: LetterLocale): string {
  return buildDefaultTo(locale, 'garden');
}

function waterTo(locale: LetterLocale): string {
  return buildDefaultTo(locale, 'water');
}

function maintenanceTo(locale: LetterLocale): string {
  return buildDefaultTo(locale, 'maintenance');
}

export type WardIssuePreset = {
  labelEn: string;
  labelMr: string;
  /** ServiceCatalog display name (English). */
  catalogName: string;
  requiresDuration: boolean;
  defaultTo: Record<LetterLocale, string>;
  subject: Record<LetterLocale, string>;
  paragraphs: Record<LetterLocale, string[]>;
};

/**
 * Tokens in subject/paragraphs:
 * `{{location}}`, `{{complainantName}}`, `{{contactNo}}`, `{{duration}}`
 */
export const WARD_ISSUE_PRESETS: Record<WardIssueType, WardIssuePreset> = {
  garbage: {
    labelEn: 'Garbage removal',
    labelMr: 'साचलेला कचरा हटविणे',
    catalogName: 'BMC – Garbage Removal',
    requiresDuration: false,
    defaultTo: { mr: swmAeTo('mr'), en: swmAeTo('en') },
    subject: {
      mr: '{{location}} येथे साचलेला कचरा तातडीने हटविण्याबाबत.',
      en: 'Regarding urgent removal of accumulated garbage at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे मोठ्या प्रमाणात कचरा साचल्याबाबत तक्रार प्राप्त झाली आहे. सदर कचऱ्यामुळे परिसरात दुर्गंधी, अस्वच्छता तसेच नागरिकांच्या आरोग्यास धोका निर्माण होत आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी तातडीने पाठवून साचलेला कचरा पूर्णपणे हटवावा तसेच परिसराची स्वच्छता व निर्जंतुकीकरण करण्यात यावे.',
        'संबंधित अधिकाऱ्यांनी वरील संपर्क क्रमांकावर तक्रारदाराशी समन्वय साधून अचूक ठिकाणाची पाहणी करावी व आवश्यक कार्यवाही करावी.',
        'केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, regarding large-scale accumulation of garbage at {{location}}. The said garbage is causing foul smell, uncleanliness, and a risk to public health in the area.',
        'Therefore, concerned officers and staff should be sent to the said location immediately to remove the accumulated garbage completely and to clean and disinfect the premises.',
        'The concerned officers should coordinate with the complainant on the above contact number, inspect the exact location, and take necessary action.',
        'A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  drain: {
    labelEn: 'Drain / gutter cleaning',
    labelMr: 'नाले/गटार साफसफाई',
    catalogName: 'BMC – Drain / Gutter Cleaning',
    requiresDuration: false,
    defaultTo: { mr: swmAeTo('mr'), en: swmAeTo('en') },
    subject: {
      mr: '{{location}} येथील नाले/गटारांची साफसफाई करून गाळ व कचरा काढण्याबाबत.',
      en: 'Regarding cleaning of drains/gutters and removal of silt and garbage at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील नाले/गटारांमध्ये गाळ व कचरा साचल्याने पाण्याचा सुरळीत निचरा होत नसल्याबाबत तक्रार प्राप्त झाली आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी तातडीने पाठवून नाले/गटारांची साफसफाई करावी तसेच साचलेला गाळ व कचरा काढून पाण्याचा सुरळीत निचरा सुनिश्चित करावा.',
        'संबंधित अधिकाऱ्यांनी वरील संपर्क क्रमांकावर तक्रारदाराशी समन्वय साधून अचूक ठिकाणाची पाहणी करावी व आवश्यक कार्यवाही करावी.',
        'केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that silt and garbage have accumulated in the drains/gutters at {{location}}, obstructing the free flow of water.',
        'Therefore, concerned officers and staff should be sent to the said location immediately to clean the drains/gutters, remove the accumulated silt and garbage, and ensure free drainage of water.',
        'The concerned officers should coordinate with the complainant on the above contact number, inspect the exact location, and take necessary action.',
        'A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'tree-trim': {
    labelEn: 'Tree branch trimming',
    labelMr: 'झाडांच्या फांद्यांची छाटणी',
    catalogName: 'BMC – Tree Branch Trimming',
    requiresDuration: false,
    defaultTo: { mr: gardenTo('mr'), en: gardenTo('en') },
    subject: {
      mr: '{{location}} येथील झाडांच्या वाढलेल्या व धोकादायक फांद्यांची छाटणी करण्याबाबत.',
      en: 'Regarding trimming of overgrown and hazardous tree branches at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील झाडांच्या फांद्या मोठ्या प्रमाणात वाढल्याने तसेच काही फांद्या धोकादायक स्थितीत असल्याने नागरिक, वाहने, विद्युत वाहिन्या व आसपासच्या मालमत्तेस धोका निर्माण झाल्याबाबत तक्रार प्राप्त झाली आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी पाठवून झाडांची पाहणी करावी आणि आवश्यक परवानगी व सुरक्षिततेच्या उपाययोजनांसह वाढलेल्या व धोकादायक फांद्यांची तातडीने छाटणी करावी.',
        'संबंधित अधिकाऱ्यांनी वरील संपर्क क्रमांकावर तक्रारदाराशी समन्वय साधून अचूक ठिकाणाची पाहणी करावी व आवश्यक कार्यवाही करावी.',
        'केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that tree branches at {{location}} have grown extensively and some are in a hazardous condition, posing a risk to citizens, vehicles, electric lines, and nearby property.',
        'Therefore, concerned officers and staff should be sent to inspect the trees and, with necessary permissions and safety measures, urgently trim the overgrown and hazardous branches.',
        'The concerned officers should coordinate with the complainant on the above contact number, inspect the exact location, and take necessary action.',
        'A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'tree-dead': {
    labelEn: 'Dead / hazardous tree removal',
    labelMr: 'मृत व धोकादायक झाडे हटविणे',
    catalogName: 'BMC – Dead / Hazardous Tree Removal',
    requiresDuration: false,
    defaultTo: { mr: gardenTo('mr'), en: gardenTo('en') },
    subject: {
      mr: '{{location}} येथील मृत व धोकादायक झाडे हटविण्याबाबत.',
      en: 'Regarding removal of dead and hazardous trees at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील काही झाडे पूर्णपणे वाळलेली अथवा मृत अवस्थेत असून ती कोणत्याही वेळी कोसळण्याची शक्यता असल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे नागरिक, वाहने, इमारती, विद्युत वाहिन्या तसेच आसपासच्या मालमत्तेस धोका निर्माण झाला आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी पाठवून झाडांची तातडीने पाहणी करावी आणि आवश्यक परवानगी व सुरक्षिततेच्या उपाययोजनांसह मृत व धोकादायक झाडे त्वरित हटविण्याची कार्यवाही करावी.',
        'संबंधित अधिकाऱ्यांनी वरील संपर्क क्रमांकावर तक्रारदाराशी समन्वय साधून अचूक ठिकाणाची पाहणी करावी व आवश्यक कार्यवाही करावी.',
        'केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that some trees at {{location}} are completely dried or dead and may fall at any time. This poses a risk to citizens, vehicles, buildings, electric lines, and nearby property.',
        'Therefore, concerned officers and staff should be sent for urgent inspection and, with necessary permissions and safety measures, take immediate action to remove the dead and hazardous trees.',
        'The concerned officers should coordinate with the complainant on the above contact number, inspect the exact location, and take necessary action.',
        'A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'tree-hazard': {
    labelEn: 'Hazardous tree inspection',
    labelMr: 'धोकादायक झाडाची पाहणी',
    catalogName: 'BMC – Hazardous Tree Inspection',
    requiresDuration: false,
    defaultTo: { mr: gardenTo('mr'), en: gardenTo('en') },
    subject: {
      mr: '{{location}} येथील धोकादायक झाडाची पाहणी करून आवश्यक कार्यवाही करण्याबाबत.',
      en: 'Regarding inspection of a hazardous tree at {{location}} and necessary action.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील झाड झुकलेल्या अथवा कमकुवत अवस्थेत असून ते कोसळण्याची शक्यता असल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे नागरिक, पादचारी, वाहने, इमारती, विद्युत वाहिन्या तसेच आसपासच्या मालमत्तेस धोका निर्माण झाला आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी तातडीने पाठवून झाडाची पाहणी करावी आणि वृक्ष तज्ज्ञांच्या अभिप्रायानुसार आवश्यक परवानगी व सुरक्षिततेच्या उपाययोजनांसह छाटणी, आधार देणे अथवा झाड हटविण्याची योग्य कार्यवाही करावी.',
        'संबंधित अधिकाऱ्यांनी वरील संपर्क क्रमांकावर तक्रारदाराशी समन्वय साधून अचूक ठिकाणाची पाहणी करावी व आवश्यक कार्यवाही करावी.',
        'केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that a tree at {{location}} is leaning or weakened and may collapse. This poses a risk to citizens, pedestrians, vehicles, buildings, electric lines, and nearby property.',
        'Therefore, concerned officers and staff should be sent immediately to inspect the tree and, as per tree experts’ advice and with necessary permissions and safety measures, take appropriate action such as trimming, propping, or removing the tree.',
        'The concerned officers should coordinate with the complainant on the above contact number, inspect the exact location, and take necessary action.',
        'A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'water-contaminated': {
    labelEn: 'Contaminated water supply',
    labelMr: 'दूषित पाणीपुरवठा',
    catalogName: 'BMC – Contaminated Water Supply',
    requiresDuration: false,
    defaultTo: { mr: waterTo('mr'), en: waterTo('en') },
    subject: {
      mr: '{{location}} येथे दूषित पाणीपुरवठा होत असल्याबाबत.',
      en: 'Regarding contaminated water supply at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे गढूळ, दुर्गंधीयुक्त अथवा दूषित पाणीपुरवठा होत असल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे परिसरातील नागरिकांच्या आरोग्यास धोका निर्माण होण्याची शक्यता आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी तातडीने पाठवून पाणीपुरवठा व्यवस्था व जलवाहिन्यांची पाहणी करावी. पाण्याचे नमुने तपासणीसाठी घेऊन दूषित पाणीपुरवठ्याचे कारण शोधावे तसेच आवश्यक दुरुस्ती, जलवाहिनीचे फ्लशिंग व इतर उपाययोजना करून स्वच्छ व सुरक्षित पाणीपुरवठा सुनिश्चित करावा.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, regarding muddy, foul-smelling, or contaminated water supply at {{location}}. This may pose a risk to the health of residents in the area.',
        'Therefore, concerned officers and staff should be sent immediately to inspect the water supply system and pipelines. Water samples should be collected for testing, the cause of contamination identified, and necessary repairs, pipeline flushing, and other measures taken to ensure clean and safe water supply.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the exact location. A report of the action taken should be submitted to my office.',
      ],
    },
  },
  'water-low-pressure': {
    labelEn: 'Low water pressure',
    labelMr: 'कमी दाबाने पाणीपुरवठा',
    catalogName: 'BMC – Low Water Pressure',
    requiresDuration: false,
    defaultTo: { mr: waterTo('mr'), en: waterTo('en') },
    subject: {
      mr: '{{location}} येथे कमी दाबाने पाणीपुरवठा होत असल्याबाबत.',
      en: 'Regarding low water pressure supply at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे अत्यंत कमी दाबाने पाणीपुरवठा होत असल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे परिसरातील नागरिकांना पिण्यासाठी व दैनंदिन वापरासाठी आवश्यक पाणी मिळण्यात अडचणी येत आहेत.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी पाठवून पाण्याचा दाब तपासावा. जलवाहिनीतील गळती, अडथळे, झडपांची स्थिती तसेच पाणी वितरण व्यवस्थेची पाहणी करून आवश्यक सुधारात्मक कार्यवाही करावी आणि पुरेशा दाबाने नियमित पाणीपुरवठा सुनिश्चित करावा.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, regarding extremely low water pressure at {{location}}. As a result, residents are facing difficulty in obtaining water for drinking and daily use.',
        'Therefore, concerned officers and staff should be sent to check the water pressure. Leakages, blockages, valve condition, and the distribution system should be inspected, and necessary corrective action taken to ensure regular water supply at adequate pressure.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the exact location. A report of the action taken should be submitted to my office.',
      ],
    },
  },
  'water-none': {
    labelEn: 'No water supply',
    labelMr: 'पाणीपुरवठा होत नसणे',
    catalogName: 'BMC – No Water Supply',
    requiresDuration: true,
    defaultTo: { mr: waterTo('mr'), en: waterTo('en') },
    subject: {
      mr: '{{location}} येथे पाणीपुरवठा होत नसल्याबाबत.',
      en: 'Regarding absence of water supply at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे मागील {{duration}} पासून पाणीपुरवठा होत नसल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे परिसरातील नागरिकांना पिण्यासाठी व दैनंदिन वापरासाठी आवश्यक पाण्याच्या टंचाईचा सामना करावा लागत आहे.',
        'तरी संबंधित अधिकारी व कर्मचाऱ्यांना सदर ठिकाणी तातडीने पाठवून जलवाहिनी, झडपा, पाणी जोडणी व वितरण व्यवस्थेची पाहणी करावी. पाणीपुरवठा बंद असण्याचे कारण शोधून आवश्यक दुरुस्ती करावी तसेच नियमित पाणीपुरवठा तातडीने पूर्ववत करावा.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that there has been no water supply at {{location}} for the past {{duration}}. As a result, residents are facing a shortage of water for drinking and daily use.',
        'Therefore, concerned officers and staff should be sent immediately to inspect the pipeline, valves, water connection, and distribution system. The cause of the supply interruption should be identified, necessary repairs carried out, and regular water supply restored urgently.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the exact location. A report of the action taken should be submitted to my office.',
      ],
    },
  },
  'water-tanker': {
    labelEn: 'Tanker water supply',
    labelMr: 'टँकरद्वारे पाणीपुरवठा',
    catalogName: 'BMC – Tanker Water Supply',
    requiresDuration: false,
    defaultTo: { mr: waterTo('mr'), en: waterTo('en') },
    subject: {
      mr: '{{location}} येथे टँकरद्वारे तात्पुरता पाणीपुरवठा करण्याबाबत.',
      en: 'Regarding temporary tanker water supply at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे पाणीपुरवठा होत नसल्याने अथवा अपुरा पाणीपुरवठा होत असल्याने परिसरातील नागरिकांना पाण्याची तीव्र टंचाई भासत असल्याबाबत विनंती प्राप्त झाली आहे.',
        'तरी नियमित पाणीपुरवठ्याची समस्या निकाली निघेपर्यंत नागरिकांची गैरसोय टाळण्यासाठी आवश्यकतेनुसार महानगरपालिकेच्या टँकरद्वारे स्वच्छ व सुरक्षित पाण्याचा तात्पुरता पुरवठा करण्यात यावा. तसेच नियमित पाणीपुरवठा पूर्ववत करण्यासाठी पाणी वितरण व्यवस्थेची तातडीने पाहणी करून आवश्यक कार्यवाही करावी.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून टँकरसाठी योग्य ठिकाण, वेळ व आवश्यक पाण्याचे प्रमाण निश्चित करावे. केलेल्या कार्यवाहीचा अहवाल माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A request has been received from {{complainantName}}, contact no. {{contactNo}}, that due to no water supply or inadequate water supply at {{location}}, residents are facing an acute water shortage.',
        'Therefore, until the regular water supply issue is resolved, temporary supply of clean and safe water through municipal tankers should be arranged as required to avoid inconvenience to citizens. The water distribution system should also be inspected urgently and necessary action taken to restore regular supply.',
        'The concerned officers should coordinate with the complainant on the above contact number and finalize the suitable location, time, and required quantity of water for the tanker. A report of the action taken should be submitted to my office.',
      ],
    },
  },
  'road-repair': {
    labelEn: 'Road repair',
    labelMr: 'रस्त्याची दुरुस्ती',
    catalogName: 'BMC – Road Repair',
    requiresDuration: false,
    defaultTo: { mr: maintenanceTo('mr'), en: maintenanceTo('en') },
    subject: {
      mr: '{{location}} येथील खराब झालेल्या रस्त्याची दुरुस्ती करण्याबाबत.',
      en: 'Regarding repair of the damaged road at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील रस्ता खराब झाला असून रस्त्यावर खड्डे, उखडलेला पृष्ठभाग तसेच असमतोल निर्माण झाल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे नागरिक व वाहनचालकांना गैरसोय होत असून अपघाताचा धोका निर्माण झाला आहे.',
        'तरी संबंधित अधिकाऱ्यांनी सदर ठिकाणाची तातडीने पाहणी करून आवश्यकतेनुसार खड्डे बुजविणे, रस्त्याचे पॅचवर्क अथवा आवश्यक दुरुस्तीची कार्यवाही करावी आणि रस्ता सुरक्षित व वाहतुकीस योग्य करण्यात यावा.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that the road at {{location}} is damaged, with potholes, an uneven surface, and imbalance. This is causing inconvenience to citizens and drivers and has created a risk of accidents.',
        'Therefore, the concerned officers should urgently inspect the location and, as required, carry out pothole filling, road patchwork, or necessary repairs to make the road safe and fit for traffic.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the exact location. A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'footpath-repair': {
    labelEn: 'Footpath repair',
    labelMr: 'पदपथाची दुरुस्ती',
    catalogName: 'BMC – Footpath Repair',
    requiresDuration: false,
    defaultTo: { mr: maintenanceTo('mr'), en: maintenanceTo('en') },
    subject: {
      mr: '{{location}} येथील खराब झालेल्या पदपथाची दुरुस्ती करण्याबाबत.',
      en: 'Regarding repair of the damaged footpath at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील पदपथावरील पेव्हर ब्लॉक/लाद्या तुटलेल्या अथवा उखडलेल्या असून पदपथ असमतोल व धोकादायक झाल्याबाबत तक्रार प्राप्त झाली आहे. त्यामुळे पादचारी, ज्येष्ठ नागरिक, दिव्यांग व्यक्ती व विद्यार्थ्यांना ये-जा करताना अडचणींचा सामना करावा लागत आहे.',
        'तरी संबंधित अधिकाऱ्यांनी सदर ठिकाणाची तातडीने पाहणी करून तुटलेले अथवा उखडलेले पेव्हर ब्लॉक/लाद्या बदलणे, पदपथ समतल करणे तसेच आवश्यक दुरुस्तीची कार्यवाही करावी आणि पदपथ पादचाऱ्यांच्या सुरक्षित वापरासाठी योग्य करण्यात यावा.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that paver blocks/slabs on the footpath at {{location}} are broken or uprooted, making the footpath uneven and hazardous. Pedestrians, senior citizens, persons with disabilities, and students are facing difficulties while commuting.',
        'Therefore, the concerned officers should urgently inspect the location, replace broken or uprooted paver blocks/slabs, level the footpath, and carry out necessary repairs to make it safe for pedestrian use.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the exact location. A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'street-lights': {
    labelEn: 'Street light repair',
    labelMr: 'बंद पथदिवे सुरू करणे',
    catalogName: 'BMC – Street Light Repair',
    requiresDuration: true,
    defaultTo: { mr: maintenanceTo('mr'), en: maintenanceTo('en') },
    subject: {
      mr: '{{location}} येथील बंद असलेले पथदिवे दुरुस्त करून सुरू करण्याबाबत.',
      en: 'Regarding repair and restoration of non-working street lights at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथील पथदिवे मागील {{duration}} पासून बंद असल्याबाबत तक्रार प्राप्त झाली आहे. रात्रीच्या वेळी परिसरात अंधार राहत असल्याने पादचारी व वाहनचालकांना अडचण निर्माण होत असून अपघात तसेच सुरक्षाविषयक घटनांचा धोका वाढला आहे.',
        'तरी संबंधित अधिकारी अथवा पथदिवे देखभाल करणाऱ्या यंत्रणेमार्फत सदर ठिकाणाची तातडीने पाहणी करून बंद पथदिवे, विद्युत जोडणी, केबल, दिवे अथवा संबंधित उपकरणांची आवश्यक दुरुस्ती करावी आणि पथदिवे त्वरित कार्यान्वित करावेत.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून अचूक ठिकाण व बंद असलेल्या पथदिव्यांची ओळख निश्चित करावी. केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A complaint has been received from {{complainantName}}, contact no. {{contactNo}}, that street lights at {{location}} have been non-functional for the past {{duration}}. Darkness in the area at night is causing inconvenience to pedestrians and drivers and has increased the risk of accidents and security incidents.',
        'Therefore, the concerned officers or the street-light maintenance agency should urgently inspect the location, carry out necessary repairs to non-working lights, electrical connections, cables, lamps, or related equipment, and restore the street lights immediately.',
        'The concerned officers should coordinate with the complainant on the above contact number and identify the exact location and non-working street lights. A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
  'speed-breaker': {
    labelEn: 'Speed breaker installation',
    labelMr: 'गतिरोधक बसविणे',
    catalogName: 'BMC – Speed Breaker Installation',
    requiresDuration: false,
    defaultTo: { mr: maintenanceTo('mr'), en: maintenanceTo('en') },
    subject: {
      mr: '{{location}} येथे गतिरोधक बसविण्याबाबत.',
      en: 'Regarding installation of a speed breaker at {{location}}.',
    },
    paragraphs: {
      mr: [
        '{{complainantName}}, संपर्क क्र. {{contactNo}} यांच्याकडून {{location}} येथे वाहने भरधाव वेगाने ये-जा करीत असल्याने पादचारी व स्थानिक नागरिकांच्या सुरक्षिततेस धोका निर्माण होत असल्याबाबत निवेदन प्राप्त झाले आहे. सदर ठिकाणी यापूर्वी अपघात अथवा अपघातसदृश घटना घडल्याचेही निदर्शनास आणून देण्यात आले आहे.',
        'तरी संबंधित अधिकाऱ्यांनी सदर ठिकाणाची तातडीने पाहणी करावी. रस्त्याची रुंदी, वाहतुकीची स्थिती, पादचाऱ्यांची वर्दळ तसेच शाळा, धार्मिक स्थळ, बाजारपेठ अथवा निवासी परिसराची निकटता विचारात घेऊन तांत्रिक निकष व आवश्यक परवानगीनुसार गतिरोधक बसविण्याची कार्यवाही करण्यात यावी.',
        'गतिरोधक बसविताना त्यावर आवश्यक पांढरे पट्टे, रिफ्लेक्टर तसेच पूर्वसूचना देणारे वाहतूक चिन्ह लावण्यात यावे.',
        'संबंधित अधिकाऱ्यांनी तक्रारदाराशी वरील संपर्क क्रमांकावर समन्वय साधून प्रस्तावित ठिकाणाची पाहणी करावी. केलेल्या कार्यवाहीचा अहवाल छायाचित्रांसह माझ्या कार्यालयास कळविण्यात यावा.',
      ],
      en: [
        'A representation has been received from {{complainantName}}, contact no. {{contactNo}}, that vehicles are moving at high speed at {{location}}, posing a risk to the safety of pedestrians and local residents. It has also been pointed out that accidents or accident-like incidents have occurred at this location earlier.',
        'Therefore, the concerned officers should urgently inspect the location. Considering road width, traffic conditions, pedestrian movement, and proximity to schools, religious places, markets, or residential areas, action should be taken to install a speed breaker as per technical norms and required permissions.',
        'While installing the speed breaker, necessary white stripes, reflectors, and advance warning traffic signs should be provided.',
        'The concerned officers should coordinate with the complainant on the above contact number and inspect the proposed location. A report of the action taken, along with photographs, should be submitted to my office.',
      ],
    },
  },
};

const TOKEN_PATTERN = /\{\{(location|complainantName|contactNo|duration)\}\}/g;

export type WardIssueFieldValues = {
  location: string;
  complainantName: string;
  contactNo: string;
  duration: string;
};

function substituteTokens(template: string, values: WardIssueFieldValues): string {
  return template.replace(TOKEN_PATTERN, (_, key: keyof WardIssueFieldValues) => {
    return values[key] ?? '';
  });
}

export function getWardIssuePreset(issueType: WardIssueType): WardIssuePreset {
  return WARD_ISSUE_PRESETS[issueType];
}

export function getDefaultWardIssueType(): WardIssueType {
  return 'garbage';
}

export function resolveWardIssueType(value: unknown): WardIssueType {
  return isWardIssueType(value) ? value : getDefaultWardIssueType();
}

export function wardIssueRequiresDuration(issueType: WardIssueType): boolean {
  return WARD_ISSUE_PRESETS[issueType].requiresDuration;
}

export function getWardIssueLabel(
  issueType: WardIssueType,
  locale: LetterLocale,
): string {
  const preset = WARD_ISSUE_PRESETS[issueType];
  return locale === 'mr' ? preset.labelMr : preset.labelEn;
}

export function getWardIssueOptions(locale: LetterLocale): Array<{
  value: WardIssueType;
  label: string;
}> {
  return WARD_ISSUE_TYPES.map((value) => ({
    value,
    label: getWardIssueLabel(value, locale),
  }));
}

export function getDefaultWardToAddress(
  issueType: WardIssueType,
  locale: LetterLocale,
): string {
  return WARD_ISSUE_PRESETS[issueType].defaultTo[locale];
}

export function getDefaultWardToName(
  issueType: WardIssueType,
  locale: LetterLocale,
): string {
  return officerName(locale, getWardIssueOfficerKey(issueType));
}

export function getWardIssueCatalogName(issueType: WardIssueType): string {
  return WARD_ISSUE_PRESETS[issueType].catalogName;
}

/** All ward issue types as ServiceCatalog seed rows (specific ward-* letter types). */
export function getWardServiceCatalogSeedEntries(startSortOrder = 91): Array<{
  category: string;
  name: string;
  sortOrder: number;
  letterType: `ward-${WardIssueType}`;
  issueType: WardIssueType;
}> {
  return WARD_ISSUE_TYPES.map((issueType, index) => ({
    category: 'BMC & Civic Amenities',
    name: getWardIssueCatalogName(issueType),
    sortOrder: startSortOrder + index,
    letterType: `ward-${issueType}` as const,
    issueType,
  }));
}

function normalizeServiceNameKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ');
}

/**
 * Infer ward issue type from a ServiceCatalog / beneficiary service name.
 * Returns null when the name is not a known ward catalog entry.
 */
export function resolveWardIssueTypeFromServiceName(
  serviceName: string | null | undefined,
): WardIssueType | null {
  const key = normalizeServiceNameKey(serviceName ?? '');
  if (!key) return null;

  for (const issueType of WARD_ISSUE_TYPES) {
    const catalogKey = normalizeServiceNameKey(getWardIssueCatalogName(issueType));
    if (key === catalogKey || key.includes(catalogKey)) {
      return issueType;
    }
  }

  // Loose fallbacks for shortened / variant names.
  const heuristics: Array<{ match: RegExp; issueType: WardIssueType }> = [
    { match: /\bgarbage\b|\bkachra\b/, issueType: 'garbage' },
    { match: /\bdrain\b|\bgutter\b|\bnale\b/, issueType: 'drain' },
    { match: /\bdead\b.*\btree\b|\btree\b.*\bdead\b/, issueType: 'tree-dead' },
    { match: /\bhazard\b.*\btree\b|\btree\b.*\binspection\b/, issueType: 'tree-hazard' },
    { match: /\btrim\b|\bbranch\b/, issueType: 'tree-trim' },
    { match: /\bcontaminat/, issueType: 'water-contaminated' },
    { match: /\blow\b.*\bpressure\b|\bpressure\b/, issueType: 'water-low-pressure' },
    { match: /\btanker\b/, issueType: 'water-tanker' },
    { match: /\bno\b.*\bwater\b|\bwater\b.*\bnone\b|\bwater\b.*\babsen/, issueType: 'water-none' },
    { match: /\bfootpath\b|\bfoot\s*path\b/, issueType: 'footpath-repair' },
    { match: /\broad\b/, issueType: 'road-repair' },
    { match: /\bstreet\s*light|\bpath\s*light|\bpathdive\b/, issueType: 'street-lights' },
    { match: /\bspeed\s*breaker|\bgatirodhak\b/, issueType: 'speed-breaker' },
  ];

  if (!/\bward\b/.test(key) && !/\bbmc\b/.test(key) && !/\bcivic\b/.test(key)) {
    return null;
  }

  for (const { match, issueType } of heuristics) {
    if (match.test(key)) return issueType;
  }

  return null;
}

export function buildWardSubject(
  issueType: WardIssueType,
  locale: LetterLocale,
  values: WardIssueFieldValues,
): string {
  return substituteTokens(WARD_ISSUE_PRESETS[issueType].subject[locale], values);
}

export function buildWardParagraphs(
  issueType: WardIssueType,
  locale: LetterLocale,
  values: WardIssueFieldValues,
): string {
  return WARD_ISSUE_PRESETS[issueType].paragraphs[locale]
    .map((paragraph) => substituteTokens(paragraph, values))
    .join('\n');
}

/** Wrap `{{location}}` etc. so they stay editable in LetterMaster HTML. */
export function wrapWardTemplateVars(text: string): string {
  return text.replace(
    /\{\{(location|complainantName|contactNo|duration)\}\}/g,
    '<span class="var">{{$1}}</span>',
  );
}

export function wardIssueSubjectHtml(
  issueType: WardIssueType,
  locale: LetterLocale,
): string {
  return wrapWardTemplateVars(WARD_ISSUE_PRESETS[issueType].subject[locale]);
}

export function wardIssueParagraphsHtml(
  issueType: WardIssueType,
  locale: LetterLocale,
): string {
  return WARD_ISSUE_PRESETS[issueType].paragraphs[locale]
    .map(
      (paragraph) => `<p class="paragraph">
    ${wrapWardTemplateVars(paragraph)}
  </p>`,
    )
    .join('\n  ');
}

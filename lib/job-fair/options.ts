export const JOB_FAIR_MODULE_KEY = 'job-fair';
export const JOB_FAIR_PUBLIC_PATH = '/yuvaaz';

export const JOB_FAIR_EVENT = {
  code: 'yuvaaz-2026',
  registrationPrefix: 'YUVAAZ',
  title: 'YUVAAZ 2026',
  subtitle: 'Anushakti Nagar Job Fair',
  taglineTop: 'PROTEST BHI. PROGRESS BHI.',
  taglineBottom: 'AB JOB KI BAARI!!',
  initiativeBy: 'Sana Malik Shaikh',
  initiativeRole: 'MLA, Anushakti Nagar',
  dateLabel: '18 October 2026',
  timeLabel: '10:00 AM – 4:00 PM',
  venueShort: 'Matoshree Vidyamandir, Mankhurd',
  venueFull:
    'Matoshree Vidyamandir, Sion–Panvel Highway, Near Anushakti Nagar Signal, Mankhurd, Mumbai – 400088',
  mapsUrl:
    'https://www.google.com/maps/search/?api=1&query=Matoshree+Vidyamandir+Mankhurd+Mumbai+400088',
  /** ISO instants for calendar export (IST = UTC+05:30). */
  startsAt: '2026-10-18T10:00:00+05:30',
  endsAt: '2026-10-18T16:00:00+05:30',
} as const;

type Option<T extends string = string> = { value: T; label: string };

function opts<const T extends readonly Option[]>(list: T) {
  return list;
}

export const GENDER_OPTIONS = opts([
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Others' },
] as const);

export const AREA_OTHER = 'other';

export const AREA_OPTIONS = opts([
  { value: 'agarwadi', label: 'Agarwadi' },
  { value: 'ashok-nagar-kasturba-nagar', label: 'Ashok Nagar – Kasturba Nagar' },
  { value: 'aziz-baug-indira-nagar', label: 'Aziz Baug – Indira Nagar' },
  { value: 'barc', label: 'BARC' },
  { value: 'bharat-nagar', label: 'Bharat Nagar' },
  { value: 'bharat-nagar-mankhurd', label: 'Bharat Nagar – Mankhurd' },
  { value: 'cheeta-camp', label: 'Cheeta Camp' },
  { value: 'deonar-gaon', label: 'Deonar Gaon' },
  { value: 'deonar-municipal-colony', label: 'Deonar Municipal Colony' },
  {
    value: 'gadkari-prayag-nagar-gavanpada',
    label: 'Gadkari – Prayag Nagar – Gavanpada',
  },
  { value: 'govandi-gaon', label: 'Govandi Gaon' },
  { value: 'mahatma-phule-nagar', label: 'Mahatma Phule Nagar' },
  { value: 'maharashtra-nagar', label: 'Maharashtra Nagar' },
  { value: 'mandala-labour-colony', label: 'Mandala – Labour Colony' },
  { value: 'mankhurd-gaon', label: 'Mankhurd Gaon' },
  { value: 'mhada-bharat-nagar', label: 'MHADA – Bharat Nagar' },
  { value: 'panjrapole', label: 'Panjrapole' },
  { value: 'paylipada', label: 'Paylipada' },
  { value: 'rcf-colony', label: 'RCF Colony' },
  { value: 'sahyadri-nagar', label: 'Sahyadri Nagar' },
  { value: 'samrat-ashok-nagar', label: 'Samrat Ashok Nagar' },
  { value: 'tata-nagar', label: 'Tata Nagar' },
  { value: 'trombay-koliwada', label: 'Trombay Koliwada' },
  { value: 'vashi-naka', label: 'Vashi Naka' },
  { value: 'vishnu-nagar', label: 'Vishnu Nagar' },
  { value: AREA_OTHER, label: 'Other – Please Specify' },
] as const);

export const QUALIFICATION_OPTIONS = opts([
  { value: 'below-10th', label: 'Below 10th' },
  { value: '10th', label: '10th Pass' },
  { value: '12th', label: '12th Pass' },
  { value: 'iti', label: 'ITI' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'graduate', label: 'Graduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'professional', label: 'Professional Qualification' },
  { value: 'other', label: 'Other' },
] as const);

export const EMPLOYMENT_STATUS_OPTIONS = opts([
  { value: 'fresher', label: 'Fresher' },
  {
    value: 'experienced-unemployed',
    label: 'Experienced – Currently Unemployed',
  },
  {
    value: 'employed-looking',
    label: 'Currently Employed – Looking for a Change',
  },
] as const);

export const EXPERIENCE_OPTIONS = opts([
  { value: 'none', label: 'No Experience' },
  { value: 'lt-1', label: 'Less than 1 Year' },
  { value: '1-2', label: '1–2 Years' },
  { value: '2-5', label: '2–5 Years' },
  { value: 'gt-5', label: 'More than 5 Years' },
] as const);

export const JOB_TYPE_OTHER = 'other';

export const JOB_TYPE_OPTIONS = opts([
  { value: 'office', label: 'Office / Banking / Accounts' },
  { value: 'sales', label: 'Sales / Retail / Customer Service' },
  { value: 'it', label: 'IT / Technical / Skilled Jobs' },
  { value: 'healthcare', label: 'Healthcare / Hospitality' },
  { value: 'logistics', label: 'Logistics / Operations / Delivery' },
  { value: 'security', label: 'Security / Facility Services' },
  { value: 'any', label: 'Open to Any Suitable Job' },
  { value: JOB_TYPE_OTHER, label: 'Other' },
] as const);

export const HEARD_FROM_OPTIONS = opts([
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'social', label: 'Instagram / Social Media' },
  { value: 'coordinator', label: 'Local Coordinator / Volunteer' },
  { value: 'college', label: 'College / Institute' },
  { value: 'friend', label: 'Friend / Family' },
  { value: 'poster', label: 'Poster / Banner' },
  { value: 'other', label: 'Other' },
] as const);

export type GenderValue = (typeof GENDER_OPTIONS)[number]['value'];
export type AreaValue = (typeof AREA_OPTIONS)[number]['value'];
export type QualificationValue = (typeof QUALIFICATION_OPTIONS)[number]['value'];
export type EmploymentStatusValue =
  (typeof EMPLOYMENT_STATUS_OPTIONS)[number]['value'];
export type ExperienceValue = (typeof EXPERIENCE_OPTIONS)[number]['value'];
export type JobTypeValue = (typeof JOB_TYPE_OPTIONS)[number]['value'];
export type HeardFromValue = (typeof HEARD_FROM_OPTIONS)[number]['value'];

export function optionValues<T extends string>(
  list: readonly Option<T>[],
): [T, ...T[]] {
  return list.map((o) => o.value) as [T, ...T[]];
}

export function optionLabel(
  list: readonly Option[],
  value: string | null | undefined,
): string {
  if (!value) return '';
  return list.find((o) => o.value === value)?.label ?? value;
}

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;
export const RESUME_ACCEPT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
export const RESUME_ACCEPT_ATTR = [
  ...Object.keys(RESUME_ACCEPT),
  ...Object.values(RESUME_ACCEPT),
  '.jpeg',
].join(',');

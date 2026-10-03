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
  initiativeRole: 'MLA - Anushakti Nagar',
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

type AreaOption = Option & { pincodes: readonly string[] };

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
  { value: 'agarwadi', label: 'Agarwadi', pincodes: ['400088'] },
  {
    value: 'ashok-nagar-kasturba-nagar',
    label: 'Ashok Nagar – Kasturba Nagar',
    pincodes: ['400074'],
  },
  {
    value: 'aziz-baug-indira-nagar',
    label: 'Aziz Baug – Indira Nagar',
    pincodes: ['400074'],
  },
  { value: 'barc', label: 'BARC', pincodes: ['400085'] },
  { value: 'bharat-nagar', label: 'Bharat Nagar', pincodes: ['400074'] },
  {
    value: 'bharat-nagar-mankhurd',
    label: 'Bharat Nagar – Mankhurd',
    pincodes: ['400043', '400088'],
  },
  { value: 'cheeta-camp', label: 'Cheeta Camp', pincodes: ['400088'] },
  { value: 'deonar-gaon', label: 'Deonar Gaon', pincodes: ['400088'] },
  {
    value: 'deonar-municipal-colony',
    label: 'Deonar Municipal Colony',
    pincodes: ['400043'],
  },
  {
    value: 'gadkari-prayag-nagar-gavanpada',
    label: 'Gadkari – Prayag Nagar – Gavanpada',
    pincodes: ['400074'],
  },
  { value: 'govandi-gaon', label: 'Govandi Gaon', pincodes: ['400043'] },
  {
    value: 'mahatma-phule-nagar',
    label: 'Mahatma Phule Nagar',
    pincodes: ['400043'],
  },
  { value: 'maharashtra-nagar', label: 'Maharashtra Nagar', pincodes: ['400088'] },
  {
    value: 'mandala-labour-colony',
    label: 'Mandala – Labour Colony',
    pincodes: ['400043'],
  },
  { value: 'mankhurd-gaon', label: 'Mankhurd Gaon', pincodes: ['400088'] },
  {
    value: 'mhada-bharat-nagar',
    label: 'MHADA – Bharat Nagar',
    pincodes: ['400074'],
  },
  { value: 'panjrapole', label: 'Panjrapole', pincodes: ['400088'] },
  { value: 'paylipada', label: 'Paylipada', pincodes: ['400088'] },
  { value: 'rcf-colony', label: 'RCF Colony', pincodes: ['400074'] },
  { value: 'sahyadri-nagar', label: 'Sahyadri Nagar', pincodes: ['400074'] },
  { value: 'samrat-ashok-nagar', label: 'Samrat Ashok Nagar', pincodes: ['400043'] },
  { value: 'tata-nagar', label: 'Tata Nagar', pincodes: ['400043'] },
  { value: 'trombay-koliwada', label: 'Trombay Koliwada', pincodes: ['400088'] },
  { value: 'vashi-naka', label: 'Vashi Naka', pincodes: ['400074'] },
  { value: 'vishnu-nagar', label: 'Vishnu Nagar', pincodes: ['400074'] },
  { value: 'vn-purav-marg', label: 'VN Purav Marg', pincodes: ['400071'] },
  { value: AREA_OTHER, label: 'Other – Please Specify', pincodes: [] },
] as const satisfies readonly AreaOption[]);

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

export function areaPincodes(value: string | null | undefined): readonly string[] {
  const match = AREA_OPTIONS.find((o) => o.value === value);
  return match ? match.pincodes : [];
}

/** Area name plus PIN, for the searchable locality dropdown. */
export function areaSearchLabel(option: (typeof AREA_OPTIONS)[number]): string {
  if (option.pincodes.length === 0) return option.label;
  return `${option.label} · ${option.pincodes.join(' / ')}`;
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

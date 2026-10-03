import { z } from 'zod';

import {
  AREA_OPTIONS,
  AREA_OTHER,
  EMPLOYMENT_STATUS_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  HEARD_FROM_OPTIONS,
  JOB_TYPE_OPTIONS,
  JOB_TYPE_OTHER,
  QUALIFICATION_OPTIONS,
  RESUME_ACCEPT,
  RESUME_MAX_BYTES,
  optionValues,
} from './options';

/** Indian voter ID: three letters, then seven digits (e.g. ABC1234567). */
export const EPIC_NUMBER_PATTERN = /^[A-Z]{3}[0-9]{7}$/;

export function normalizeIndianMobile(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/** Keep only a partial or complete EPIC while the user types or pastes. */
export function sanitizeEpicInput(value: string): string {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let letters = '';
  let digits = '';
  for (const ch of upper) {
    if (digits.length === 0 && letters.length < 3 && /[A-Z]/.test(ch)) {
      letters += ch;
    } else if (letters.length === 3 && digits.length < 7 && /[0-9]/.test(ch)) {
      digits += ch;
    }
  }
  return letters + digits;
}

const mobileField = (label: string) =>
  z
    .string()
    .transform(normalizeIndianMobile)
    .pipe(
      z
        .string()
        .min(1, `${label} is required`)
        .regex(/^[6-9]\d{9}$/, `Enter a valid 10-digit ${label.toLowerCase()}`),
    );

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximum ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const requiredEnum = <T extends string>(values: [T, ...T[]], message: string) =>
  z.enum(values, { errorMap: () => ({ message }) });

export const jobFairStepSchemas = {
  personal: z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Please enter your full name')
      .max(150, 'Maximum 150 characters'),
    mobile: mobileField('Mobile number'),
    whatsapp: mobileField('WhatsApp number'),
    age: z
      .string()
      .trim()
      .min(1, 'Age is required')
      .regex(/^\d{1,2}$/, 'Enter age in numbers')
      .refine((v) => Number(v) >= 14 && Number(v) <= 70, {
        message: 'Age must be between 14 and 70',
      }),
    gender: requiredEnum(optionValues(GENDER_OPTIONS), 'Please select gender'),
  }),
  address: z
    .object({
      area: requiredEnum(
        optionValues(AREA_OPTIONS),
        'Please select your area / locality',
      ),
      areaOther: optionalText(150),
      pincode: z
        .string()
        .trim()
        .regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
      epicNumber: z
        .string()
        .trim()
        .transform(sanitizeEpicInput)
        .pipe(
          z.union([
            z.literal(''),
            z
              .string()
              .regex(
                EPIC_NUMBER_PATTERN,
                'Enter a valid EPIC number (3 letters and 7 digits, e.g. ABC1234567)',
              ),
          ]),
        )
        .transform((v) => (v ? v : undefined)),
    })
    .superRefine((data, ctx) => {
      if (data.area === AREA_OTHER && !data.areaOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['areaOther'],
          message: 'Please specify your area / locality',
        });
      }
    }),
  education: z.object({
    qualification: requiredEnum(
      optionValues(QUALIFICATION_OPTIONS),
      'Please select your highest qualification',
    ),
    course: optionalText(150),
    employmentStatus: requiredEnum(
      optionValues(EMPLOYMENT_STATUS_OPTIONS),
      'Please select your employment status',
    ),
    experience: requiredEnum(
      optionValues(EXPERIENCE_OPTIONS),
      'Please select your work experience',
    ),
  }),
  preferences: z
    .object({
      jobTypes: z
        .array(z.enum(optionValues(JOB_TYPE_OPTIONS)))
        .min(1, 'Select at least one job type'),
      jobTypeOther: optionalText(150),
      heardFrom: z
        .union([z.enum(optionValues(HEARD_FROM_OPTIONS)), z.literal('')])
        .optional()
        .transform((v) => (v ? v : undefined)),
    })
    .superRefine((data, ctx) => {
      if (data.jobTypes.includes(JOB_TYPE_OTHER) && !data.jobTypeOther) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['jobTypeOther'],
          message: 'Please specify the job type you are looking for',
        });
      }
    }),
} as const;

export type JobFairStepKey = keyof typeof jobFairStepSchemas;

export const JOB_FAIR_STEP_KEYS = [
  'personal',
  'address',
  'education',
  'preferences',
] as const satisfies readonly JobFairStepKey[];

export type JobFairRegistrationInput = z.output<
  (typeof jobFairStepSchemas)['personal']
> &
  z.output<(typeof jobFairStepSchemas)['address']> &
  z.output<(typeof jobFairStepSchemas)['education']> &
  z.output<(typeof jobFairStepSchemas)['preferences']>;

export type JobFairFieldErrors = Partial<Record<string, string>>;

export function validateJobFairStep(
  step: JobFairStepKey,
  values: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false; errors: JobFairFieldErrors } {
  const result = jobFairStepSchemas[step].safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const errors: JobFairFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? '');
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}

export function parseJobFairRegistration(
  values: unknown,
):
  | { ok: true; data: JobFairRegistrationInput }
  | { ok: false; errors: JobFairFieldErrors } {
  let data: Record<string, unknown> = {};
  let errors: JobFairFieldErrors = {};
  for (const step of JOB_FAIR_STEP_KEYS) {
    const result = validateJobFairStep(step, values);
    if (result.ok) data = { ...data, ...result.data };
    else errors = { ...errors, ...result.errors };
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: data as JobFairRegistrationInput };
}

/** Raw form values as held in the browser (all strings before parsing). */
export type JobFairFormValues = {
  fullName: string;
  mobile: string;
  whatsapp: string;
  age: string;
  gender: string;
  area: string;
  areaOther: string;
  pincode: string;
  epicNumber: string;
  qualification: string;
  course: string;
  employmentStatus: string;
  experience: string;
  jobTypes: string[];
  jobTypeOther: string;
  heardFrom: string;
};

export const EMPTY_JOB_FAIR_FORM: JobFairFormValues = {
  fullName: '',
  mobile: '',
  whatsapp: '',
  age: '',
  gender: '',
  area: '',
  areaOther: '',
  pincode: '',
  epicNumber: '',
  qualification: '',
  course: '',
  employmentStatus: '',
  experience: '',
  jobTypes: [],
  jobTypeOther: '',
  heardFrom: '',
};

/** Cap untrusted form JSON before it is stored as a draft. */
export function sanitizeJobFairFormValues(input: unknown): JobFairFormValues {
  const src =
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const text = (key: keyof JobFairFormValues, max: number) =>
    String(src[key] ?? '')
      .replace(/\0/g, '')
      .trim()
      .slice(0, max);
  const allowedJobs = new Set<string>(optionValues(JOB_TYPE_OPTIONS));
  const jobTypes = Array.isArray(src.jobTypes)
    ? src.jobTypes
        .map((value) => String(value))
        .filter((value) => allowedJobs.has(value))
        .slice(0, JOB_TYPE_OPTIONS.length)
    : [];

  return {
    fullName: text('fullName', 150),
    mobile: normalizeIndianMobile(text('mobile', 20)).slice(0, 10),
    whatsapp: normalizeIndianMobile(text('whatsapp', 20)).slice(0, 10),
    age: text('age', 2).replace(/\D/g, '').slice(0, 2),
    gender: text('gender', 20),
    area: text('area', 60),
    areaOther: text('areaOther', 150),
    pincode: text('pincode', 6).replace(/\D/g, '').slice(0, 6),
    epicNumber: sanitizeEpicInput(text('epicNumber', 20)),
    qualification: text('qualification', 30),
    course: text('course', 150),
    employmentStatus: text('employmentStatus', 40),
    experience: text('experience', 20),
    jobTypes,
    jobTypeOther: text('jobTypeOther', 150),
    heardFrom: text('heardFrom', 30),
  };
}

/** How many steps from the start are valid. 4 means the review step can open. */
export function completedJobFairStepCount(values: JobFairFormValues): number {
  let count = 0;
  for (const step of JOB_FAIR_STEP_KEYS) {
    if (!validateJobFairStep(step, values).ok) break;
    count += 1;
  }
  return count;
}

/** Resume on the requested step, but never past the first incomplete step. */
export function clampJobFairResumeStep(
  values: JobFairFormValues,
  requested: number,
): number {
  const furthest = completedJobFairStepCount(values);
  const requestedSafe = Number.isFinite(requested) ? Math.trunc(requested) : 0;
  return Math.min(Math.max(0, requestedSafe), furthest);
}

export function jobFairRegistrationToFormValues(row: {
  fullName: string;
  mobile: string;
  whatsapp: string;
  age: number;
  gender: string;
  area: string;
  areaOther: string | null;
  pincode: string;
  epicNumber: string | null;
  qualification: string;
  course: string | null;
  employmentStatus: string;
  experience: string;
  jobTypes: string[];
  jobTypeOther: string | null;
  heardFrom: string | null;
}): JobFairFormValues {
  return {
    fullName: row.fullName,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    age: String(row.age),
    gender: row.gender,
    area: row.area,
    areaOther: row.areaOther ?? '',
    pincode: row.pincode,
    epicNumber: row.epicNumber ?? '',
    qualification: row.qualification,
    course: row.course ?? '',
    employmentStatus: row.employmentStatus,
    experience: row.experience,
    jobTypes: row.jobTypes ?? [],
    jobTypeOther: row.jobTypeOther ?? '',
    heardFrom: row.heardFrom ?? '',
  };
}

export function validateResumeFile(file: {
  size: number;
  type: string;
  name: string;
}): string | null {
  if (file.size <= 0) return 'The selected file is empty';
  if (file.size > RESUME_MAX_BYTES) return 'Resume must be 5 MB or smaller';
  const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  const okType = file.type in RESUME_ACCEPT;
  const okExt = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'].includes(ext);
  if (!okType && !okExt) return 'Upload a PDF, Word document, JPG or PNG';
  return null;
}

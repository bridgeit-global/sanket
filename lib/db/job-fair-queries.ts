import 'server-only';

import { sql } from './postgres';
import {
  JOB_FAIR_EVENT,
  JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT,
} from '@/lib/job-fair/options';
import { generateJobFairRegistrationNo } from '@/lib/job-fair/registration-no';
import {
  jobFairRegistrationToFormValues,
  sanitizeJobFairFormValues,
  type JobFairFormValues,
  type JobFairRegistrationInput,
} from '@/lib/job-fair/schema';

export const JOB_FAIR_RESUME_BUCKET = 'job-fair-resumes';

export type JobFairRegistration = {
  id: string;
  registrationNo: string;
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
  resumeStoragePath: string | null;
  resumeFileName: string | null;
  resumeSizeKb: number | null;
  status: string;
  receiptDownloadCount: number;
  /** ISO instant (UTC). */
  createdAt: string;
  /** Naive UTC wall-clock, for ordering against drafts. */
  updatedAt: string;
};

export type JobFairListFilters = {
  search?: string;
  area?: string;
  qualification?: string;
  experience?: string;
  jobType?: string;
  /** IST calendar day, yyyy-MM-dd (inclusive). */
  from?: string;
  /** IST calendar day, yyyy-MM-dd (inclusive). */
  to?: string;
};

type Row = Record<string, unknown>;

const SELECT_COLUMNS = sql`
  id, registration_no, full_name, mobile, whatsapp, age, gender, area, area_other,
  pincode, epic_number, qualification, course, employment_status, experience,
  job_types, job_type_other, heard_from, resume_storage_path, resume_file_name,
  resume_size_kb, status, receipt_download_count,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at,
  to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS updated_at
`;

function mapRow(row: Row): JobFairRegistration {
  return {
    id: String(row.id),
    registrationNo: String(row.registration_no),
    fullName: String(row.full_name),
    mobile: String(row.mobile),
    whatsapp: String(row.whatsapp),
    age: Number(row.age),
    gender: String(row.gender),
    area: String(row.area),
    areaOther: (row.area_other as string | null) ?? null,
    pincode: String(row.pincode),
    epicNumber: (row.epic_number as string | null) ?? null,
    qualification: String(row.qualification),
    course: (row.course as string | null) ?? null,
    employmentStatus: String(row.employment_status),
    experience: String(row.experience),
    jobTypes: (row.job_types as string[] | null) ?? [],
    jobTypeOther: (row.job_type_other as string | null) ?? null,
    heardFrom: (row.heard_from as string | null) ?? null,
    resumeStoragePath: (row.resume_storage_path as string | null) ?? null,
    resumeFileName: (row.resume_file_name as string | null) ?? null,
    resumeSizeKb:
      row.resume_size_kb == null ? null : Number(row.resume_size_kb),
    status: String(row.status),
    receiptDownloadCount: Number(row.receipt_download_count ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? ''),
  };
}

/** IST midnight of `ymd` as a naive UTC wall-clock string (matches DB storage). */
function istDayStartUtc(ymd: string, addDays = 0): string {
  const d = new Date(`${ymd}T00:00:00+05:30`);
  d.setUTCDate(d.getUTCDate() + addDays);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function buildWhere(filters: JobFairListFilters) {
  const parts = [sql`event_code = ${JOB_FAIR_EVENT.code}`];
  const search = filters.search?.trim();
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    parts.push(
      sql`(full_name ILIKE ${like} OR mobile ILIKE ${like} OR whatsapp ILIKE ${like} OR registration_no ILIKE ${like})`,
    );
  }
  if (filters.area) parts.push(sql`area = ${filters.area}`);
  if (filters.qualification)
    parts.push(sql`qualification = ${filters.qualification}`);
  if (filters.experience) parts.push(sql`experience = ${filters.experience}`);
  if (filters.jobType) parts.push(sql`${filters.jobType} = ANY(job_types)`);
  if (filters.from && YMD.test(filters.from))
    parts.push(sql`created_at >= ${istDayStartUtc(filters.from)}::timestamp`);
  if (filters.to && YMD.test(filters.to))
    parts.push(sql`created_at < ${istDayStartUtc(filters.to, 1)}::timestamp`);

  return parts.reduce((acc, part, i) => (i === 0 ? part : sql`${acc} AND ${part}`));
}

export async function getJobFairRegistrationNoByMobile(
  mobile: string,
): Promise<string | null> {
  const existing = await getJobFairRegistrationByMobile(mobile);
  return existing?.registrationNo ?? null;
}

export async function getJobFairRegistrationByMobile(
  mobile: string,
): Promise<JobFairRegistration | null> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS} FROM "JobFairRegistration"
    WHERE event_code = ${JOB_FAIR_EVENT.code} AND mobile = ${mobile}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0] as Row) : null;
}

export type JobFairDraft = {
  mobile: string;
  /** Step index to reopen (0–4, where 4 is review). */
  step: number;
  values: JobFairFormValues;
  sameAsMobile: boolean;
  /** Naive UTC wall-clock, same format as registration.updatedAt. */
  updatedAt: string;
};

function mapDraft(row: Row): JobFairDraft | null {
  const payload =
    row.payload && typeof row.payload === 'object'
      ? (row.payload as { values?: unknown; sameAsMobile?: unknown })
      : {};
  const values = sanitizeJobFairFormValues(payload.values);
  if (!/^[6-9]\d{9}$/.test(values.mobile)) return null;
  const step = Number(row.step);
  return {
    mobile: String(row.mobile),
    step: Number.isFinite(step) ? Math.min(Math.max(0, Math.trunc(step)), 4) : 0,
    values,
    sameAsMobile: Boolean(payload.sameAsMobile),
    updatedAt: String(row.updated_at ?? ''),
  };
}

export async function getJobFairDraftByMobile(
  mobile: string,
): Promise<JobFairDraft | null> {
  const rows = await sql`
    SELECT mobile, step, payload,
      to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS') AS updated_at
    FROM "JobFairRegistrationDraft"
    WHERE event_code = ${JOB_FAIR_EVENT.code} AND mobile = ${mobile}
    LIMIT 1
  `;
  return rows[0] ? mapDraft(rows[0] as Row) : null;
}

export async function upsertJobFairDraft(input: {
  mobile: string;
  step: number;
  values: JobFairFormValues;
  sameAsMobile: boolean;
  savedAt: number;
}): Promise<void> {
  const payload = {
    values: input.values,
    sameAsMobile: input.sameAsMobile,
    savedAt: input.savedAt,
  };
  await sql`
    INSERT INTO "JobFairRegistrationDraft" (event_code, mobile, step, payload)
    VALUES (
      ${JOB_FAIR_EVENT.code},
      ${input.mobile},
      ${input.step},
      ${sql.json(payload)}
    )
    ON CONFLICT (event_code, mobile) DO UPDATE
    SET step = EXCLUDED.step,
        payload = EXCLUDED.payload,
        updated_at = now()
    WHERE COALESCE(("JobFairRegistrationDraft".payload->>'savedAt')::bigint, 0)
      <= ${input.savedAt}::bigint
  `;
}

export type JobFairMobileState = {
  status: 'new' | 'draft' | 'registered';
  registrationNo: string | null;
  receiptDownloadsRemaining: number | null;
  resumeFileName: string | null;
  step: number;
  values: JobFairFormValues | null;
  sameAsMobile: boolean;
};

function downloadsRemaining(count: number): number {
  return Math.max(0, JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT - count);
}

export async function getJobFairMobileState(
  mobile: string,
): Promise<JobFairMobileState> {
  const [registration, draft] = await Promise.all([
    getJobFairRegistrationByMobile(mobile),
    getJobFairDraftByMobile(mobile),
  ]);
  const draftNewer =
    draft != null &&
    (registration == null || draft.updatedAt > registration.updatedAt);

  if (registration && draftNewer && draft) {
    return {
      status: 'registered',
      registrationNo: registration.registrationNo,
      receiptDownloadsRemaining: downloadsRemaining(registration.receiptDownloadCount),
      resumeFileName: registration.resumeFileName,
      step: draft.step,
      values: { ...draft.values, mobile: registration.mobile },
      sameAsMobile:
        draft.sameAsMobile || draft.values.whatsapp === registration.mobile,
    };
  }

  if (registration) {
    const values = jobFairRegistrationToFormValues(registration);
    return {
      status: 'registered',
      registrationNo: registration.registrationNo,
      receiptDownloadsRemaining: downloadsRemaining(registration.receiptDownloadCount),
      resumeFileName: registration.resumeFileName,
      step: 4,
      values,
      sameAsMobile: values.whatsapp === values.mobile,
    };
  }

  if (draft) {
    return {
      status: 'draft',
      registrationNo: null,
      receiptDownloadsRemaining: null,
      resumeFileName: null,
      step: draft.step,
      values: draft.values,
      sameAsMobile: draft.sameAsMobile || draft.values.whatsapp === draft.values.mobile,
    };
  }

  return {
    status: 'new',
    registrationNo: null,
    receiptDownloadsRemaining: null,
    resumeFileName: null,
    step: 0,
    values: null,
    sameAsMobile: false,
  };
}

const REGISTRATION_NO_ATTEMPTS = 8;

function isRegistrationNoCollision(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const pg = error as { code?: string; constraint_name?: string; message?: string };
  if (pg.code !== '23505') return false;
  const detail = `${pg.constraint_name ?? ''} ${pg.message ?? ''}`;
  return detail.includes('registration_no');
}

export async function insertJobFairRegistration(
  input: JobFairRegistrationInput,
): Promise<{ id: string; registrationNo: string }> {
  for (let attempt = 0; attempt < REGISTRATION_NO_ATTEMPTS; attempt += 1) {
    const registrationNo = generateJobFairRegistrationNo();
    try {
      const rows = await sql`
        INSERT INTO "JobFairRegistration" (
          event_code, registration_no, full_name, mobile, whatsapp, age, gender,
          area, area_other, pincode, epic_number, qualification, course,
          employment_status, experience, job_types, job_type_other, heard_from
        ) VALUES (
          ${JOB_FAIR_EVENT.code}, ${registrationNo}, ${input.fullName}, ${input.mobile},
          ${input.whatsapp}, ${Number(input.age)}, ${input.gender}, ${input.area},
          ${input.area === 'other' ? (input.areaOther ?? null) : null},
          ${input.pincode}, ${input.epicNumber ?? null}, ${input.qualification},
          ${input.course ?? null}, ${input.employmentStatus}, ${input.experience},
          ${sql.array(input.jobTypes)},
          ${input.jobTypes.includes('other') ? (input.jobTypeOther ?? null) : null},
          ${input.heardFrom ?? null}
        )
        RETURNING id, registration_no
      `;
      return { id: String(rows[0].id), registrationNo: String(rows[0].registration_no) };
    } catch (error) {
      if (isRegistrationNoCollision(error) && attempt < REGISTRATION_NO_ATTEMPTS - 1) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('Could not assign a registration number');
}

export async function updateJobFairRegistration(
  input: JobFairRegistrationInput,
): Promise<{ id: string; registrationNo: string; receiptDownloadCount: number }> {
  const rows = await sql`
    UPDATE "JobFairRegistration"
    SET full_name = ${input.fullName},
        whatsapp = ${input.whatsapp},
        age = ${Number(input.age)},
        gender = ${input.gender},
        area = ${input.area},
        area_other = ${input.area === 'other' ? (input.areaOther ?? null) : null},
        pincode = ${input.pincode},
        epic_number = ${input.epicNumber ?? null},
        qualification = ${input.qualification},
        course = ${input.course ?? null},
        employment_status = ${input.employmentStatus},
        experience = ${input.experience},
        job_types = ${sql.array(input.jobTypes)},
        job_type_other = ${input.jobTypes.includes('other') ? (input.jobTypeOther ?? null) : null},
        heard_from = ${input.heardFrom ?? null},
        updated_at = now()
    WHERE event_code = ${JOB_FAIR_EVENT.code} AND mobile = ${input.mobile}
    RETURNING id, registration_no, receipt_download_count
  `;
  if (!rows[0]) throw new Error('Registration not found');
  return {
    id: String(rows[0].id),
    registrationNo: String(rows[0].registration_no),
    receiptDownloadCount: Number(rows[0].receipt_download_count ?? 0),
  };
}

export async function claimJobFairReceiptDownload(mobile: string): Promise<
  | { ok: true; registration: JobFairRegistration; remaining: number }
  | { ok: false; reason: 'not_found' | 'limit' }
> {
  const rows = await sql`
    UPDATE "JobFairRegistration"
    SET receipt_download_count = receipt_download_count + 1
    WHERE event_code = ${JOB_FAIR_EVENT.code}
      AND mobile = ${mobile}
      AND receipt_download_count < ${JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT}
    RETURNING id
  `;
  if (!rows[0]) {
    const existing = await getJobFairRegistrationByMobile(mobile);
    if (!existing) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'limit' };
  }
  const registration = await getJobFairRegistrationById(String(rows[0].id));
  if (!registration) return { ok: false, reason: 'not_found' };
  return {
    ok: true,
    registration,
    remaining: Math.max(
      0,
      JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT - registration.receiptDownloadCount,
    ),
  };
}

export async function setJobFairRegistrationResume(
  id: string,
  resume: { storagePath: string; fileName: string; sizeKb: number },
): Promise<void> {
  await sql`
    UPDATE "JobFairRegistration"
    SET resume_storage_path = ${resume.storagePath},
        resume_file_name = ${resume.fileName},
        resume_size_kb = ${resume.sizeKb},
        updated_at = now()
    WHERE id = ${id}
  `;
}

export async function listJobFairRegistrations(
  filters: JobFairListFilters,
  page: number,
  limit: number,
): Promise<{ items: JobFairRegistration[]; total: number }> {
  const where = buildWhere(filters);
  const offset = (page - 1) * limit;
  const [rows, countRows] = await Promise.all([
    sql`
      SELECT ${SELECT_COLUMNS} FROM "JobFairRegistration"
      WHERE ${where}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `,
    sql`SELECT count(*)::int AS total FROM "JobFairRegistration" WHERE ${where}`,
  ]);
  return {
    items: rows.map((r) => mapRow(r as Row)),
    total: Number(countRows[0]?.total ?? 0),
  };
}

export async function listAllJobFairRegistrations(
  filters: JobFairListFilters,
): Promise<JobFairRegistration[]> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS} FROM "JobFairRegistration"
    WHERE ${buildWhere(filters)}
    ORDER BY created_at ASC
  `;
  return rows.map((r) => mapRow(r as Row));
}

export async function getJobFairRegistrationById(
  id: string,
): Promise<JobFairRegistration | null> {
  const rows = await sql`
    SELECT ${SELECT_COLUMNS} FROM "JobFairRegistration"
    WHERE id = ${id} AND event_code = ${JOB_FAIR_EVENT.code}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0] as Row) : null;
}

export type JobFairStats = {
  total: number;
  today: number;
  checkedIn: number;
  withResume: number;
  topAreas: Array<{ area: string; count: number }>;
};

export async function getJobFairStats(todayYmd: string): Promise<JobFairStats> {
  const [summary, areas] = await Promise.all([
    sql`
      SELECT
        count(*)::int AS total,
        count(*) FILTER (
          WHERE created_at >= ${istDayStartUtc(todayYmd)}::timestamp
        )::int AS today,
        count(*) FILTER (WHERE status <> 'registered')::int AS checked_in,
        count(resume_storage_path)::int AS with_resume
      FROM "JobFairRegistration"
      WHERE event_code = ${JOB_FAIR_EVENT.code}
    `,
    sql`
      SELECT area, count(*)::int AS count
      FROM "JobFairRegistration"
      WHERE event_code = ${JOB_FAIR_EVENT.code}
      GROUP BY area
      ORDER BY count DESC
      LIMIT 3
    `,
  ]);
  return {
    total: Number(summary[0]?.total ?? 0),
    today: Number(summary[0]?.today ?? 0),
    checkedIn: Number(summary[0]?.checked_in ?? 0),
    withResume: Number(summary[0]?.with_resume ?? 0),
    topAreas: areas.map((r) => ({ area: String(r.area), count: Number(r.count) })),
  };
}

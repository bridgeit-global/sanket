import 'server-only';

import { sql } from './postgres';
import { JOB_FAIR_EVENT } from '@/lib/job-fair/options';
import type { JobFairRegistrationInput } from '@/lib/job-fair/schema';

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
  /** ISO instant (UTC). */
  createdAt: string;
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
  resume_size_kb, status,
  to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS created_at
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
    createdAt: String(row.created_at),
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
  const rows = await sql`
    SELECT registration_no FROM "JobFairRegistration"
    WHERE event_code = ${JOB_FAIR_EVENT.code} AND mobile = ${mobile}
    LIMIT 1
  `;
  return rows[0] ? String(rows[0].registration_no) : null;
}

export async function insertJobFairRegistration(
  input: JobFairRegistrationInput,
): Promise<{ id: string; registrationNo: string }> {
  const rows = await sql`
    INSERT INTO "JobFairRegistration" (
      event_code, full_name, mobile, whatsapp, age, gender, area, area_other,
      pincode, epic_number, qualification, course, employment_status, experience,
      job_types, job_type_other, heard_from
    ) VALUES (
      ${JOB_FAIR_EVENT.code}, ${input.fullName}, ${input.mobile}, ${input.whatsapp},
      ${Number(input.age)}, ${input.gender}, ${input.area},
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
    withResume: Number(summary[0]?.with_resume ?? 0),
    topAreas: areas.map((r) => ({ area: String(r.area), count: Number(r.count) })),
  };
}

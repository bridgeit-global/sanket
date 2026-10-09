import 'server-only';

import { throwOnSupabaseError } from '@/lib/db/errors';
import { sql } from './postgres';
import { supabase } from '@/lib/supabase/server';
import { parseInstant, startOfDayIST, startOfWeekIST } from '@/lib/ist-date';
import {
  AREA_OPTIONS,
  JOB_FAIR_EVENT,
  JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT,
  optionLabel,
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
  /** Started the form and have not submitted a registration. */
  openDrafts: number;
  topAreas: Array<{ area: string; count: number }>;
};

export type JobFairDraftListItem = {
  id: string;
  mobile: string;
  /** Step index to reopen (0–4, where 4 is review). */
  step: number;
  fullName: string;
  whatsapp: string;
  area: string;
  areaOther: string;
  qualification: string;
  updatedAt: string;
  values: JobFairFormValues;
};

type DraftListRow = {
  id: string;
  mobile: string;
  step: number;
  payload: unknown;
  updated_at: string;
};

function ilikeOrClause(column: string, raw: string): string | null {
  const cleaned = raw.replace(/[%_\\"]/g, '').trim();
  if (!cleaned) return null;
  return `${column}.ilike."%${cleaned}%"`;
}

async function registeredMobilesForEvent(): Promise<string[]> {
  const { data, error } = await supabase
    .from('JobFairRegistration')
    .select('mobile')
    .eq('event_code', JOB_FAIR_EVENT.code);
  throwOnSupabaseError(error, 'Failed to list job fair registration mobiles');
  return [
    ...new Set(
      (data ?? []).map((row: { mobile: string }) => String(row.mobile)),
    ),
  ];
}

function mapDraftListItem(row: DraftListRow): JobFairDraftListItem {
  const payload =
    row.payload && typeof row.payload === 'object'
      ? (row.payload as { values?: unknown })
      : {};
  const values = sanitizeJobFairFormValues(payload.values);
  return {
    id: String(row.id),
    mobile: String(row.mobile),
    step: Number.isFinite(Number(row.step))
      ? Math.min(Math.max(0, Math.trunc(Number(row.step))), 4)
      : 0,
    fullName: values.fullName,
    whatsapp: values.whatsapp,
    area: values.area,
    areaOther: values.areaOther,
    qualification: values.qualification,
    updatedAt: String(row.updated_at ?? ''),
    values,
  };
}

/** Drafts whose mobile does not already have a submitted registration. */
export async function listOpenJobFairDrafts(
  search: string | undefined,
  page: number,
  limit: number,
  range?: { from?: string; to?: string; step?: number },
): Promise<{ items: JobFairDraftListItem[]; total: number }> {
  const registered = await registeredMobilesForEvent();
  let query = supabase
    .from('JobFairRegistrationDraft')
    .select('id, mobile, step, payload, updated_at', { count: 'exact' })
    .eq('event_code', JOB_FAIR_EVENT.code)
    .order('updated_at', { ascending: false });

  if (registered.length > 0) {
    query = query.not('mobile', 'in', `(${registered.join(',')})`);
  }
  if (range?.from && YMD.test(range.from)) {
    query = query.gte('created_at', istDayStartUtc(range.from));
  }
  if (range?.to && YMD.test(range.to)) {
    query = query.lt('created_at', istDayStartUtc(range.to, 1));
  }
  if (
    range?.step !== undefined &&
    Number.isInteger(range.step) &&
    range.step >= 0 &&
    range.step <= 4
  ) {
    query = query.eq('step', range.step);
  }

  const term = search?.trim();
  if (term) {
    const clauses = [
      ilikeOrClause('mobile', term),
      ilikeOrClause('payload->values->>fullName', term),
      ilikeOrClause('payload->values->>whatsapp', term),
    ].filter((clause): clause is string => Boolean(clause));
    if (clauses.length > 0) query = query.or(clauses.join(','));
  }

  const from = (page - 1) * limit;
  const { data, error, count } = await query.range(from, from + limit - 1);
  throwOnSupabaseError(error, 'Failed to list job fair drafts');

  return {
    items: ((data ?? []) as DraftListRow[]).map(mapDraftListItem),
    total: count ?? 0,
  };
}

export async function countOpenJobFairDrafts(): Promise<number> {
  const { total } = await listOpenJobFairDrafts(undefined, 1, 1);
  return total;
}

export async function getJobFairStats(todayYmd: string): Promise<JobFairStats> {
  const [summary, areas, openDrafts] = await Promise.all([
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
    countOpenJobFairDrafts(),
  ]);
  return {
    total: Number(summary[0]?.total ?? 0),
    today: Number(summary[0]?.today ?? 0),
    checkedIn: Number(summary[0]?.checked_in ?? 0),
    withResume: Number(summary[0]?.with_resume ?? 0),
    openDrafts,
    topAreas: areas.map((r) => ({ area: String(r.area), count: Number(r.count) })),
  };
}

export type JobFairActivityItem = {
  registrationNo: string;
  fullName: string;
};

export type JobFairActivityBucket = {
  count: number;
  /** Distinct registrations in this bucket, sorted by registration number. */
  items: JobFairActivityItem[];
};

export type JobFairActivityGroupStat = {
  label: string;
  registeredToday: JobFairActivityBucket;
  registeredWeek: JobFairActivityBucket;
  checkedInToday: JobFairActivityBucket;
  checkedInWeek: JobFairActivityBucket;
};

export type JobFairActivityStats = {
  /** Every submitted registration for this event. */
  registeredTotal: JobFairActivityBucket;
  registeredToday: JobFairActivityBucket;
  registeredWeek: JobFairActivityBucket;
  checkedInToday: JobFairActivityBucket;
  checkedInWeek: JobFairActivityBucket;
  /** Drafts whose mobile does not already have a submitted registration. */
  draftsTotal: JobFairActivityBucket;
  /** Open drafts created since midnight IST. */
  draftsToday: JobFairActivityBucket;
  /** Open drafts grouped by resume step (0 personal … 4 review). */
  draftsByStep: JobFairDraftStepStat[];
  byArea: JobFairActivityGroupStat[];
};

export type JobFairDraftStepStat = {
  step: number;
  bucket: JobFairActivityBucket;
};

const DRAFT_STEP_COUNT = 5;

type JobFairActivityRow = {
  registration_no: string;
  full_name: string;
  area: string;
  area_other: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

type ActivitySets = {
  registeredToday: Map<string, JobFairActivityItem>;
  registeredWeek: Map<string, JobFairActivityItem>;
  checkedInToday: Map<string, JobFairActivityItem>;
  checkedInWeek: Map<string, JobFairActivityItem>;
};

const ACTIVITY_COLUMNS =
  'registration_no, full_name, area, area_other, status, created_at, updated_at';

function makeActivitySets(): ActivitySets {
  return {
    registeredToday: new Map(),
    registeredWeek: new Map(),
    checkedInToday: new Map(),
    checkedInWeek: new Map(),
  };
}

function toActivityBucket(ids: Map<string, JobFairActivityItem>): JobFairActivityBucket {
  const items = Array.from(ids.values()).sort((a, b) =>
    a.registrationNo.localeCompare(b.registrationNo, undefined, { numeric: true }),
  );
  return { count: items.length, items };
}

function setsToGroupStat(label: string, sets: ActivitySets): JobFairActivityGroupStat {
  return {
    label,
    registeredToday: toActivityBucket(sets.registeredToday),
    registeredWeek: toActivityBucket(sets.registeredWeek),
    checkedInToday: toActivityBucket(sets.checkedInToday),
    checkedInWeek: toActivityBucket(sets.checkedInWeek),
  };
}

function areaLabel(row: JobFairActivityRow): string {
  if (row.area === 'other') {
    const other = row.area_other?.trim();
    return other ? `Other: ${other}` : optionLabel(AREA_OPTIONS, 'other');
  }
  return optionLabel(AREA_OPTIONS, row.area);
}

const ACTIVITY_PAGE = 1000;

async function fetchActivityPages<T>(
  label: string,
  run: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: Parameters<typeof throwOnSupabaseError>[0];
  }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += ACTIVITY_PAGE) {
    const { data, error } = await run(from, from + ACTIVITY_PAGE - 1);
    throwOnSupabaseError(error, label);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < ACTIVITY_PAGE) return rows;
  }
}

function draftDisplayName(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const values = (payload as { values?: { fullName?: unknown } }).values;
  return typeof values?.fullName === 'string' ? values.fullName.trim() : '';
}

/**
 * Job fair activity for the dashboard: all-time and today registrations and
 * open drafts, plus distinct registrations created or checked in since Monday
 * 00:00 IST. A check-in is any status other than `registered`; its time is
 * `updated_at` from the check-in.
 */
export async function getJobFairActivityStats(): Promise<JobFairActivityStats> {
  const weekStart = startOfWeekIST();
  const todayStart = startOfDayIST();
  const weekIso = weekStart.toISOString();
  const registeredMobiles = await registeredMobilesForEvent();

  const openDraftsQuery = () => {
    let query = supabase
      .from('JobFairRegistrationDraft')
      .select('mobile, step, payload, created_at')
      .eq('event_code', JOB_FAIR_EVENT.code)
      .order('created_at', { ascending: false });
    if (registeredMobiles.length > 0) {
      query = query.not('mobile', 'in', `(${registeredMobiles.join(',')})`);
    }
    return query;
  };

  const [weekRegistered, checkedInRows, allRegistered, openDrafts] =
    await Promise.all([
      fetchActivityPages<JobFairActivityRow>(
        'Failed to get job fair registrations',
        (from, to) =>
          supabase
            .from('JobFairRegistration')
            .select(ACTIVITY_COLUMNS)
            .eq('event_code', JOB_FAIR_EVENT.code)
            .gte('created_at', weekIso)
            .order('registration_no')
            .range(from, to),
      ),
      fetchActivityPages<JobFairActivityRow>(
        'Failed to get job fair check-ins',
        (from, to) =>
          supabase
            .from('JobFairRegistration')
            .select(ACTIVITY_COLUMNS)
            .eq('event_code', JOB_FAIR_EVENT.code)
            .neq('status', 'registered')
            .gte('updated_at', weekIso)
            .order('registration_no')
            .range(from, to),
      ),
      fetchActivityPages<{
        registration_no: string;
        full_name: string;
        created_at: string;
      }>('Failed to get job fair registration totals', (from, to) =>
        supabase
          .from('JobFairRegistration')
          .select('registration_no, full_name, created_at')
          .eq('event_code', JOB_FAIR_EVENT.code)
          .order('registration_no')
          .range(from, to),
      ),
      fetchActivityPages<{
        mobile: string;
        step: number;
        payload: unknown;
        created_at: string;
      }>('Failed to get job fair drafts', (from, to) =>
        openDraftsQuery().range(from, to),
      ),
    ]);

  const registeredTotal = new Map<string, JobFairActivityItem>();
  const registeredToday = new Map<string, JobFairActivityItem>();
  for (const row of allRegistered) {
    const item: JobFairActivityItem = {
      registrationNo: row.registration_no,
      fullName: row.full_name,
    };
    registeredTotal.set(item.registrationNo, item);
    if (parseInstant(row.created_at) >= todayStart) {
      registeredToday.set(item.registrationNo, item);
    }
  }

  const draftsTotal = new Map<string, JobFairActivityItem>();
  const draftsToday = new Map<string, JobFairActivityItem>();
  const draftsByStepMaps = Array.from(
    { length: DRAFT_STEP_COUNT },
    () => new Map<string, JobFairActivityItem>(),
  );
  for (const row of openDrafts) {
    const item: JobFairActivityItem = {
      registrationNo: row.mobile,
      fullName: draftDisplayName(row.payload) || row.mobile,
    };
    draftsTotal.set(item.registrationNo, item);
    if (parseInstant(row.created_at) >= todayStart) {
      draftsToday.set(item.registrationNo, item);
    }
    const step = Number.isFinite(Number(row.step))
      ? Math.min(Math.max(0, Math.trunc(Number(row.step))), DRAFT_STEP_COUNT - 1)
      : 0;
    draftsByStepMaps[step].set(item.registrationNo, item);
  }

  const byNo = new Map<string, JobFairActivityRow>();
  for (const row of [...weekRegistered, ...checkedInRows]) {
    byNo.set(row.registration_no, row);
  }

  const overall = makeActivitySets();
  const perArea = new Map<string, ActivitySets>();

  for (const row of byNo.values()) {
    const item: JobFairActivityItem = {
      registrationNo: row.registration_no,
      fullName: row.full_name,
    };
    const createdAt = parseInstant(row.created_at);
    const checkedInAt =
      row.status !== 'registered' ? parseInstant(row.updated_at) : null;
    const area = areaLabel(row);
    let areaSets = perArea.get(area);
    if (!areaSets) {
      areaSets = makeActivitySets();
      perArea.set(area, areaSets);
    }

    if (createdAt >= weekStart) {
      overall.registeredWeek.set(item.registrationNo, item);
      areaSets.registeredWeek.set(item.registrationNo, item);
      if (createdAt >= todayStart) {
        overall.registeredToday.set(item.registrationNo, item);
        areaSets.registeredToday.set(item.registrationNo, item);
      }
    }
    if (checkedInAt && checkedInAt >= weekStart) {
      overall.checkedInWeek.set(item.registrationNo, item);
      areaSets.checkedInWeek.set(item.registrationNo, item);
      if (checkedInAt >= todayStart) {
        overall.checkedInToday.set(item.registrationNo, item);
        areaSets.checkedInToday.set(item.registrationNo, item);
      }
    }
  }

  const byArea = Array.from(perArea.entries())
    .map(([label, sets]) => setsToGroupStat(label, sets))
    .filter(
      (group) =>
        group.registeredWeek.count > 0 || group.checkedInWeek.count > 0,
    )
    .sort((a, b) => {
      const byRegistered = b.registeredWeek.count - a.registeredWeek.count;
      if (byRegistered !== 0) return byRegistered;
      const byCheckedIn = b.checkedInWeek.count - a.checkedInWeek.count;
      if (byCheckedIn !== 0) return byCheckedIn;
      return a.label.localeCompare(b.label);
    });

  return {
    ...setsToGroupStat('', overall),
    registeredTotal: toActivityBucket(registeredTotal),
    registeredToday: toActivityBucket(registeredToday),
    draftsTotal: toActivityBucket(draftsTotal),
    draftsToday: toActivityBucket(draftsToday),
    draftsByStep: draftsByStepMaps.map((ids, step) => ({
      step,
      bucket: toActivityBucket(ids),
    })),
    byArea,
  };
}

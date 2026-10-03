import 'server-only';

import { throwOnSupabaseError } from '@/lib/db/errors';
import { TABLES } from '@/lib/db/schema';
import { findOrCreateVisitor } from '@/lib/db/visitor-queries';
import { normalizeEpicNumber } from '@/lib/epic/normalize-epic';
import {
  JOB_FAIR_VISIT_SERVICE,
  type JobFairCheckInRecord,
  type JobFairCheckInVisitor,
} from '@/lib/job-fair/check-in';
import {
  AREA_OPTIONS,
  AREA_OTHER,
  JOB_FAIR_EVENT,
  optionLabel,
} from '@/lib/job-fair/options';
import { EPIC_NUMBER_PATTERN } from '@/lib/job-fair/schema';
import { supabase } from '@/lib/supabase/server';

const COLUMNS =
  'id, registration_no, full_name, mobile, whatsapp, age, gender, area, area_other, pincode, epic_number, qualification, course, employment_status, experience, job_types, job_type_other, status';

type Row = {
  id: string;
  registration_no: string;
  full_name: string;
  mobile: string;
  whatsapp: string;
  age: number;
  gender: string;
  area: string;
  area_other: string | null;
  pincode: string;
  epic_number: string | null;
  qualification: string;
  course: string | null;
  employment_status: string;
  experience: string;
  job_types: string[] | null;
  job_type_other: string | null;
  status: string;
};

function mapRow(row: Row): JobFairCheckInRecord {
  return {
    id: row.id,
    registrationNo: row.registration_no,
    fullName: row.full_name,
    mobile: row.mobile,
    whatsapp: row.whatsapp,
    age: Number(row.age),
    gender: row.gender,
    area: row.area,
    areaOther: row.area_other,
    pincode: row.pincode,
    epicNumber: row.epic_number,
    qualification: row.qualification,
    course: row.course,
    employmentStatus: row.employment_status,
    experience: row.experience,
    jobTypes: row.job_types ?? [],
    jobTypeOther: row.job_type_other,
    status: row.status,
  };
}

export async function getJobFairCheckInByCode(
  code: string,
): Promise<JobFairCheckInRecord | null> {
  const { data, error } = await supabase
    .from('JobFairRegistration')
    .select(COLUMNS)
    .eq('event_code', JOB_FAIR_EVENT.code)
    .eq('registration_no', code)
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to look up job fair registration');
  return data ? mapRow(data as Row) : null;
}

function visitLocation(registration: JobFairCheckInRecord): string {
  const area =
    registration.area === AREA_OTHER
      ? registration.areaOther?.trim() || 'Other'
      : optionLabel(AREA_OPTIONS, registration.area);
  return `${area}, ${registration.pincode}`;
}

/** Visitor.voter_id must exist on the roll. Unknown EPICs are stored only on the registration. */
async function voterIdOnRoll(epicNumber: string | null): Promise<string | null> {
  if (!epicNumber || !EPIC_NUMBER_PATTERN.test(epicNumber)) return null;
  const epic = normalizeEpicNumber(epicNumber);
  const { data, error } = await supabase
    .from(TABLES.voterMaster)
    .select('epic_number')
    .eq('epic_number', epic)
    .maybeSingle();
  throwOnSupabaseError(error, 'Failed to look up voter');
  return data?.epic_number ? String(data.epic_number) : null;
}

export async function checkInJobFairRegistration(
  code: string,
  createdBy: string,
): Promise<{
  registration: JobFairCheckInRecord;
  visitor: JobFairCheckInVisitor;
  alreadyCheckedIn: boolean;
} | null> {
  const existing = await getJobFairCheckInByCode(code);
  if (!existing) return null;

  const alreadyCheckedIn = existing.status !== 'registered';
  let registration = existing;

  if (!alreadyCheckedIn) {
    const { data, error } = await supabase
      .from('JobFairRegistration')
      .update({ status: 'attended', updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('status', 'registered')
      .select(COLUMNS)
      .maybeSingle();
    throwOnSupabaseError(error, 'Failed to check in registration');
    if (data) {
      registration = mapRow(data as Row);
    } else {
      registration = (await getJobFairCheckInByCode(code)) ?? existing;
    }
  }

  const visitor = await findOrCreateVisitor({
    name: registration.fullName,
    mobileNumber: registration.mobile,
    voterId: await voterIdOnRoll(registration.epicNumber),
    location: visitLocation(registration),
    serviceName: JOB_FAIR_VISIT_SERVICE,
    createdBy,
  });

  return {
    registration,
    alreadyCheckedIn,
    visitor: {
      id: visitor.id,
      token: visitor.token,
      name: visitor.name,
      mobileNumber: visitor.mobileNumber,
      serviceName: visitor.serviceName,
    },
  };
}

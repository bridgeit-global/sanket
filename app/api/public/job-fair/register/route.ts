import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase/server';
import { sanitizeStorageKeySegment } from '@/lib/storage/object-key';
import {
  JOB_FAIR_RESUME_BUCKET,
  getJobFairRegistrationNoByMobile,
  insertJobFairRegistration,
  setJobFairRegistrationResume,
} from '@/lib/db/job-fair-queries';
import { JOB_FAIR_EVENT } from '@/lib/job-fair/options';
import {
  parseJobFairRegistration,
  validateResumeFile,
} from '@/lib/job-fair/schema';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 6 * 1024 * 1024;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === '23505'
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Upload is too large. Resume must be 5 MB or smaller.' },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form submission' }, { status: 400 });
  }

  // Honeypot: real users never see or fill this field.
  if (String(form.get('website') ?? '').trim()) {
    return NextResponse.json({ ok: true, registrationNo: null });
  }

  const raw = {
    fullName: String(form.get('fullName') ?? ''),
    mobile: String(form.get('mobile') ?? ''),
    whatsapp: String(form.get('whatsapp') ?? ''),
    age: String(form.get('age') ?? ''),
    gender: String(form.get('gender') ?? ''),
    area: String(form.get('area') ?? ''),
    areaOther: String(form.get('areaOther') ?? ''),
    pincode: String(form.get('pincode') ?? ''),
    epicNumber: String(form.get('epicNumber') ?? ''),
    qualification: String(form.get('qualification') ?? ''),
    course: String(form.get('course') ?? ''),
    employmentStatus: String(form.get('employmentStatus') ?? ''),
    experience: String(form.get('experience') ?? ''),
    jobTypes: form.getAll('jobTypes').map(String),
    jobTypeOther: String(form.get('jobTypeOther') ?? ''),
    heardFrom: String(form.get('heardFrom') ?? ''),
  };

  const parsed = parseJobFairRegistration(raw);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: 'Please correct the highlighted fields', fieldErrors: parsed.errors },
      { status: 400 },
    );
  }

  const resumeEntry = form.get('resume');
  const resume =
    resumeEntry instanceof File && resumeEntry.size > 0 ? resumeEntry : null;
  if (resume) {
    const resumeError = validateResumeFile(resume);
    if (resumeError) {
      return NextResponse.json(
        { error: resumeError, fieldErrors: { resume: resumeError } },
        { status: 400 },
      );
    }
  }

  const data = parsed.data;

  try {
    const existing = await getJobFairRegistrationNoByMobile(data.mobile);
    if (existing) {
      return NextResponse.json(
        { error: 'already_registered', registrationNo: existing },
        { status: 409 },
      );
    }

    let created: { id: string; registrationNo: string };
    try {
      created = await insertJobFairRegistration(data);
    } catch (error) {
      if (isUniqueViolation(error)) {
        const registrationNo = await getJobFairRegistrationNoByMobile(data.mobile);
        return NextResponse.json(
          { error: 'already_registered', registrationNo },
          { status: 409 },
        );
      }
      throw error;
    }

    let resumeUploaded = false;
    if (resume) {
      const storagePath = `${JOB_FAIR_EVENT.code}/${created.id}/${sanitizeStorageKeySegment(resume.name)}`;
      const { error } = await supabase.storage
        .from(JOB_FAIR_RESUME_BUCKET)
        .upload(storagePath, await resume.arrayBuffer(), {
          contentType: resume.type || 'application/octet-stream',
          upsert: false,
        });
      if (error) {
        console.error('Job fair resume upload failed:', error);
      } else {
        await setJobFairRegistrationResume(created.id, {
          storagePath,
          fileName: resume.name.slice(0, 255),
          sizeKb: Math.max(1, Math.round(resume.size / 1024)),
        });
        resumeUploaded = true;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        registrationNo: created.registrationNo,
        resumeUploaded: resume ? resumeUploaded : null,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Job fair registration failed:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}

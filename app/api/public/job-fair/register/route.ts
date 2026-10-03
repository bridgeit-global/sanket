import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase/server';
import { sanitizeStorageKeySegment } from '@/lib/storage/object-key';
import {
  JOB_FAIR_RESUME_BUCKET,
  getJobFairRegistrationByMobile,
  insertJobFairRegistration,
  setJobFairRegistrationResume,
  updateJobFairRegistration,
  upsertJobFairDraft,
} from '@/lib/db/job-fair-queries';
import { JOB_FAIR_EVENT, JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT } from '@/lib/job-fair/options';
import {
  jobFairRegistrationToFormValues,
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
    const existing = await getJobFairRegistrationByMobile(data.mobile);
    let id: string;
    let registrationNo: string;
    let updated = false;
    let receiptDownloadCount = 0;

    if (existing) {
      const saved = await updateJobFairRegistration(data);
      id = saved.id;
      registrationNo = saved.registrationNo;
      receiptDownloadCount = saved.receiptDownloadCount;
      updated = true;
    } else {
      try {
        const created = await insertJobFairRegistration(data);
        id = created.id;
        registrationNo = created.registrationNo;
      } catch (error) {
        if (isUniqueViolation(error)) {
          const again = await getJobFairRegistrationByMobile(data.mobile);
          if (!again) throw error;
          const saved = await updateJobFairRegistration(data);
          id = saved.id;
          registrationNo = saved.registrationNo;
          receiptDownloadCount = saved.receiptDownloadCount;
          updated = true;
        } else {
          throw error;
        }
      }
    }

    let resumeUploaded = false;
    if (resume) {
      const storagePath = `${JOB_FAIR_EVENT.code}/${id}/${sanitizeStorageKeySegment(resume.name)}`;
      const { error } = await supabase.storage
        .from(JOB_FAIR_RESUME_BUCKET)
        .upload(storagePath, await resume.arrayBuffer(), {
          contentType: resume.type || 'application/octet-stream',
          upsert: true,
        });
      if (error) {
        console.error('Job fair resume upload failed:', error);
      } else {
        await setJobFairRegistrationResume(id, {
          storagePath,
          fileName: resume.name.slice(0, 255),
          sizeKb: Math.max(1, Math.round(resume.size / 1024)),
        });
        resumeUploaded = true;
      }
    }

    try {
      await upsertJobFairDraft({
        mobile: data.mobile,
        step: 4,
        values: jobFairRegistrationToFormValues({
          fullName: data.fullName,
          mobile: data.mobile,
          whatsapp: data.whatsapp,
          age: Number(data.age),
          gender: data.gender,
          area: data.area,
          areaOther: data.areaOther ?? null,
          pincode: data.pincode,
          epicNumber: data.epicNumber ?? null,
          qualification: data.qualification,
          course: data.course ?? null,
          employmentStatus: data.employmentStatus,
          experience: data.experience,
          jobTypes: [...data.jobTypes],
          jobTypeOther: data.jobTypeOther ?? null,
          heardFrom: data.heardFrom ?? null,
        }),
        sameAsMobile: data.whatsapp === data.mobile,
        savedAt: Date.now(),
      });
    } catch (error) {
      console.error('Job fair draft sync failed:', error);
    }

    return NextResponse.json(
      {
        ok: true,
        updated,
        registrationNo,
        resumeUploaded: resume ? resumeUploaded : null,
        receiptDownloadsRemaining: Math.max(
          0,
          JOB_FAIR_RECEIPT_DOWNLOAD_LIMIT - receiptDownloadCount,
        ),
      },
      { status: updated ? 200 : 201 },
    );
  } catch (error) {
    console.error('Job fair registration failed:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 },
    );
  }
}

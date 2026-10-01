import { NextResponse } from 'next/server';

import { supabase } from '@/lib/supabase/server';
import {
  JOB_FAIR_RESUME_BUCKET,
  getJobFairRegistrationById,
} from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { id } = await params;
    if (!UUID.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const registration = await getJobFairRegistrationById(id);
    if (!registration?.resumeStoragePath) {
      return NextResponse.json({ error: 'No resume uploaded' }, { status: 404 });
    }

    const { data, error: signError } = await supabase.storage
      .from(JOB_FAIR_RESUME_BUCKET)
      .createSignedUrl(registration.resumeStoragePath, 300, {
        download: registration.resumeFileName ?? true,
      });
    if (signError || !data?.signedUrl) {
      console.error('Job fair resume signed URL failed:', signError);
      return NextResponse.json({ error: 'Could not open resume' }, { status: 502 });
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (err) {
    console.error('Error opening job fair resume:', err);
    return NextResponse.json({ error: 'Could not open resume' }, { status: 500 });
  }
}

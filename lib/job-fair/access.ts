import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';
import { JOB_FAIR_MODULE_KEY } from '@/lib/job-fair/options';
import type { JobFairListFilters } from '@/lib/db/job-fair-queries';
import { NextResponse } from 'next/server';

export async function requireJobFairAccess() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const hasAccess = await hasModuleAccess(session.user.id, JOB_FAIR_MODULE_KEY);
  if (!hasAccess) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/** Job-fair desk or the visitor desk can look up a receipt and add a visitor. */
export async function requireJobFairCheckInAccess() {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const [jobFair, operator] = await Promise.all([
    hasModuleAccess(session.user.id, JOB_FAIR_MODULE_KEY),
    hasModuleAccess(session.user.id, 'operator'),
  ]);
  if (!jobFair && !operator) {
    return {
      session: null,
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { session, error: null };
}

export function parseJobFairFilters(searchParams: URLSearchParams): JobFairListFilters {
  const get = (key: string) => searchParams.get(key)?.trim() || undefined;
  return {
    search: get('search'),
    area: get('area'),
    qualification: get('qualification'),
    experience: get('experience'),
    jobType: get('jobType'),
    from: get('from'),
    to: get('to'),
  };
}

import { type NextRequest, NextResponse } from 'next/server';

import {
  getJobFairStats,
  listJobFairRegistrations,
} from '@/lib/db/job-fair-queries';
import { parseJobFairFilters, requireJobFairAccess } from '@/lib/job-fair/access';
import { getTodayDateStringIST } from '@/lib/ist-date';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));

    const [list, stats] = await Promise.all([
      listJobFairRegistrations(parseJobFairFilters(searchParams), page, limit),
      getJobFairStats(getTodayDateStringIST()),
    ]);

    return NextResponse.json({ ...list, page, limit, stats });
  } catch (err) {
    console.error('Error listing job fair registrations:', err);
    return NextResponse.json(
      { error: 'Failed to load registrations' },
      { status: 500 },
    );
  }
}

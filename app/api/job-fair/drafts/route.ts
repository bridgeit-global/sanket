import { type NextRequest, NextResponse } from 'next/server';

import { listOpenJobFairDrafts } from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
    const search = searchParams.get('search')?.trim() || undefined;

    const list = await listOpenJobFairDrafts(search, page, limit);
    return NextResponse.json({ ...list, page, limit });
  } catch (err) {
    console.error('Error listing job fair drafts:', err);
    return NextResponse.json(
      { error: 'Failed to load drafts' },
      { status: 500 },
    );
  }
}

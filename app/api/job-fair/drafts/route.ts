import { type NextRequest, NextResponse } from 'next/server';

import {
  type JobFairDraftWhatsappFilter,
  listOpenJobFairDrafts,
} from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 10));
    const search = searchParams.get('search')?.trim() || undefined;
    const from = searchParams.get('from')?.trim() || undefined;
    const to = searchParams.get('to')?.trim() || undefined;
    const stepRaw = searchParams.get('step')?.trim() ?? '';
    const step = /^[0-4]$/.test(stepRaw) ? Number(stepRaw) : undefined;
    const whatsappRaw = searchParams.get('whatsapp')?.trim() ?? '';
    const whatsapp: JobFairDraftWhatsappFilter | undefined =
      whatsappRaw === 'verified' || whatsappRaw === 'unverified'
        ? whatsappRaw
        : undefined;

    const list = await listOpenJobFairDrafts(search, page, limit, {
      from,
      to,
      step,
      whatsapp,
    });
    return NextResponse.json({ ...list, page, limit });
  } catch (err) {
    console.error('Error listing job fair drafts:', err);
    return NextResponse.json(
      { error: 'Failed to load drafts' },
      { status: 500 },
    );
  }
}

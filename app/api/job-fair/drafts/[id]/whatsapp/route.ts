import { NextResponse } from 'next/server';

import { markJobFairDraftWhatsappVerified } from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing draft' }, { status: 400 });
    }

    const result = await markJobFairDraftWhatsappVerified(id);
    if (!result) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Error marking job fair draft WhatsApp verified:', err);
    return NextResponse.json(
      { error: 'Failed to mark WhatsApp verified' },
      { status: 500 },
    );
  }
}

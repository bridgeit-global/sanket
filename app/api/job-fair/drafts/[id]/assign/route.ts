import { NextResponse } from 'next/server';

import { assignJobFairDraft } from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireJobFairAccess();
    if (error || !session) return error;

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Missing draft' }, { status: 400 });
    }

    const body = (await request.json()) as { assignedTo?: unknown };
    const raw = body.assignedTo;
    const assignedTo =
      raw === null || raw === ''
        ? null
        : typeof raw === 'string' && UUID.test(raw)
          ? raw
          : undefined;
    if (assignedTo === undefined) {
      return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 });
    }

    const result = await assignJobFairDraft(id, assignedTo);
    if (!result) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error('Error assigning job fair draft:', err);
    const message = err instanceof Error ? err.message : '';
    if (message === 'Assignee does not have job fair access') {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to assign draft' },
      { status: 500 },
    );
  }
}

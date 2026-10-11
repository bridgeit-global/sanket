import { NextResponse } from 'next/server';

import {
  addJobFairDraftLog,
  listJobFairDraftLogs,
} from '@/lib/db/job-fair-queries';
import { requireJobFairAccess } from '@/lib/job-fair/access';

export async function GET(
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

    const logs = await listJobFairDraftLogs(id);
    if (!logs) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ logs });
  } catch (err) {
    console.error('Error listing job fair draft logs:', err);
    return NextResponse.json(
      { error: 'Failed to load follow-up notes' },
      { status: 500 },
    );
  }
}

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

    const body = (await request.json().catch(() => null)) as {
      note?: unknown;
    } | null;
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    if (!note || note.length > 2000) {
      return NextResponse.json(
        { error: 'Enter a follow-up note (up to 2000 characters)' },
        { status: 400 },
      );
    }

    const log = await addJobFairDraftLog({
      draftId: id,
      note,
      createdBy: session.user.id,
    });
    if (!log) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
    }

    return NextResponse.json({ log });
  } catch (err) {
    console.error('Error adding job fair draft log:', err);
    return NextResponse.json(
      { error: 'Failed to save follow-up note' },
      { status: 500 },
    );
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import { addGovFollowUpLog } from '@/lib/db/gov-follow-up';
import { ChatSDKError } from '@/lib/errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;
    const { id } = await params;
    const body = await request.json();
    const matter = await addGovFollowUpLog({
      matterId: id,
      input: body,
      performedBy: session.user.id,
    });
    return NextResponse.json(matter, { status: 201 });
  } catch (err) {
    console.error('Error logging follow-up:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to log follow-up';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

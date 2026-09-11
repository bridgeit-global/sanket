import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import {
  getGovFollowUpMatterById,
  updateGovFollowUpMatter,
} from '@/lib/db/gov-follow-up';
import { ChatSDKError } from '@/lib/errors';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;
    const { id } = await params;
    const matter = await getGovFollowUpMatterById(id);
    if (!matter) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(matter);
  } catch (err) {
    console.error('Error loading follow-up matter:', err);
    return NextResponse.json(
      { error: 'Failed to load follow-up matter' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;
    const { id } = await params;
    const body = await request.json();
    const matter = await updateGovFollowUpMatter({
      id,
      patch: body,
      updatedBy: session.user.id,
    });
    return NextResponse.json(matter);
  } catch (err) {
    console.error('Error updating follow-up matter:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to update follow-up matter';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

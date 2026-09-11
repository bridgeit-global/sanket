import { type NextRequest, NextResponse } from 'next/server';
import { requireGovFollowUpAccess } from '@/lib/gov-follow-up/access';
import {
  createGovFollowUpMatter,
  listGovFollowUpMatters,
} from '@/lib/db/gov-follow-up';
import {
  isGovFollowUpChip,
  isGovFollowUpTab,
} from '@/lib/gov-follow-up/constants';
import { ChatSDKError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;
    const { searchParams } = new URL(request.url);
    const tabRaw = searchParams.get('tab');
    const chipRaw = searchParams.get('chip');
    const result = await listGovFollowUpMatters({
      tab: isGovFollowUpTab(tabRaw) ? tabRaw : 'today',
      chip: isGovFollowUpChip(chipRaw) ? chipRaw : '',
      search: searchParams.get('search') ?? '',
      departmentId: searchParams.get('departmentId') ?? '',
      locationId: searchParams.get('locationId') ?? '',
      officer: searchParams.get('officer') ?? '',
      staffUserId: searchParams.get('staffUserId') ?? '',
      status: searchParams.get('status') ?? '',
      visitDate: searchParams.get('visitDate') ?? '',
      page: Number(searchParams.get('page') ?? 1),
      limit: Number(searchParams.get('limit') ?? 10),
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error listing follow-up matters:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to list follow-up matters';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, error } = await requireGovFollowUpAccess();
    if (error || !session) return error;
    const body = await request.json();
    const matter = await createGovFollowUpMatter({
      input: body,
      createdBy: session.user.id,
    });
    return NextResponse.json(matter, { status: 201 });
  } catch (err) {
    console.error('Error creating follow-up matter:', err);
    const message =
      err instanceof ChatSDKError
        ? String(err.cause || err.message)
        : 'Failed to create follow-up matter';
    const status = err instanceof ChatSDKError ? err.statusCode : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

import { type NextRequest, NextResponse } from 'next/server';
import {
  searchVoterByEpicNumber,
  searchVoterByName,
  searchVoterByPhoneNumber,
} from '@/lib/db/queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { searchParams } = new URL(request.url);
  const epic = searchParams.get('epic');
  const name = searchParams.get('name');
  const phone = searchParams.get('phone');

  let voters: Awaited<ReturnType<typeof searchVoterByEpicNumber>> = [];
  if (epic) {
    voters = await searchVoterByEpicNumber(epic);
  } else if (name) {
    voters = await searchVoterByName(name);
  } else if (phone) {
    voters = await searchVoterByPhoneNumber(phone);
  }

  return NextResponse.json({ success: true, voters });
}

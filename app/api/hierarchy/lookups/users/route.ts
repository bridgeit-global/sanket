import { type NextRequest, NextResponse } from 'next/server';
import { searchUsersForCadre } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function GET(request: NextRequest) {
  const access = await requireHierarchyAccess();
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const q = new URL(request.url).searchParams.get('q') ?? '';
  if (!q.trim()) {
    return NextResponse.json({ success: true, users: [] });
  }

  const users = await searchUsersForCadre(q.trim());
  return NextResponse.json({ success: true, users });
}

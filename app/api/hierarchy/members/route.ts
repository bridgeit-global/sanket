import { NextResponse } from 'next/server';
import { createCadreMember } from '@/lib/db/cadre-queries';
import { requireHierarchyAccess } from '@/lib/hierarchy/auth';

export async function POST(request: Request) {
  const access = await requireHierarchyAccess(true);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const member = await createCadreMember(body, access.userId);
    return NextResponse.json({ success: true, member });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create member';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';

/** Category budget is now managed via fund records at /api/adm/categories/[id]/funds */
export async function PUT(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const hasAccess = await hasModuleAccess(session.user.id, 'adm');
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(
    {
      error:
        'Category master budget is replaced by fund records. Use POST /api/adm/categories/:id/funds',
    },
    { status: 410 },
  );
}

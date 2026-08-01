import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { hasModuleAccess } from '@/lib/db/queries';

/** Linking Projects-module rows into ADM funds is disabled (modules stay unlinked). */
export async function POST(_request: NextRequest) {
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
        'Linking Projects into ADM funds is disabled. Use the Projects and ADM modules separately.',
    },
    { status: 410 },
  );
}

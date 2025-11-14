import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getUserAccessibleModules } from '@/lib/module-access';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modules = await getUserAccessibleModules(session.user.id);
    // Return modules with all metadata
    return NextResponse.json(modules);
  } catch (error) {
    console.error('Error fetching user modules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user modules' },
      { status: 500 },
    );
  }
}


import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getAdmDashboard, hasModuleAccess } from '@/lib/db/queries';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasAccess = await hasModuleAccess(session.user.id, 'adm');
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dashboard = await getAdmDashboard();
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error fetching ADM dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ADM dashboard' },
      { status: 500 },
    );
  }
}

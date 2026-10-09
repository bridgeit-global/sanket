import { NextResponse } from 'next/server';
import { getVigilDashboard, requireVigilUser } from '@/lib/vigil/server';

export async function GET() {
  const current = await requireVigilUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getVigilDashboard(current.profile.id));
}

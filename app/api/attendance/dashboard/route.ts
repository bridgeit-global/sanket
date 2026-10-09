import { NextResponse } from 'next/server';
import { getAttendanceDashboard, requireAttendanceUser } from '@/lib/attendance/server';

export async function GET() {
  const current = await requireAttendanceUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json(await getAttendanceDashboard(current.profile.id));
}

import { NextResponse } from 'next/server';
import { getAttendanceDashboard, requireAttendanceUser } from '@/lib/attendance/server';

export async function GET() {
  const current = await requireAttendanceUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const data = await getAttendanceDashboard(current.profile.id);
  const isAdmin = current.profile.role === 'admin' || current.session.user.roleName === 'admin';
  return NextResponse.json({ ...data, isAdmin });
}

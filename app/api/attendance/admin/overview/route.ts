import { NextResponse } from 'next/server';
import { getAttendanceAdminData, requireAttendanceAdmin } from '@/lib/attendance/server';

export async function GET() {
  if (!(await requireAttendanceAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await getAttendanceAdminData());
}

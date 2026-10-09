import { NextResponse, type NextRequest } from 'next/server';
import { getRequestIp, requireAttendanceUser } from '@/lib/attendance/server';

export async function GET(request: NextRequest) {
  if (!(await requireAttendanceUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ip: getRequestIp(request) });
}

import { NextResponse, type NextRequest } from 'next/server';
import { isAttendanceQrToken, normalizeAttendanceQrToken } from '@/lib/attendance/qr-token';
import { createPunch, getRequestIp, requireAttendanceUser } from '@/lib/attendance/server';

export async function POST(request: NextRequest) {
  const current = await requireAttendanceUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const token = normalizeAttendanceQrToken(String(body.token || ''));
    const locationOnly = body.locationOnly === true;
    const mode = body.mode === 'clock_out' ? 'clock_out' : 'clock_in';
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if ((!locationOnly && !isAttendanceQrToken(token)) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'Allow location access. Office attendance also needs a valid 10-character QR code.' }, { status: 400 });
    }

    const log = await createPunch({
      userId: current.profile.id,
      token: locationOnly ? undefined : token,
      locationOnly,
      mode,
      latitude,
      longitude,
      ip: getRequestIp(request),
    });
    return NextResponse.json({ log });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Attendance could not be recorded.' }, { status: 400 });
  }
}

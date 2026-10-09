import { NextResponse, type NextRequest } from 'next/server';
import { createPunch, getRequestIp, requireVigilUser } from '@/lib/vigil/server';

export async function POST(request: NextRequest) {
  const current = await requireVigilUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const token = String(body.token || '').trim();
    const mode = body.mode === 'clock_out' ? 'clock_out' : 'clock_in';
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    if (!token || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: 'Scan a valid QR code and allow location access.' }, { status: 400 });
    }

    const log = await createPunch({ userId: current.profile.id, token, mode, latitude, longitude, ip: getRequestIp(request) });
    return NextResponse.json({ log });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Attendance could not be recorded.' }, { status: 400 });
  }
}

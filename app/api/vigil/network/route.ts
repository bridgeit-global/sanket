import { NextResponse, type NextRequest } from 'next/server';
import { getRequestIp, requireVigilUser } from '@/lib/vigil/server';

export async function GET(request: NextRequest) {
  if (!(await requireVigilUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ip: getRequestIp(request) });
}

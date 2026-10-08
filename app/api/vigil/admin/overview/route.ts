import { NextResponse } from 'next/server';
import { getVigilAdminData, requireVigilAdmin } from '@/lib/vigil/server';

export async function GET() {
  if (!(await requireVigilAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(await getVigilAdminData());
}

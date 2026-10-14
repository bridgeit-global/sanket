import { NextResponse, type NextRequest } from 'next/server';
import { requireAttendanceAdmin } from '@/lib/attendance/server';
import { supabase } from '@/lib/supabase/server';

const db = supabase as any;

export async function GET() {
  if (!(await requireAttendanceAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { data, error } = await db.from('OfficeAndSite').select('*').eq('is_active', true).order('name');
  if (error) return NextResponse.json({ error: 'Could not load sites' }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  if (!(await requireAttendanceAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const type = body.type === 'field_site' ? 'field_site' : 'office';
  const payload = { name: String(body.name || '').trim(), type, latitude: Number(body.latitude), longitude: Number(body.longitude), geofence_radius_meters: Number(body.geofence_radius_meters || (type === 'office' ? 20 : 100)) };
  if (!payload.name || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) return NextResponse.json({ error: 'Name and valid coordinates are required.' }, { status: 400 });
  const { data, error } = await db.from('OfficeAndSite').insert(payload).select('*').single();
  if (error) return NextResponse.json({ error: 'Could not create site.' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

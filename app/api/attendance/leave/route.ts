import { NextResponse, type NextRequest } from 'next/server';
import { requireAttendanceUser } from '@/lib/attendance/server';
import { supabase } from '@/lib/supabase/server';

const db = supabase as any;

export async function POST(request: NextRequest) {
  const current = await requireAttendanceUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const startDate = String(body.start_date || '');
  const endDate = String(body.end_date || '');
  const reason = String(body.reason || '').trim();
  if (!startDate || !endDate || !reason) return NextResponse.json({ error: 'Start date, end date, and reason are required.' }, { status: 400 });
  const { data, error } = await db.from('LeaveRequest').insert({ user_id: current.profile.id, start_date: startDate, end_date: endDate, reason }).select('*').single();
  if (error) return NextResponse.json({ error: 'Leave request could not be submitted.' }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

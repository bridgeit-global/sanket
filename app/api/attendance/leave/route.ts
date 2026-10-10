import { NextResponse, type NextRequest } from 'next/server';
import { requireAttendanceAdmin, requireAttendanceUser, reviewLeaveRequest } from '@/lib/attendance/server';
import { supabase } from '@/lib/supabase/server';

const db = supabase as any;

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest) {
  const current = await requireAttendanceUser();
  if (!current) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const startDate = String(body.start_date || '');
  const endDate = String(body.end_date || '');
  const reason = String(body.reason || '').trim();
  if (!isDateOnly(startDate) || !isDateOnly(endDate) || !reason) {
    return NextResponse.json({ error: 'Start date, end date, and reason are required.' }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: 'End date must be on or after the start date.' }, { status: 400 });
  }
  const { data, error } = await db
    .from('LeaveRequest')
    .insert({ user_id: current.profile.id, start_date: startDate, end_date: endDate, reason })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: 'Leave request could not be submitted.' }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const current = await requireAttendanceAdmin();
  if (!current) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || '');
  const status = body.status === 'approved' || body.status === 'rejected' ? body.status : null;
  if (!id || !status) return NextResponse.json({ error: 'A pending request and a decision are required.' }, { status: 400 });
  try {
    const data = await reviewLeaveRequest({ id, status, reviewerId: current.profile.id });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Leave request could not be updated.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

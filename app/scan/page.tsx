import { redirect } from 'next/navigation';
import { requireAttendanceUser } from '@/lib/attendance/server';
import { AttendanceScanner } from '@/components/attendance/attendance-scanner';

export default async function AttendanceScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  if (!(await requireAttendanceUser())) redirect('/login');
  const { mode } = await searchParams;
  return <AttendanceScanner initialMode={mode === 'clock_out' ? 'clock_out' : 'clock_in'} />;
}

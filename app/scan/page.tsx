import { redirect } from 'next/navigation';
import { requireAttendanceUser } from '@/lib/attendance/server';
import { AttendanceScanner } from '@/components/attendance/attendance-scanner';

export default async function AttendanceScanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; method?: string }>;
}) {
  if (!(await requireAttendanceUser())) redirect('/login');
  const { mode, method } = await searchParams;
  return (
    <AttendanceScanner
      initialMode={mode === 'clock_out' ? 'clock_out' : 'clock_in'}
      initialMethod={method === 'field' ? 'field' : 'qr'}
    />
  );
}

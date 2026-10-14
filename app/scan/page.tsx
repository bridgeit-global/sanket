import { redirect } from 'next/navigation';
import { requireAttendanceUser } from '@/lib/attendance/server';
import { AttendanceScanner } from '@/components/attendance/attendance-scanner';

export default async function AttendanceScanPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>;
}) {
  if (!(await requireAttendanceUser())) redirect('/login');
  const { method } = await searchParams;
  return (
    <AttendanceScanner
      initialMethod={method === 'field' ? 'field' : 'qr'}
    />
  );
}

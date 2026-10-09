import { redirect } from 'next/navigation';
import { requireAttendanceAdmin } from '@/lib/attendance/server';
import { AttendanceAdminSites } from '@/components/attendance/admin-sites';

export default async function AttendanceQrGeneratorPage() {
  if (!(await requireAttendanceAdmin())) redirect('/unauthorized');
  return <AttendanceAdminSites />;
}

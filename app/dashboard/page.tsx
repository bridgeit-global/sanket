import { redirect } from 'next/navigation';
import { requireAttendanceUser, getAttendanceDashboard } from '@/lib/attendance/server';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';

export default async function AttendanceDashboardPage() {
  const current = await requireAttendanceUser();
  if (!current) redirect('/login');
  const data = await getAttendanceDashboard(current.profile.id);
  return <AttendanceDashboard initialData={{ ...data, profile: data.profile || current.profile }} />;
}

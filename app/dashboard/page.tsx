import { redirect } from 'next/navigation';
import { requireAttendanceUser, getAttendanceDashboard } from '@/lib/attendance/server';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';

export default async function AttendanceDashboardPage() {
  const current = await requireAttendanceUser();
  if (!current) redirect('/login');
  const data = await getAttendanceDashboard(current.profile.id);
  const isAdmin = current.profile.role === 'admin' || current.session.user.roleName === 'admin';
  return <AttendanceDashboard initialData={{ ...data, profile: data.profile || current.profile, isAdmin }} />;
}

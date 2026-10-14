import { redirect } from 'next/navigation';
import { requireAttendanceAdmin, getAttendanceAdminData } from '@/lib/attendance/server';
import { AttendanceLeaveAdmin } from '@/components/attendance/leave-admin';

export default async function AttendanceLeaveAdminPage() {
  if (!(await requireAttendanceAdmin())) redirect('/unauthorized');
  return <AttendanceLeaveAdmin initialData={await getAttendanceAdminData()} />;
}

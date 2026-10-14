import { redirect } from 'next/navigation';
import { requireAttendanceAdmin, getAttendanceAdminData } from '@/lib/attendance/server';
import { AttendanceLiveOps } from '@/components/attendance/live-ops';

export default async function AttendanceLiveOpsPage() {
  if (!(await requireAttendanceAdmin())) redirect('/unauthorized');
  return <AttendanceLiveOps initialData={await getAttendanceAdminData()} />;
}

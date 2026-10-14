import { redirect } from 'next/navigation';
import { requireAttendanceAdmin, getAttendanceAdminData } from '@/lib/attendance/server';
import { AttendanceAuditLogs } from '@/components/attendance/audit-logs';

export default async function AttendanceAuditLogsPage() {
  if (!(await requireAttendanceAdmin())) redirect('/unauthorized');
  return <AttendanceAuditLogs initialData={await getAttendanceAdminData()} />;
}

import { redirect } from 'next/navigation';
import { requireVigilAdmin, getVigilAdminData } from '@/lib/vigil/server';
import { VigilAuditLogs } from '@/components/vigil/audit-logs';

export default async function VigilAuditLogsPage() {
  if (!(await requireVigilAdmin())) redirect('/unauthorized');
  return <VigilAuditLogs initialData={await getVigilAdminData()} />;
}

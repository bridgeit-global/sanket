import { redirect } from 'next/navigation';
import { requireVigilAdmin, getVigilAdminData } from '@/lib/vigil/server';
import { VigilLiveOps } from '@/components/vigil/live-ops';

export default async function VigilLiveOpsPage() {
  if (!(await requireVigilAdmin())) redirect('/unauthorized');
  return <VigilLiveOps initialData={await getVigilAdminData()} />;
}

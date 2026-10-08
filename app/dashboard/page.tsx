import { redirect } from 'next/navigation';
import { requireVigilUser, getVigilDashboard } from '@/lib/vigil/server';
import { VigilDashboard } from '@/components/vigil/vigil-dashboard';

export default async function VigilDashboardPage() {
  const current = await requireVigilUser();
  if (!current) redirect('/login');
  const data = await getVigilDashboard(current.profile.id);
  return <VigilDashboard initialData={{ ...data, profile: data.profile || current.profile }} />;
}

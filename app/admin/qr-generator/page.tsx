import { redirect } from 'next/navigation';
import { requireVigilAdmin } from '@/lib/vigil/server';
import { VigilAdminSites } from '@/components/vigil/admin-sites';

export default async function VigilQrGeneratorPage() {
  if (!(await requireVigilAdmin())) redirect('/unauthorized');
  return <VigilAdminSites />;
}

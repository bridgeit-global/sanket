import { redirect } from 'next/navigation';
import { requireVigilUser } from '@/lib/vigil/server';
import { VigilScanner } from '@/components/vigil/vigil-scanner';

export default async function VigilScanPage() {
  if (!(await requireVigilUser())) redirect('/login');
  return <VigilScanner />;
}

import type { Metadata } from 'next';

import { AppChrome } from '@/components/app-chrome';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Voter Analysis',
  description: 'Admin interface for voter analysis and management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}

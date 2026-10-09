import { AppChrome } from '@/components/app-chrome';

export default function AttendanceDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}

import { AppChrome } from '@/components/app-chrome';

export default function AttendanceScanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppChrome>{children}</AppChrome>;
}

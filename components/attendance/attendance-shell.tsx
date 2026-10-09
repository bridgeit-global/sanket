'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Activity, CalendarDays, ClipboardList, MapPin, QrCode, ScanLine, Settings, ShieldCheck } from 'lucide-react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { cn } from '@/lib/utils';

type AttendanceTab = {
  href: string;
  label: string;
  icon: typeof ScanLine;
  isActive: (path: string, hash: string) => boolean;
};

const staffTabs: AttendanceTab[] = [
  {
    href: '/scan',
    label: 'Scan',
    icon: ScanLine,
    isActive: (path: string) => path === '/scan',
  },
  {
    href: '/dashboard',
    label: 'Activity',
    icon: ClipboardList,
    isActive: (path: string, hash: string) => path === '/dashboard' && hash !== '#leave' && hash !== '#settings',
  },
  {
    href: '/dashboard#leave',
    label: 'Leave',
    icon: CalendarDays,
    isActive: (path: string, hash: string) => path === '/dashboard' && hash === '#leave',
  },
  {
    href: '/dashboard#settings',
    label: 'Settings',
    icon: Settings,
    isActive: (path: string, hash: string) => path === '/dashboard' && hash === '#settings',
  },
];

const adminTabs: AttendanceTab[] = [
  {
    href: '/admin/live-ops',
    label: 'Live ops',
    icon: Activity,
    isActive: (path: string) => path.startsWith('/admin/live-ops'),
  },
  {
    href: '/admin/qr-generator',
    label: 'QR',
    icon: QrCode,
    isActive: (path: string) => path.startsWith('/admin/qr-generator'),
  },
  {
    href: '/admin/audit-logs',
    label: 'Audit',
    icon: ClipboardList,
    isActive: (path: string) => path.startsWith('/admin/audit-logs'),
  },
];

function useLocationHash() {
  const pathname = usePathname();
  const [hash, setHash] = useState('');

  useEffect(() => {
    const read = () => setHash(window.location.hash);
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    return () => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
    };
  }, [pathname]);

  return [hash, setHash] as const;
}

export function AttendanceShell({ children, title = 'Attendance' }: { children: React.ReactNode; title?: string }) {
  const pathname = usePathname();
  const [hash, setHash] = useLocationHash();
  const isAdminArea = pathname.startsWith('/admin/');
  const links = isAdminArea ? adminTabs : staffTabs;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarToggle />
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
              <ShieldCheck className="size-5 shrink-0 text-primary" />
              <span className="truncate">{title}</span>
            </Link>
          </div>
          <Link href="/" className="shrink-0 text-sm text-muted-foreground">eOffice</Link>
        </div>
      </header>
      <main className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 py-5 sm:px-6">{children}</main>
      <nav className="sticky bottom-0 z-30 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className={cn('mx-auto grid max-w-5xl gap-1 py-2', isAdminArea ? 'grid-cols-3' : 'grid-cols-4')}>
          {links.map(({ href, label, icon: Icon, isActive }) => {
            const active = isActive(pathname, hash);
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  const index = href.indexOf('#');
                  const nextHash = index >= 0 ? href.slice(index) : '';
                  setHash(nextHash);
                  if (!nextHash && window.location.pathname === '/dashboard' && window.location.hash) {
                    window.history.replaceState(null, '', '/dashboard');
                  }
                }}
                className={cn(
                  'flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] sm:text-xs',
                  active ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Icon className="size-4 text-primary" />{children}</h2>;
}

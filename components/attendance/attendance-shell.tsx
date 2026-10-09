'use client';

import Link from 'next/link';
import { CalendarDays, ClipboardList, LogOut, MapPin, ScanLine, Settings, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export function VigilShell({ children, title = 'Vigil' }: { children: React.ReactNode; title?: string }) {
  const links = [
    { href: '/scan', label: 'Scan', icon: ScanLine },
    { href: '/dashboard', label: 'Activity', icon: ClipboardList },
    { href: '/dashboard#leave', label: 'Leave', icon: CalendarDays },
    { href: '/dashboard#settings', label: 'Settings', icon: Settings },
  ];
  return (
    <div className="min-h-dvh bg-background pb-24 text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5 text-primary" />{title}</Link>
          <Link href="/" className="text-sm text-muted-foreground">eOffice</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-4 gap-1 py-2">
          {links.map(({ href, label, icon: Icon }) => <Link key={label} href={href} className={cn('flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-xs text-muted-foreground hover:bg-muted hover:text-foreground')}><Icon className="size-5" />{label}</Link>)}
        </div>
      </nav>
    </div>
  );
}

export function SectionTitle({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Icon className="size-4 text-primary" />{children}</h2>;
}

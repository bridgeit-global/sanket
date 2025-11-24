'use client';

import Link from 'next/link';
import { useNavigationLoading } from '@/components/navigation-loading-provider';
import { useSidebar } from '@/components/ui/sidebar';
import type { ComponentProps } from 'react';

interface SidebarLinkProps extends ComponentProps<typeof Link> {
  children: React.ReactNode;
}

export function SidebarLink({ href, children, onClick, ...props }: SidebarLinkProps) {
  const { setLoading } = useNavigationLoading();
  const { setOpenMobile } = useSidebar();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setLoading(true);
    setOpenMobile(false);
    onClick?.(e);
  };

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}


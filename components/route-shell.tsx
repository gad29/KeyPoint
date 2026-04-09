'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/components/i18n';
import { PublicFrame } from '@/components/public-shell';
import { OfficeFrame } from '@/components/office-shell';

function usesOfficeChrome(pathname: string) {
  return (
    pathname.startsWith('/office') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/connections')
  );
}

function ShellRouter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (usesOfficeChrome(pathname)) {
    return <OfficeFrame>{children}</OfficeFrame>;
  }
  return <PublicFrame>{children}</PublicFrame>;
}

export function RouteShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ShellRouter>{children}</ShellRouter>
    </I18nProvider>
  );
}

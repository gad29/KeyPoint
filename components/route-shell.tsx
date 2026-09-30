'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/components/i18n';
import { PublicFrame } from '@/components/public-shell';
import { OfficeFrame } from '@/components/office-shell';
import { AdminFrame } from '@/components/admin-shell';
import { PageEnterMotion } from '@/components/page-enter-motion';
import type { AgencyBranding } from '@/lib/onboarding/types';

function usesAdminChrome(pathname: string) {
  return pathname.startsWith('/admin');
}

function usesOfficeChrome(pathname: string) {
  return (
    pathname.startsWith('/office') ||
    pathname.startsWith('/docs') ||
    pathname.startsWith('/connections')
  );
}

function ShellRouter({ children, branding }: { children: ReactNode; branding: AgencyBranding }) {
  const pathname = usePathname();
  if (usesAdminChrome(pathname)) {
    return <AdminFrame>{children}</AdminFrame>;
  }
  if (usesOfficeChrome(pathname)) {
    return <OfficeFrame>{children}</OfficeFrame>;
  }
  return <PublicFrame branding={branding}>{children}</PublicFrame>;
}

export function RouteShell({ children, branding }: { children: ReactNode; branding: AgencyBranding }) {
  return (
    <I18nProvider>
      <PageEnterMotion>
        <ShellRouter branding={branding}>{children}</ShellRouter>
      </PageEnterMotion>
    </I18nProvider>
  );
}

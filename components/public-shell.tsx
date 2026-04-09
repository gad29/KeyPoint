'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { LanguageSwitch, useI18n } from '@/components/i18n';

const copy = {
  en: { staff: 'Staff login', home: 'Home' },
  he: { staff: 'כניסת צוות', home: 'בית' },
};

export function PublicFrame({ children }: { children: ReactNode }) {
  const { language, dir } = useI18n();
  const t = copy[language];

  return (
    <div className="public-root" dir={dir}>
      <header className="public-topbar">
        <Link href="/" className="public-brand">
          KeyPoint
        </Link>
        <div className="public-topbar-actions">
          <Link href="/" className="public-nav-link">
            {t.home}
          </Link>
          <LanguageSwitch />
          <Link href="/login?next=/office" className="button button-compact">
            {t.staff}
          </Link>
        </div>
      </header>
      <main className="public-main">{children}</main>
    </div>
  );
}

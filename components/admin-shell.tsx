'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LanguageSwitch, useI18n } from '@/components/i18n';

const nav = [
  { href: '/admin', label: { en: 'Overview', he: 'סקירה' } },
  { href: '/office/active', label: { en: 'Office cases', he: 'תיקים במשרד' } },
  { href: '/', label: { en: 'Client site', he: 'אתר לקוחות' } },
];

const shellCopy = {
  en: {
    name: 'KeyPoint',
    title: 'Advisor',
    subtitle: 'Income, expenses, and billing automations.',
  },
  he: {
    name: 'KeyPoint',
    title: 'יועץ',
    subtitle: 'הכנסות, הוצאות ואוטומציות חיוב.',
  },
};

export function AdminFrame({ children }: { children: ReactNode }) {
  const { language, dir } = useI18n();
  const copy = shellCopy[language];
  const pathname = usePathname();

  return (
    <div className="shell admin-shell" dir={dir}>
      <aside className="sidebar admin-sidebar">
        <div className="sidebar-top">
          <div>
            <p className="eyebrow">{copy.name}</p>
            <h1>{copy.title}</h1>
            <p className="muted">{copy.subtitle}</p>
          </div>
          <div className="sidebar-actions">
            <LanguageSwitch />
          </div>
        </div>
        <nav className="nav">
          {nav.map((item) => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname === item.href;
            return (
              <Link key={item.href} href={item.href as never} className={active ? 'active' : undefined}>
                {item.label[language]}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { LanguageSwitch, useI18n } from '@/components/i18n';

const nav = [
  { href: '/office/active', label: { en: 'In progress', he: 'בתהליך' } },
  { href: '/office/stuck', label: { en: 'Blocked', he: 'תקועים' } },
  { href: '/office/completed', label: { en: 'Done', he: 'הושלמו' } },
  { href: '/docs', label: { en: 'Docs', he: 'מסמכים' } },
  { href: '/connections', label: { en: 'Status', he: 'חיבורים' } },
  { href: '/', label: { en: 'Client site', he: 'אתר לקוחות' } },
];

const shellCopy = {
  en: {
    name: 'KeyPoint',
    title: 'Office',
    subtitle: 'Cases, documents, stages, offers.',
  },
  he: {
    name: 'KeyPoint',
    title: 'משרד',
    subtitle: 'תיקים, מסמכים, שלבים והצעות.',
  },
};

export function OfficeFrame({ children }: { children: ReactNode }) {
  const { language, dir } = useI18n();
  const copy = shellCopy[language];
  const pathname = usePathname();

  return (
    <div className="shell" dir={dir}>
      <aside className="sidebar">
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
            const active = pathname === item.href;
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

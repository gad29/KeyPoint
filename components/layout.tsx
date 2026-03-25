'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { I18nProvider, LanguageSwitch, useI18n } from '@/components/i18n';

const nav = [
  { href: '/', label: { en: 'Home', he: 'דף הבית' } },
  { href: '/intake', label: { en: 'New Case', he: 'פתיחת תיק' } },
  { href: '/portal', label: { en: 'Client Portal', he: 'אזור לקוחות' } },
  { href: '/office', label: { en: 'Office', he: 'משרד' } },
];

const shellCopy = {
  en: {
    name: 'KeyPoint',
    title: 'Mortgage case management, built for real work',
    subtitle: 'A clean bilingual workspace for intake, case progress, client communication, and document collection.',
  },
  he: {
    name: 'KeyPoint',
    title: 'ניהול תיקי משכנתא — בצורה מסודרת, ברורה ומקצועית',
    subtitle: 'מערכת דו-לשונית לניהול לידים, פתיחת תיקים, מעקב התקדמות, תקשורת עם לקוחות ואיסוף מסמכים.',
  },
};

function AppFrame({ children }: { children: ReactNode }) {
  const { language, dir } = useI18n();
  const copy = shellCopy[language];

  return (
    <div className="shell" dir={dir}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div>
            <p className="eyebrow">{copy.name}</p>
            <h1>{copy.title}</h1>
            <p className="muted">{copy.subtitle}</p>
          </div>
          <LanguageSwitch />
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href as never}>
              {item.label[language]}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AppFrame>{children}</AppFrame>
    </I18nProvider>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <section className="card stat-card">
      <p className="eyebrow">{label}</p>
      <h3>{value}</h3>
      <p className="muted">{hint}</p>
    </section>
  );
}

'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { I18nProvider, LanguageSwitch, useI18n } from '@/components/i18n';

const nav = [
  { href: '/', label: { en: 'Home', he: 'דף הבית' } },
  { href: '/intake', label: { en: 'Start intake', he: 'פתיחת תיק' } },
];

const shellCopy = {
  en: {
    name: 'KeyPoint',
    title: 'Mortgage cases without the clutter',
    subtitle: 'Client intake, progress tracking, office review, and offers in one focused workspace.',
    office: 'Office',
  },
  he: {
    name: 'KeyPoint',
    title: 'ניהול תיקי משכנתא בלי רעש מיותר',
    subtitle: 'פתיחת תיק, מעקב התקדמות, עבודה משרדית והצעות בנקים במקום אחד.',
    office: 'משרד',
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
          <div className="sidebar-actions">
            <LanguageSwitch />
            <Link className="mini-link" href="/office">{copy.office}</Link>
          </div>
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

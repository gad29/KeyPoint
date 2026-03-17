import Link from 'next/link';
import type { ReactNode } from 'react';

const nav: Array<{ href: string; label: string }> = [
  { href: '/', label: 'Overview' },
  { href: '/intake', label: 'Native Intake' },
  { href: '/portal', label: 'Client Portal' },
  { href: '/office', label: 'Office Dashboard' },
  { href: '/docs', label: 'Build Notes' },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">KeyPoint</p>
          <h1>Phase 1 MVP</h1>
          <p className="muted">Israel-focused intake, document review, appraiser routing, and bank-stage tracking.</p>
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href as never}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">{children}</main>
    </div>
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

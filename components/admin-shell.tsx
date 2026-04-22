'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type StaffInfo = { email: string; role: string };

const roleLabel: Record<string, string> = {
  advisor: 'יועץ',
  admin: 'מנהל',
  owner: 'בעלים',
  secretary: 'מזכירה',
  reception: 'קבלה',
  viewer: 'צופה',
  'read-only': 'קריאה בלבד',
};

function BarChartIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function OfficeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const nav = [
  { href: '/admin', label: 'סקירה כספית', Icon: BarChartIcon, exact: true },
  { href: '/office/active', label: 'תיקים במשרד', Icon: OfficeIcon },
  { href: '/', label: 'אתר לקוחות', Icon: GlobeIcon, exact: true },
];

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/staff/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setStaff({ email: d.email, role: d.role });
      })
      .catch(() => null);
  }, []);

  async function signOut() {
    await fetch('/api/auth/staff/logout', { method: 'POST' });
    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  }

  const avatarChar = staff?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="shell admin-shell" dir="rtl">
      <aside className="sidebar admin-sidebar sidebar-flex">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark sidebar-brand-mark-admin">K</span>
          <div>
            <div className="sidebar-brand-name">KeyPoint</div>
            <div className="sidebar-brand-sub">דשבורד יועץ</div>
          </div>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav" aria-label="ניווט יועץ">
            {nav.map(({ href, label, Icon, exact }) => (
              <Link key={href} href={href as never} className={isActive(href, exact) ? 'active' : undefined}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {staff && (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-avatar sidebar-avatar-admin">{avatarChar}</div>
              <div className="sidebar-user-meta">
                <div className="sidebar-user-email">{staff.email}</div>
                <div className="sidebar-user-role">{roleLabel[staff.role] ?? staff.role}</div>
              </div>
            </div>
            <button type="button" className="sidebar-signout" onClick={signOut}>
              <LogOutIcon />
              יציאה
            </button>
          </div>
        )}
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

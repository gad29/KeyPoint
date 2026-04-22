'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

type StaffInfo = { email: string; role: string; canAccessAdminFinance: boolean };

const roleLabel: Record<string, string> = {
  advisor: 'יועץ',
  admin: 'מנהל',
  owner: 'בעלים',
  secretary: 'מזכירה',
  reception: 'קבלה',
  viewer: 'צופה',
  'read-only': 'קריאה בלבד',
};

function HomeIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
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

function AlertIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function FileTextIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

function LogOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.65 }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

const primaryNav = [
  { href: '/office', label: 'לוח בקרה', Icon: HomeIcon, exact: true },
  { href: '/office/active', label: 'תיקים פעילים', Icon: FolderIcon },
  { href: '/office/stuck', label: 'תקועים', Icon: AlertIcon },
  { href: '/office/completed', label: 'הושלמו', Icon: CheckCircleIcon },
];

const secondaryNav = [
  { href: '/docs', label: 'תיעוד', Icon: FileTextIcon },
  { href: '/connections', label: 'חיבורים', Icon: LinkIcon },
  { href: '/', label: 'אתר לקוחות', Icon: GlobeIcon, exact: true },
];

export function OfficeFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [staff, setStaff] = useState<StaffInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/staff/me')
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setStaff({ email: d.email, role: d.role, canAccessAdminFinance: d.canAccessAdminFinance });
      })
      .catch(() => null);
  }, []);

  async function signOut() {
    await fetch('/api/auth/staff/logout', { method: 'POST' });
    router.push('/login');
  }

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    if (href === '/office') return pathname.startsWith('/office');
    return pathname.startsWith(href);
  }

  const avatarChar = staff?.email?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="shell" dir="rtl">
      <aside className="sidebar sidebar-flex">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">K</span>
          <div>
            <div className="sidebar-brand-name">KeyPoint</div>
            <div className="sidebar-brand-sub">ניהול תיקי משכנתאות</div>
          </div>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav" aria-label="ניווט ראשי">
            {primaryNav.map(({ href, label, Icon, exact }) => (
              <Link key={href} href={href as never} className={isActive(href, exact) ? 'active' : undefined}>
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {staff?.canAccessAdminFinance && (
            <>
              <div className="nav-divider" />
              <nav className="nav">
                <Link href="/admin" className={pathname.startsWith('/admin') ? 'active' : undefined}>
                  <BarChartIcon />
                  <span>יועץ — כספים</span>
                </Link>
              </nav>
            </>
          )}

          <div className="nav-divider" />
          <nav className="nav">
            {secondaryNav.map(({ href, label, Icon, exact }) => (
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
              <div className="sidebar-avatar">{avatarChar}</div>
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

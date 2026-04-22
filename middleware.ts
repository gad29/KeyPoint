import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { canAccessAdvisorFinanceDashboard } from '@/lib/staff-roles';
import { getStaffSessionFromRequest } from '@/lib/staff-session';

function isCasesListPath(pathname: string) {
  return pathname === '/api/cases' || pathname === '/api/cases/';
}

function isAdvisorAdminPath(pathname: string) {
  return pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
}

function isProtectedOfficePath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (pathname.startsWith('/office')) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api/invites')) return true;
  if (pathname.startsWith('/api/admin')) return true;
  if (/^\/api\/cases\/[^/]+(?:\/offers|\/documents)?$/.test(pathname)) return true;

  // Listing all cases must never be public (office UI loads data server-side; this blocks direct API scraping).
  if (isCasesListPath(pathname) && (method === 'GET' || method === 'HEAD')) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedOfficePath(request)) {
    return NextResponse.next();
  }

  const staffSession = await getStaffSessionFromRequest(request);
  if (staffSession) {
    if (isAdvisorAdminPath(pathname) && !canAccessAdvisorFinanceDashboard(staffSession.role)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ ok: false, error: 'Advisor or admin role required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/office/active', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/office/:path*', '/admin/:path*', '/api/:path*'],
};

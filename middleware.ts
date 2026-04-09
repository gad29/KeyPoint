import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requestHasOfficeSession } from '@/lib/office-auth';

function isCasesListPath(pathname: string) {
  return pathname === '/api/cases' || pathname === '/api/cases/';
}

function isProtectedOfficePath(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (pathname.startsWith('/office')) return true;
  if (pathname.startsWith('/api/invites')) return true;
  if (/^\/api\/cases\/[^/]+(?:\/offers)?$/.test(pathname)) return true;

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

  if (await requestHasOfficeSession(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'Office authentication required' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/office/:path*', '/api/:path*'],
};

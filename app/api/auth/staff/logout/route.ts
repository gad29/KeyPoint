import { NextResponse } from 'next/server';
import { OFFICE_AUTH_COOKIE, officeCookieOptions } from '@/lib/office-auth';
import { STAFF_AUTH_COOKIE, staffCookieOptions } from '@/lib/staff-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STAFF_AUTH_COOKIE, '', { ...staffCookieOptions(), maxAge: 0 });
  response.cookies.set(OFFICE_AUTH_COOKIE, '', { ...officeCookieOptions(), maxAge: 0 });
  return response;
}

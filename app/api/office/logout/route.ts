import { NextResponse } from 'next/server';
import { OFFICE_AUTH_COOKIE, officeCookieOptions } from '@/lib/office-auth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(OFFICE_AUTH_COOKIE, '', { ...officeCookieOptions(), maxAge: 0 });
  return response;
}

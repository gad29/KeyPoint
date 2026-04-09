import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { findStaffByEmail } from '@/lib/airtable-staff';
import { canUseStaffLogin } from '@/lib/env';
import { OFFICE_AUTH_COOKIE, officeCookieOptions } from '@/lib/office-auth';
import { createStaffSessionToken, STAFF_AUTH_COOKIE, staffCookieOptions } from '@/lib/staff-session';

export async function POST(req: NextRequest) {
  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: false, error: 'Airtable is not configured' }, { status: 503 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
  }

  const found = await findStaffByEmail(email);
  if (!found.ok || !found.data) {
    return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  if (!found.data.active) {
    return NextResponse.json({ ok: false, error: 'Account is disabled' }, { status: 403 });
  }

  const match = await bcrypt.compare(password, found.data.passwordHash);
  if (!match) {
    return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const token = await createStaffSessionToken({ email: found.data.email, recordId: found.data.recordId });
  const response = NextResponse.json({ ok: true, email: found.data.email });
  response.cookies.set(STAFF_AUTH_COOKIE, token, staffCookieOptions());
  response.cookies.set(OFFICE_AUTH_COOKIE, '', { ...officeCookieOptions(), maxAge: 0 });
  return response;
}

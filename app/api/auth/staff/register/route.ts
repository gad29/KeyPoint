import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { createStaffInAirtable, emailExistsInStaff } from '@/lib/airtable-staff';
import { env, canUseStaffLogin, hasStaffRegisterSecret, looksLikePlaceholder } from '@/lib/env';

const SALT_ROUNDS = 12;
const MIN_PASSWORD = 10;

export async function POST(req: NextRequest) {
  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: false, error: 'Airtable is not configured' }, { status: 503 });
  }

  const headerSecret = req.headers.get('x-keypoint-staff-register-secret')?.trim() || '';
  if (!hasStaffRegisterSecret()) {
    return NextResponse.json({ ok: false, error: 'Staff registration is not enabled (set STAFF_REGISTER_SECRET)' }, { status: 403 });
  }
  if (!headerSecret || headerSecret !== env.staffRegisterSecret?.trim()) {
    return NextResponse.json({ ok: false, error: 'Invalid registration secret' }, { status: 403 });
  }

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string; fullName?: string };
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Valid email is required' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD || looksLikePlaceholder(password)) {
    return NextResponse.json({ ok: false, error: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 });
  }

  if (await emailExistsInStaff(email)) {
    return NextResponse.json({ ok: false, error: 'Email already registered' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await createStaffInAirtable({ email, passwordHash, fullName: fullName || undefined });
  if (!created.ok || !created.data) {
    return NextResponse.json({ ok: false, error: created.error || 'Failed to create user' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: created.data.id, email });
}

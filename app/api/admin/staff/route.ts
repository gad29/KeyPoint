import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { canUseStaffLogin, looksLikePlaceholder } from '@/lib/env';
import { normalizeStaffRole } from '@/lib/staff-roles';

export async function GET() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: true, data: [] });
  }
  const result = await getStore().listStaff();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: result.data });
}

const SALT_ROUNDS = 12;
const MIN_PASSWORD = 10;
const ALLOWED_ROLES = new Set(['advisor', 'admin', 'secretary', 'reception', 'viewer']);

/**
 * Admin-only endpoint for creating new staff users (e.g. secretary).
 * Authenticated via the staff session cookie + advisor/admin role gate.
 * Bypasses STAFF_REGISTER_SECRET because the caller is already an authenticated admin.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: false, error: 'Staff login needs a database (DATABASE_URL) or Airtable' }, { status: 503 });
  }

  let body: { email?: string; password?: string; fullName?: string; role?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const role = normalizeStaffRole(typeof body.role === 'string' ? body.role : 'secretary');

  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'אימייל לא תקין' }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD || looksLikePlaceholder(password)) {
    return NextResponse.json({ ok: false, error: `הסיסמה חייבת להכיל לפחות ${MIN_PASSWORD} תווים` }, { status: 400 });
  }
  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json(
      { ok: false, error: `תפקיד לא חוקי. מותר: ${[...ALLOWED_ROLES].join(', ')}` },
      { status: 400 },
    );
  }

  if ((await getStore().findStaffByEmail(email)).ok) {
    return NextResponse.json({ ok: false, error: 'אימייל זה כבר רשום במערכת' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const created = await getStore().createStaff({
    email,
    passwordHash,
    fullName: fullName || undefined,
    role,
  });
  if (!created.ok || !created.data) {
    return NextResponse.json({ ok: false, error: created.error || 'יצירת המשתמש נכשלה' }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    data: { id: created.data.id, email, role, fullName: fullName || null },
  });
}

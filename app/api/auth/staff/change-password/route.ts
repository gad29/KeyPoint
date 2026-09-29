import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { canUseStaffLogin, looksLikePlaceholder } from '@/lib/env';
import { getCurrentStaffFromCookies } from '@/lib/staff-session';

const SALT_ROUNDS = 12;
const MIN_PASSWORD = 10;

/**
 * Self-serve password change for any logged-in staff member.
 * Requires the current password to be supplied (re-authenticates) and a new password ≥10 chars.
 */
export async function POST(req: NextRequest) {
  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: false, error: 'Staff login needs a database (DATABASE_URL) or Airtable' }, { status: 503 });
  }

  const session = await getCurrentStaffFromCookies();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Staff sign-in required' }, { status: 401 });
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ ok: false, error: 'יש להזין סיסמה נוכחית וסיסמה חדשה' }, { status: 400 });
  }
  if (newPassword.length < MIN_PASSWORD || looksLikePlaceholder(newPassword)) {
    return NextResponse.json(
      { ok: false, error: `הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD} תווים` },
      { status: 400 },
    );
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ ok: false, error: 'הסיסמה החדשה זהה לסיסמה הנוכחית' }, { status: 400 });
  }

  const staff = await getStore().findStaffByEmail(session.email);
  if (!staff.ok || !staff.data) {
    return NextResponse.json({ ok: false, error: 'לא נמצא משתמש תואם' }, { status: 404 });
  }

  const match = await bcrypt.compare(currentPassword, staff.data.passwordHash);
  if (!match) {
    return NextResponse.json({ ok: false, error: 'הסיסמה הנוכחית שגויה' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await getStore().updateStaffPasswordHash(staff.data.recordId, newHash);
  if (!updated.ok) {
    return NextResponse.json({ ok: false, error: updated.error || 'עדכון הסיסמה נכשל' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

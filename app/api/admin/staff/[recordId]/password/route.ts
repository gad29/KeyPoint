import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { canUseStaffLogin, looksLikePlaceholder } from '@/lib/env';

const SALT_ROUNDS = 12;
const MIN_PASSWORD = 10;

/**
 * Admin force-reset of another staff user's password.
 * Used when a worker forgets their password — the admin types a new one
 * and tells the worker. No email round-trip needed.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ recordId: string }> }) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }
  if (!canUseStaffLogin()) {
    return NextResponse.json({ ok: false, error: 'Staff login needs a database (DATABASE_URL) or Airtable' }, { status: 503 });
  }

  const { recordId } = await ctx.params;
  if (!recordId || !/^(rec[A-Za-z0-9]{6,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(recordId)) {
    return NextResponse.json({ ok: false, error: 'Invalid record id' }, { status: 400 });
  }

  let body: { newPassword?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (newPassword.length < MIN_PASSWORD || looksLikePlaceholder(newPassword)) {
    return NextResponse.json(
      { ok: false, error: `הסיסמה החדשה חייבת להכיל לפחות ${MIN_PASSWORD} תווים` },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  const updated = await getStore().updateStaffPasswordHash(recordId, hash);
  if (!updated.ok) {
    return NextResponse.json({ ok: false, error: updated.error || 'Failed to update password' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { getBillingSettings, sanitizeBillingSettings } from '@/lib/billing/service';
import { billingStatus } from '@/lib/billing/status';

export async function GET() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  return NextResponse.json({ ok: true, data: { settings: await getBillingSettings(), status: billingStatus() } });
}

export async function PUT(req: NextRequest) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const clean = sanitizeBillingSettings(body);
  if (!clean.ok || !clean.data) return NextResponse.json({ ok: false, error: clean.error }, { status: 400 });
  const saved = await getStore().saveBillingSettings(clean.data);
  if (!saved.ok) return NextResponse.json({ ok: false, error: saved.error }, { status: 409 });
  return NextResponse.json({ ok: true, data: saved.data });
}

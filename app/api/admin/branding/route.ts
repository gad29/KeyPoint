import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { getBranding, isValidBrandColor } from '@/lib/onboarding';

export async function GET() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  return NextResponse.json({ ok: true, data: await getBranding() });
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

  const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const name = text(body.name, 80);
  const logoUrl = text(body.logoUrl, 500);
  const primaryColor = text(body.primaryColor, 7);

  if (!name) return NextResponse.json({ ok: false, error: 'שם העסק הוא שדה חובה' }, { status: 400 });
  if (logoUrl && !/^https:\/\/\S+$/.test(logoUrl)) {
    return NextResponse.json({ ok: false, error: 'כתובת הלוגו חייבת להתחיל ב-https://' }, { status: 400 });
  }
  if (primaryColor && !isValidBrandColor(primaryColor)) {
    return NextResponse.json({ ok: false, error: 'צבע לא תקין (לדוגמה #1f6f5c)' }, { status: 400 });
  }

  const saved = await getStore().saveBranding({ name, nameHe: text(body.nameHe, 80), logoUrl, primaryColor });
  if (!saved.ok) return NextResponse.json({ ok: false, error: saved.error }, { status: 409 });
  return NextResponse.json({ ok: true, data: saved.data });
}

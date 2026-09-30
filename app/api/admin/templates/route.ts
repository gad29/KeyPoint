import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { getDataBackend } from '@/lib/env';
import { listAvailableTemplates } from '@/lib/onboarding';
import { sanitizeTemplate } from '@/lib/onboarding/templates';

export async function GET() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  return NextResponse.json({ ok: true, data: await listAvailableTemplates(), meta: { canSave: getDataBackend() !== 'airtable' } });
}

/** Create or update a template (upsert by slug). */
export async function POST(req: NextRequest) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const sanitized = sanitizeTemplate(body);
  if (!sanitized.ok) return NextResponse.json({ ok: false, error: sanitized.error }, { status: 400 });

  const saved = await getStore().saveTemplate(sanitized.template);
  if (!saved.ok) return NextResponse.json({ ok: false, error: saved.error }, { status: 409 });
  return NextResponse.json({ ok: true, data: saved.data });
}

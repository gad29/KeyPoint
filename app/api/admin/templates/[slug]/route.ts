import { NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';

export async function DELETE(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const { slug } = await params;
  const result = await getStore().deleteTemplate(slug);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true, data: result.data });
}

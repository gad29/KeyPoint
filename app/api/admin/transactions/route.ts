import { NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { getStore } from '@/lib/data';
import { getActivePreset } from '@/lib/presets';

const VALID_TYPES = ['income', 'expense'] as const;

export async function POST(req: Request) {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  let body: {
    date?: string;
    type?: string;
    amount?: unknown;
    category?: string;
    description?: string;
    caseId?: string;
  };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const { date, type, amount, category, description, caseId } = body;

  if (!date || !type || amount === undefined || !category) {
    return NextResponse.json({ ok: false, error: 'date, type, amount, category are required' }, { status: 400 });
  }

  if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.json({ ok: false, error: 'type must be income or expense' }, { status: 400 });
  }

  const validCategories = getActivePreset().financeCategories;
  if (!validCategories.includes(category)) {
    return NextResponse.json({ ok: false, error: `category must be one of: ${validCategories.join(', ')}` }, { status: 400 });
  }

  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return NextResponse.json({ ok: false, error: 'amount must be a positive number' }, { status: 400 });
  }

  const res = await getStore().createFinanceTransaction({
    date,
    type: type as 'income' | 'expense',
    amount: amountNum,
    category,
    description,
    caseId,
  });
  if (!res.ok || !res.data) {
    return NextResponse.json({ ok: false, error: res.error || 'Failed to create record' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, data: { id: res.data.id } }, { status: 201 });
}

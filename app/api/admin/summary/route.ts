import { NextResponse } from 'next/server';
import { requireAdvisorFinanceAccess } from '@/lib/admin-auth';
import { listRecentFinanceTransactions, summarizeTransactions } from '@/lib/airtable-finance';

export async function GET() {
  const gate = await requireAdvisorFinanceAccess();
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });
  }

  const txs = await listRecentFinanceTransactions();
  if (!txs.ok) {
    return NextResponse.json({ ok: false, error: txs.error }, { status: 502 });
  }

  const rows = txs.data ?? [];
  const summary = summarizeTransactions(rows);
  return NextResponse.json({
    ok: true,
    data: {
      summary,
      transactions: rows.slice(0, 50),
    },
  });
}

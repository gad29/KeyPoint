import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { issueInvoice, payUrlFor, recordInvoicePayment, voidInvoice } from '@/lib/billing/service';

/** Staff-only (middleware): invoice with payments and reminder history. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();
  const invoice = await store.getInvoice(id);
  if (!invoice.ok || !invoice.data) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
  const [payments, runs] = await Promise.all([store.listPayments(id), store.listChaseRuns({ invoiceId: id })]);
  return NextResponse.json({
    ok: true,
    data: { invoice: invoice.data, payUrl: payUrlFor(invoice.data), payments: payments.data ?? [], reminders: runs.data ?? [] },
  });
}

/**
 * Actions: issue | void | pause | resume | mark-paid { amount?, method? } | update { summary?, notes?, clientEmail?, clientPhone? }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const store = getStore();
  let result;
  switch (body.action) {
    case 'issue':
      result = await issueInvoice(id);
      break;
    case 'void':
      result = await voidInvoice(id);
      break;
    case 'pause':
    case 'resume':
      result = await store.updateInvoice(id, { chasePaused: body.action === 'pause' });
      break;
    case 'mark-paid': {
      const amount = body.amount === undefined || body.amount === '' ? undefined : Number(body.amount);
      const method = typeof body.method === 'string' && body.method.trim() ? body.method.trim() : 'manual';
      const paid = await recordInvoicePayment(id, amount, method);
      result = paid.ok && paid.data ? { ok: true as const, data: paid.data.invoice } : paid;
      break;
    }
    case 'update': {
      const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
      const email = text(body.clientEmail, 200);
      if (email && !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ ok: false, error: 'אימייל לא תקין' }, { status: 400 });
      result = await store.updateInvoice(id, {
        ...(body.summary !== undefined ? { summary: text(body.summary, 2000) || undefined } : {}),
        ...(body.notes !== undefined ? { notes: text(body.notes, 1000) || undefined } : {}),
        ...(body.clientEmail !== undefined ? { clientEmail: email || undefined } : {}),
        ...(body.clientPhone !== undefined ? { clientPhone: text(body.clientPhone, 40) || undefined } : {}),
      });
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }

  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, data: result.data });
}

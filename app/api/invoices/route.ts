import { NextRequest, NextResponse } from 'next/server';
import type { InvoiceStatus } from '@/data/domain';
import { getStore } from '@/lib/data';
import { createInvoice, getBillingSettings } from '@/lib/billing/service';
import { billingStatus } from '@/lib/billing/status';

const STATUSES: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'overdue', 'void'];

/** Staff-only (middleware). ?caseId=CASE-1001&status=overdue,sent */
export async function GET(req: NextRequest) {
  const caseId = req.nextUrl.searchParams.get('caseId') || undefined;
  const statuses = (req.nextUrl.searchParams.get('status') || '')
    .split(',')
    .filter((s): s is InvoiceStatus => STATUSES.includes(s as InvoiceStatus));
  const [result, settings] = await Promise.all([getStore().listInvoices({ caseId, statuses }), getBillingSettings()]);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  const status = billingStatus();
  return NextResponse.json({
    ok: true,
    data: result.data,
    meta: {
      storageReady: status.storageReady,
      currency: status.currency,
      cardPayment: status.stripe,
      email: status.email,
      defaultVatRate: settings.defaultVatRate,
      defaultDueDays: settings.defaultDueDays,
      accounting: status.accounting.filter((a) => a.configured && a.canIssue).map(({ id, label, verified }) => ({ id, label, verified })),
    },
  });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const text = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const result = await createInvoice({
    caseId: text(body.caseId),
    clientName: text(body.clientName),
    clientEmail: text(body.clientEmail),
    clientPhone: text(body.clientPhone),
    currency: text(body.currency),
    lineItems: Array.isArray(body.lineItems) ? body.lineItems : [],
    vatRate: typeof body.vatRate === 'number' ? body.vatRate : undefined,
    dueDate: text(body.dueDate),
    summary: text(body.summary),
    notes: text(body.notes),
    issue: body.issue === true,
  });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, data: result.data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { getAccountingAdapter, type AccountingProviderId } from '@/lib/billing';

/** Staff-only (middleware). Asks a connected accounting system to issue the official tax invoice. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { provider?: string; language?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {}

  const adapter = getAccountingAdapter(body.provider as AccountingProviderId);
  if (!adapter || !adapter.isConfigured()) return NextResponse.json({ ok: false, error: 'Provider is not connected' }, { status: 400 });

  const store = getStore();
  const invoice = await store.getInvoice(id);
  if (!invoice.ok || !invoice.data) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
  if (invoice.data.externalId) return NextResponse.json({ ok: false, error: 'A tax document was already issued for this request' }, { status: 409 });
  if (invoice.data.status === 'void' || invoice.data.status === 'draft') {
    return NextResponse.json({ ok: false, error: 'Issue the payment request before creating a tax document' }, { status: 400 });
  }

  const issued = await adapter.issueTaxDocument(invoice.data, body.language === 'en' ? 'en' : 'he');
  if (!issued.ok || !issued.data) return NextResponse.json({ ok: false, error: issued.error }, { status: 502 });

  const updated = await store.updateInvoice(id, {
    sourceAdapter: adapter.id,
    externalId: issued.data.externalId,
    externalDocUrl: issued.data.docUrl && /^https:\/\//.test(issued.data.docUrl) ? issued.data.docUrl : undefined,
  });
  if (invoice.data.caseId) {
    await store.logActivity(invoice.data.caseId, 'tax-document-issued', `${adapter.label} document ${issued.data.docNumber ?? issued.data.externalId} for #${invoice.data.number}`);
  }
  return NextResponse.json({ ok: true, data: updated.data });
}

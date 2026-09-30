import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { emailInvoice, prepareInvoiceMessage } from '@/lib/billing/service';

/**
 * Staff-only (middleware). Prepares the "here is your payment request" message (WhatsApp link,
 * copy text) or, with { send: 'email' }, emails it and marks the request as sent.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: { language?: string; send?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {}
  const language = body.language === 'en' ? 'en' : 'he';

  if (body.send === 'email') {
    const sent = await emailInvoice(id, language);
    if (!sent.ok) return NextResponse.json({ ok: false, error: sent.error }, { status: 400 });
    return NextResponse.json({ ok: true, data: sent.data });
  }

  const invoice = await getStore().getInvoice(id);
  if (!invoice.ok || !invoice.data) return NextResponse.json({ ok: false, error: 'Invoice not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: await prepareInvoiceMessage(invoice.data, language) });
}

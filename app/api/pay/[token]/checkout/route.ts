import { NextResponse } from 'next/server';
import { getStore } from '@/lib/data';
import { hasStripeConfig } from '@/lib/env';
import { balanceDue } from '@/lib/billing/money';
import { createCheckoutSession } from '@/lib/billing/stripe';
import { payUrlFor } from '@/lib/billing/service';
import { getBranding } from '@/lib/onboarding';

/** Public: the client's "Pay now" button. The opaque token in the URL is the only credential. */
export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!hasStripeConfig()) return NextResponse.json({ ok: false, error: 'Card payment is not available' }, { status: 400 });
  const { token } = await params;
  const invoice = (await getStore().getInvoiceByToken(token)).data;
  if (!invoice || invoice.status === 'void' || invoice.status === 'draft') {
    return NextResponse.json({ ok: false, error: 'Payment request not found' }, { status: 404 });
  }
  if (balanceDue(invoice) <= 0) return NextResponse.json({ ok: false, error: 'Already paid' }, { status: 409 });

  const branding = await getBranding();
  const session = await createCheckoutSession(invoice, { payUrl: payUrlFor(invoice), businessName: branding.name });
  if (!session.ok || !session.data?.url) {
    console.error(`[AgencyOS Stripe] Checkout failed for invoice ${invoice.id}: ${session.error}`);
    return NextResponse.json({ ok: false, error: 'Could not start the payment. Please try again.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true, data: { url: session.data.url } });
}

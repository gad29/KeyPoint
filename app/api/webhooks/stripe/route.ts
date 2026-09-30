import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { paymentIntentId, verifyStripeWebhook } from '@/lib/billing/stripe';
import { recordInvoicePayment } from '@/lib/billing/service';

/**
 * Public Stripe webhook. Configure the endpoint in Stripe for `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded`, and put its signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  if (!env.stripeWebhookSecret) return NextResponse.json({ ok: false, error: 'Webhook not configured' }, { status: 503 });

  const raw = await req.text();
  const verified = verifyStripeWebhook(raw, req.headers.get('stripe-signature'), env.stripeWebhookSecret);
  if (!verified.ok || !verified.data) return NextResponse.json({ ok: false, error: verified.error }, { status: 400 });

  const event = verified.data;
  if (event.type !== 'checkout.session.completed' && event.type !== 'checkout.session.async_payment_succeeded') {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const session = event.data.object;
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId || session.payment_status !== 'paid' || !session.amount_total) {
    return NextResponse.json({ ok: true, ignored: 'not a paid invoice session' });
  }

  const result = await recordInvoicePayment(invoiceId, session.amount_total / 100, 'stripe', paymentIntentId(session));
  if (!result.ok) {
    console.error(`[AgencyOS Stripe] Could not record payment for ${invoiceId}: ${result.error}`);
    // 500 makes Stripe retry later, which is what we want for transient failures.
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, duplicate: result.data?.duplicate ?? false });
}

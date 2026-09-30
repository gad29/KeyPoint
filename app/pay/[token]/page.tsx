import { notFound } from 'next/navigation';
import { getStore } from '@/lib/data';
import { hasStripeConfig } from '@/lib/env';
import { getBranding } from '@/lib/onboarding';
import { getBillingSettings, recordInvoicePayment } from '@/lib/billing/service';
import { paymentIntentId, retrieveCheckoutSession } from '@/lib/billing/stripe';
import { PayPageClient } from '@/components/billing/pay-page';

export const dynamic = 'force-dynamic';

export default async function PayPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { token } = await params;
  const { session_id: sessionId } = await searchParams;
  const store = getStore();
  let invoice = (await store.getInvoiceByToken(token)).data;
  if (!invoice || invoice.status === 'draft') notFound();

  // Returning from Stripe Checkout: confirm with Stripe directly so the page is right even if the webhook is late.
  let justPaid = false;
  if (sessionId && hasStripeConfig() && invoice.status !== 'paid') {
    const session = await retrieveCheckoutSession(sessionId);
    if (session.ok && session.data?.payment_status === 'paid' && session.data.metadata?.invoice_id === invoice.id && session.data.amount_total) {
      const recorded = await recordInvoicePayment(invoice.id, session.data.amount_total / 100, 'stripe', paymentIntentId(session.data));
      if (recorded.ok && recorded.data) {
        invoice = recorded.data.invoice;
        justPaid = true;
      }
    }
  }

  if (!invoice.viewedAt) {
    const viewed = await store.updateInvoice(invoice.id, { viewedAt: new Date().toISOString() });
    if (viewed.ok && viewed.data) invoice = viewed.data;
  }

  const [branding, settings] = await Promise.all([getBranding(), getBillingSettings()]);
  return (
    <PayPageClient
      invoice={invoice}
      token={token}
      businessName={branding.name}
      businessNameHe={branding.nameHe}
      cardPayment={hasStripeConfig()}
      paymentLinkUrl={settings.paymentLinkUrl}
      paymentInstructions={settings.paymentInstructions}
      justPaid={justPaid}
    />
  );
}

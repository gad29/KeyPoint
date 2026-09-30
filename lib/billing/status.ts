import { env, getDataBackend, hasAnthropicConfig, hasStripeConfig } from '@/lib/env';
import { canSendEmail } from '@/lib/messaging/email';
import { greenInvoiceAdapter } from '@/lib/billing/green-invoice';
import { icountAdapter } from '@/lib/billing/icount';
import { quickbooksAdapter } from '@/lib/billing/quickbooks';
import { xeroAdapter } from '@/lib/billing/xero';

/** What is connected, for the admin billing screen. Never includes secrets. */
export function billingStatus() {
  return {
    storageReady: getDataBackend() !== 'airtable',
    currency: env.currency,
    stripe: hasStripeConfig(),
    stripeWebhook: Boolean(env.stripeWebhookSecret),
    email: canSendEmail(),
    ai: hasAnthropicConfig(),
    cron: Boolean(env.cronSecret),
    accounting: [greenInvoiceAdapter, icountAdapter, quickbooksAdapter, xeroAdapter].map((a) => ({
      id: a.id,
      label: a.label,
      configured: a.isConfigured(),
      verified: a.verified,
      canIssue: a.id === 'green-invoice' || a.id === 'icount',
    })),
  };
}

export type BillingStatus = ReturnType<typeof billingStatus>;

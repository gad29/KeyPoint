import { env, hasStripeConfig } from '@/lib/env';
import type { BillingAdapter, CreateInvoiceInput } from '@/lib/billing/types';

/**
 * Stripe adapter — scaffold only. Phase 4 will:
 *  - use the stripe SDK to create Invoices + Checkout sessions,
 *  - persist externalId + payLinkUrl on our InvoiceRecord,
 *  - implement listOverdue by paging InvoiceListParams { status: 'open', due_date: { lt } }.
 *
 * For now every method returns 'unsupported' so callers can wire the UI without
 * a live Stripe key.
 */
export const stripeAdapter: BillingAdapter = {
  id: 'stripe',
  isConfigured: hasStripeConfig,
  async createInvoice(_input: CreateInvoiceInput) {
    if (!hasStripeConfig()) return { ok: false, error: 'Stripe not configured' };
    return { ok: false, error: 'Stripe adapter not implemented yet (Phase 4).' };
  },
  async getInvoice(_externalId: string) {
    return { ok: false, error: 'Stripe adapter not implemented yet (Phase 4).' };
  },
  async listOverdue() {
    return { ok: false, error: 'Stripe adapter not implemented yet (Phase 4).' };
  },
};

export function stripeApiBase() {
  return 'https://api.stripe.com/v1';
}

export function stripeAuthHeader() {
  return env.stripeSecretKey ? { Authorization: `Bearer ${env.stripeSecretKey}` } : null;
}

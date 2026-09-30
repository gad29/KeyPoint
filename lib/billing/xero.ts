import { hasXeroConfig } from '@/lib/env';
import type { AccountingAdapter } from '@/lib/billing/types';

/** Placeholder: Xero needs an OAuth app + per-tenant connect flow before invoices can sync. */
export const xeroAdapter: AccountingAdapter = {
  id: 'xero',
  label: 'Xero',
  verified: false,
  isConfigured: hasXeroConfig,
  async issueTaxDocument() {
    return { ok: false, error: 'Xero sync is not available yet (needs an OAuth connection).' };
  },
};

import { hasQuickbooksConfig } from '@/lib/env';
import type { AccountingAdapter } from '@/lib/billing/types';

/** Placeholder: QuickBooks needs an OAuth app + per-tenant connect flow before invoices can sync. */
export const quickbooksAdapter: AccountingAdapter = {
  id: 'quickbooks',
  label: 'QuickBooks',
  verified: false,
  isConfigured: hasQuickbooksConfig,
  async issueTaxDocument() {
    return { ok: false, error: 'QuickBooks sync is not available yet (needs an OAuth connection).' };
  },
};

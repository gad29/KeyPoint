import { hasQuickbooksConfig } from '@/lib/env';
import type { BillingAdapter } from '@/lib/billing/types';

/**
 * QuickBooks Online adapter — read-only in Phase 4 (sync of existing invoices).
 * Auth is OAuth2; the tenant connects via /admin/integrations.
 */
export const quickbooksAdapter: BillingAdapter = {
  id: 'quickbooks',
  isConfigured: hasQuickbooksConfig,
  async createInvoice() {
    return { ok: false, error: 'QuickBooks adapter is read-only (Phase 4).' };
  },
  async getInvoice() {
    return { ok: false, error: 'QuickBooks adapter not implemented yet (Phase 4).' };
  },
  async listOverdue() {
    return { ok: false, error: 'QuickBooks adapter not implemented yet (Phase 4).' };
  },
};

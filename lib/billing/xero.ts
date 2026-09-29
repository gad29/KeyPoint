import { hasXeroConfig } from '@/lib/env';
import type { BillingAdapter } from '@/lib/billing/types';

/**
 * Xero adapter — read-only in Phase 4 (sync of existing invoices).
 * Auth is OAuth2; the tenant connects via /admin/integrations.
 */
export const xeroAdapter: BillingAdapter = {
  id: 'xero',
  isConfigured: hasXeroConfig,
  async createInvoice() {
    return { ok: false, error: 'Xero adapter is read-only (Phase 4).' };
  },
  async getInvoice() {
    return { ok: false, error: 'Xero adapter not implemented yet (Phase 4).' };
  },
  async listOverdue() {
    return { ok: false, error: 'Xero adapter not implemented yet (Phase 4).' };
  },
};

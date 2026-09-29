import { env, hasGreenInvoiceConfig } from '@/lib/env';
import type { BillingAdapter } from '@/lib/billing/types';

/**
 * Green Invoice adapter (Israeli invoicing). Scaffold only.
 * Phase 4 will authenticate at POST /api/v1/account/token then POST /api/v1/documents.
 */
export const greenInvoiceAdapter: BillingAdapter = {
  id: 'green-invoice',
  isConfigured: hasGreenInvoiceConfig,
  async createInvoice() {
    if (!hasGreenInvoiceConfig()) return { ok: false, error: 'Green Invoice not configured' };
    return { ok: false, error: 'Green Invoice adapter not implemented yet (Phase 4).' };
  },
  async getInvoice() {
    return { ok: false, error: 'Green Invoice adapter not implemented yet (Phase 4).' };
  },
  async listOverdue() {
    return { ok: false, error: 'Green Invoice adapter not implemented yet (Phase 4).' };
  },
};

export function greenInvoiceApiBase() {
  return 'https://api.greeninvoice.co.il/api/v1';
}

export function greenInvoiceAuthPayload() {
  return {
    id: env.greenInvoiceApiKey || '',
    secret: env.greenInvoiceApiSecret || '',
  };
}

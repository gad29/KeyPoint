import { env, hasIcountConfig } from '@/lib/env';
import type { BillingAdapter } from '@/lib/billing/types';

/**
 * iCount adapter (Israeli VAT-compliant invoicing). Scaffold only.
 * Phase 4 will POST /api/v3.php/doc/create with { doctype: 'invoice', ... }
 * using env.icountCompanyId + env.icountUser + env.icountPassword.
 */
export const icountAdapter: BillingAdapter = {
  id: 'icount',
  isConfigured: hasIcountConfig,
  async createInvoice() {
    if (!hasIcountConfig()) return { ok: false, error: 'iCount not configured' };
    return { ok: false, error: 'iCount adapter not implemented yet (Phase 4).' };
  },
  async getInvoice() {
    return { ok: false, error: 'iCount adapter not implemented yet (Phase 4).' };
  },
  async listOverdue() {
    return { ok: false, error: 'iCount adapter not implemented yet (Phase 4).' };
  },
};

export function icountApiBase() {
  return 'https://api.icount.co.il/api/v3.php';
}

export function icountAuthPayload() {
  return {
    cid: env.icountCompanyId || '',
    user: env.icountUser || '',
    pass: env.icountPassword || '',
  };
}

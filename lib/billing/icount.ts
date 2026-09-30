import { env, hasIcountConfig } from '@/lib/env';
import type { AccountingAdapter } from '@/lib/billing/types';

function apiBase() {
  return (env.icountApiBase || 'https://api.icount.co.il/api/v3.php').replace(/\/$/, '');
}

/**
 * Issues a tax invoice through iCount (API v3, doc/create). Built from the public API docs;
 * not yet exercised against a live account, hence verified: false.
 */
export const icountAdapter: AccountingAdapter = {
  id: 'icount',
  label: 'iCount',
  verified: false,
  isConfigured: hasIcountConfig,
  async issueTaxDocument(invoice, language) {
    if (!hasIcountConfig()) return { ok: false, error: 'iCount is not configured' };
    try {
      const res = await fetch(`${apiBase()}/doc/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cid: env.icountCompanyId,
          user: env.icountUser,
          pass: env.icountPassword,
          doctype: 'invoice',
          lang: language,
          currency_code: invoice.currency,
          client_name: invoice.clientName,
          email: invoice.clientEmail || undefined,
          phone: invoice.clientPhone || undefined,
          duedate: invoice.dueAt?.slice(0, 10),
          hwc: invoice.notes || undefined,
          items: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitprice: item.unitAmount,
          })),
          send_email: 0,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = (await res.json()) as { status?: boolean; docnum?: string | number; doc_url?: string; reason?: string; error_description?: string };
      if (!res.ok || !json.status || !json.docnum) {
        return { ok: false, error: json.error_description || json.reason || `iCount error ${res.status}` };
      }
      return { ok: true, data: { externalId: String(json.docnum), docNumber: String(json.docnum), docUrl: json.doc_url } };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'iCount request failed' };
    }
  },
};

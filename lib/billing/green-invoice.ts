import { env, hasGreenInvoiceConfig } from '@/lib/env';
import type { AccountingAdapter } from '@/lib/billing/types';

/** Tax invoice (חשבונית מס). Green Invoice document type codes: 300 transaction invoice, 305 tax invoice, 320 tax invoice-receipt. */
const TAX_INVOICE = 305;

function apiBase() {
  // Sandbox: https://sandbox.d.greeninvoice.co.il/api/v1
  return (env.greenInvoiceApiBase || 'https://api.greeninvoice.co.il/api/v1').replace(/\/$/, '');
}

async function getToken(): Promise<string | null> {
  const res = await fetch(`${apiBase()}/account/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: env.greenInvoiceApiKey, secret: env.greenInvoiceApiSecret }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { token?: string };
  return json.token || null;
}

/**
 * Issues a tax invoice through Green Invoice (Morning). Built from the public API docs;
 * not yet exercised against a live account, hence verified: false.
 */
export const greenInvoiceAdapter: AccountingAdapter = {
  id: 'green-invoice',
  label: 'Green Invoice (Morning)',
  verified: false,
  isConfigured: hasGreenInvoiceConfig,
  async issueTaxDocument(invoice, language) {
    if (!hasGreenInvoiceConfig()) return { ok: false, error: 'Green Invoice is not configured' };
    try {
      const token = await getToken();
      if (!token) return { ok: false, error: 'Green Invoice rejected the API key/secret' };
      const res = await fetch(`${apiBase()}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: TAX_INVOICE,
          lang: language,
          currency: invoice.currency,
          description: invoice.summary?.slice(0, 200) || `#${invoice.number}`,
          date: new Date().toISOString().slice(0, 10),
          dueDate: invoice.dueAt?.slice(0, 10),
          client: {
            name: invoice.clientName,
            emails: invoice.clientEmail ? [invoice.clientEmail] : [],
            phone: invoice.clientPhone || undefined,
            add: true,
          },
          // Prices are before VAT; Green Invoice applies the business's VAT setting.
          income: invoice.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            price: item.unitAmount,
            currency: invoice.currency,
            vatType: 0,
          })),
          remarks: invoice.notes || undefined,
        }),
        signal: AbortSignal.timeout(20000),
      });
      const json = (await res.json()) as { id?: string; number?: number | string; url?: { origin?: string; he?: string; en?: string }; errorMessage?: string };
      if (!res.ok || !json.id) return { ok: false, error: json.errorMessage || `Green Invoice error ${res.status}` };
      return {
        ok: true,
        data: {
          externalId: String(json.id),
          docNumber: json.number !== undefined ? String(json.number) : undefined,
          docUrl: json.url?.[language] || json.url?.origin,
        },
      };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : 'Green Invoice request failed' };
    }
  },
};

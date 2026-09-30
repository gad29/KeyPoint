import { greenInvoiceAdapter } from '@/lib/billing/green-invoice';
import { icountAdapter } from '@/lib/billing/icount';
import { quickbooksAdapter } from '@/lib/billing/quickbooks';
import { xeroAdapter } from '@/lib/billing/xero';
import type { AccountingAdapter, AccountingProviderId } from '@/lib/billing/types';

export type * from '@/lib/billing/types';

const accountingAdapters: AccountingAdapter[] = [greenInvoiceAdapter, icountAdapter, quickbooksAdapter, xeroAdapter];

export function getAccountingAdapter(id: AccountingProviderId) {
  return accountingAdapters.find((a) => a.id === id);
}

/** Configured providers that can actually issue a tax document today. */
export function listIssuingAccountingAdapters() {
  return accountingAdapters.filter((a) => a.isConfigured() && (a.id === 'green-invoice' || a.id === 'icount'));
}

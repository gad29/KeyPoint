import { stripeAdapter } from '@/lib/billing/stripe';
import { icountAdapter } from '@/lib/billing/icount';
import { greenInvoiceAdapter } from '@/lib/billing/green-invoice';
import { quickbooksAdapter } from '@/lib/billing/quickbooks';
import { xeroAdapter } from '@/lib/billing/xero';
import type { BillingAdapter, BillingAdapterId } from '@/lib/billing/types';

export type { BillingAdapter, BillingAdapterId, CreateInvoiceInput, ChaseSendInput } from '@/lib/billing/types';

const registry: Record<BillingAdapterId, BillingAdapter | undefined> = {
  stripe: stripeAdapter,
  icount: icountAdapter,
  'green-invoice': greenInvoiceAdapter,
  quickbooks: quickbooksAdapter,
  xero: xeroAdapter,
  internal: undefined,
};

export function getBillingAdapter(id: BillingAdapterId): BillingAdapter | undefined {
  return registry[id];
}

export function listConfiguredBillingAdapters(): BillingAdapter[] {
  return Object.values(registry).filter((adapter): adapter is BillingAdapter => Boolean(adapter?.isConfigured()));
}

export function getPrimaryBillingAdapter(): BillingAdapter | undefined {
  return listConfiguredBillingAdapters()[0];
}

import type { BillingStore } from '@/lib/billing/types';

const needsDatabase = { ok: false as const, error: 'Invoices and payment reminders need the Postgres backend (DATABASE_URL).' };

/** Airtable has no invoice tables in this app: reads are empty, writes explain what is needed. */
export const airtableBilling: BillingStore = {
  listInvoices: async () => ({ ok: true, data: [] }),
  getInvoice: async () => ({ ok: true, data: null }),
  getInvoiceByToken: async () => ({ ok: true, data: null }),
  createInvoice: async () => needsDatabase,
  updateInvoice: async () => needsDatabase,
  recordPayment: async () => needsDatabase,
  listPayments: async () => ({ ok: true, data: [] }),
  listChaseRuns: async () => ({ ok: true, data: [] }),
  createChaseRun: async () => needsDatabase,
  updateChaseRun: async () => needsDatabase,
  getBillingSettings: async () => ({ ok: true, data: {} }),
  saveBillingSettings: async () => needsDatabase,
};

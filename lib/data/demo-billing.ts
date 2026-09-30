import crypto from 'node:crypto';
import path from 'node:path';
import type { ChaseRun, InvoicePayment, InvoiceRecord } from '@/data/domain';
import { dataRoot, readJson, writeJson } from '@/lib/data/json-file';
import type { BillingSettings, BillingStore } from '@/lib/billing/types';

type DemoBilling = {
  invoiceSeq: number;
  invoices: InvoiceRecord[];
  payments: InvoicePayment[];
  runs: ChaseRun[];
  settings: Partial<BillingSettings>;
};

const file = path.join(dataRoot, 'demo-billing.json');
const load = () => readJson<DemoBilling>(file, { invoiceSeq: 1000, invoices: [], payments: [], runs: [], settings: {} });

function mutate<T>(fn: (db: DemoBilling) => T): T {
  const db = load();
  const result = fn(db);
  writeJson(file, db);
  return result;
}

/** Local JSON billing for zero-config demo mode. */
export const demoBilling: BillingStore = {
  async listInvoices(filter = {}) {
    const rows = load()
      .invoices.filter((i) => !filter.caseId || i.caseId === filter.caseId)
      .filter((i) => !filter.statuses?.length || filter.statuses.includes(i.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: rows };
  },

  async getInvoice(id) {
    return { ok: true, data: load().invoices.find((i) => i.id === id) ?? null };
  },

  async getInvoiceByToken(token) {
    return { ok: true, data: load().invoices.find((i) => i.publicToken === token) ?? null };
  },

  async createInvoice(input) {
    const invoice = mutate((db) => {
      db.invoiceSeq += 1;
      const created: InvoiceRecord = {
        ...input,
        id: crypto.randomUUID(),
        number: String(db.invoiceSeq),
        amountPaid: 0,
        createdAt: new Date().toISOString(),
      };
      db.invoices.push(created);
      return created;
    });
    return { ok: true, data: invoice };
  },

  async updateInvoice(id, patch) {
    const updated = mutate((db) => {
      const target = db.invoices.find((i) => i.id === id);
      if (!target) return null;
      Object.assign(target, patch);
      return target;
    });
    return updated ? { ok: true, data: updated } : { ok: false, error: 'Invoice not found' };
  },

  async recordPayment(invoiceId, payment) {
    const result = mutate((db) => {
      const invoice = db.invoices.find((i) => i.id === invoiceId);
      if (!invoice) return null;
      if (payment.externalRef && db.payments.some((p) => p.externalRef === payment.externalRef)) {
        return { invoice, duplicate: true };
      }
      db.payments.push({ id: crypto.randomUUID(), invoiceId, amount: payment.amount, method: payment.method, externalRef: payment.externalRef, paidAt: new Date().toISOString() });
      const sum = db.payments.filter((p) => p.invoiceId === invoiceId).reduce((acc, p) => acc + p.amount, 0);
      invoice.amountPaid = Math.round(sum * 100) / 100;
      if (sum >= invoice.total) {
        invoice.status = 'paid';
        invoice.paidAt ??= new Date().toISOString();
      } else if (sum > 0) {
        invoice.status = 'partial';
      }
      return { invoice, duplicate: false };
    });
    return result ? { ok: true, data: result } : { ok: false, error: 'Invoice not found' };
  },

  async listPayments(invoiceId) {
    return { ok: true, data: load().payments.filter((p) => p.invoiceId === invoiceId) };
  },

  async listChaseRuns(filter = {}) {
    const rows = load()
      .runs.filter((r) => !filter.invoiceId || r.invoiceId === filter.invoiceId)
      .filter((r) => !filter.status || r.status === filter.status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { ok: true, data: rows };
  },

  async createChaseRun(run) {
    const created: ChaseRun = { ...run, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    mutate((db) => db.runs.push(created));
    return { ok: true, data: created };
  },

  async updateChaseRun(id, patch) {
    const updated = mutate((db) => {
      const target = db.runs.find((r) => r.id === id);
      if (!target) return null;
      Object.assign(target, Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)));
      return target;
    });
    return updated ? { ok: true, data: updated } : { ok: false, error: 'Reminder not found' };
  },

  async getBillingSettings() {
    return { ok: true, data: load().settings };
  },

  async saveBillingSettings(settings) {
    mutate((db) => {
      db.settings = settings;
    });
    return { ok: true, data: settings };
  },
};

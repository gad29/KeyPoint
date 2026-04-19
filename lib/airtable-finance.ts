import { env, hasAirtableConfig } from '@/lib/env';
import { createAirtableRecord, listAirtableRecords } from '@/lib/airtable';
import type { ActionResult } from '@/lib/types';

type TxFields = Record<string, unknown>;

const TYPE_ALIASES = ['Type', 'type', 'Direction', 'Flow'];
const AMOUNT_ALIASES = ['Amount', 'amount', 'Sum', 'Total'];
const DATE_ALIASES = ['Date', 'date', 'Occurred on', 'Occurred On'];
const CATEGORY_ALIASES = ['Category', 'category'];
const DESC_ALIASES = ['Description', 'description', 'Notes'];
const CASE_ALIASES = ['Case ID', 'Case Id', 'caseId', 'Case link'];

function pickNumber(fields: TxFields, keys: string[]): number {
  for (const k of keys) {
    const v = fields[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim()) {
      const n = Number(v.replace(/,/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function pickString(fields: TxFields, keys: string[]): string {
  for (const k of keys) {
    const v = fields[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickType(fields: TxFields): 'income' | 'expense' | 'unknown' {
  const raw = pickString(fields, TYPE_ALIASES).toLowerCase();
  if (raw.includes('income') || raw === 'in' || raw === 'הכנסה' || raw === 'credit') return 'income';
  if (raw.includes('expense') || raw === 'out' || raw === 'הוצאה' || raw === 'debit') return 'expense';
  return 'unknown';
}

function pickDateMs(fields: TxFields): number {
  for (const k of DATE_ALIASES) {
    const v = fields[k];
    if (typeof v === 'string' && v.trim()) {
      const t = Date.parse(v);
      if (Number.isFinite(t)) return t;
    }
  }
  return 0;
}

export type FinanceTransactionRow = {
  id: string;
  type: 'income' | 'expense' | 'unknown';
  amount: number;
  category: string;
  description: string;
  caseId: string;
  dateMs: number;
};

const MS_90D = 90 * 24 * 60 * 60 * 1000;

export async function listRecentFinanceTransactions(): Promise<ActionResult<FinanceTransactionRow[]>> {
  if (!hasAirtableConfig()) {
    return { ok: true, data: [] };
  }

  const table = env.airtableFinanceTransactionsTable;
  const result = await listAirtableRecords<TxFields>(table, { maxRecords: '300' });
  if (!result.ok || !result.data) {
    return { ok: false, error: result.error || 'Failed to load finance data' };
  }

  const cutoff = Date.now() - MS_90D;
  const rows: FinanceTransactionRow[] = [];

  for (const rec of result.data) {
    const f = rec.fields;
    const dateMs = pickDateMs(f);
    if (dateMs && dateMs < cutoff) continue;

    const type = pickType(f);
    const amount = Math.abs(pickNumber(f, AMOUNT_ALIASES));
    rows.push({
      id: rec.id,
      type,
      amount,
      category: pickString(f, CATEGORY_ALIASES),
      description: pickString(f, DESC_ALIASES),
      caseId: pickString(f, CASE_ALIASES),
      dateMs: dateMs || Date.now(),
    });
  }

  rows.sort((a, b) => b.dateMs - a.dateMs);
  return { ok: true, data: rows };
}

export function summarizeTransactions(rows: FinanceTransactionRow[]) {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === 'income') income += r.amount;
    else if (r.type === 'expense') expense += r.amount;
  }
  return {
    incomeTotal: income,
    expenseTotal: expense,
    net: income - expense,
    count: rows.length,
  };
}

export async function logBillingEventToAirtable(fields: {
  kind: string;
  targetEmail?: string;
  caseId?: string;
  amount?: number;
  notes?: string;
  triggeredByEmail?: string;
}): Promise<ActionResult<{ id: string }>> {
  if (!hasAirtableConfig()) {
    return { ok: true, data: { id: 'local' } };
  }

  const table = env.airtableBillingEventsTable;
  const payload: Record<string, unknown> = {
    Kind: fields.kind,
    'Created at': new Date().toISOString(),
    'Target email': fields.targetEmail || '',
    'Case ID': fields.caseId || '',
    Notes: [fields.notes, fields.triggeredByEmail ? `By: ${fields.triggeredByEmail}` : ''].filter(Boolean).join('\n'),
  };
  if (typeof fields.amount === 'number' && Number.isFinite(fields.amount)) {
    payload.Amount = fields.amount;
  }

  const res = await createAirtableRecord(table, payload);
  if (!res.ok || !res.data) {
    return { ok: false, error: res.error || 'Failed to log billing event' };
  }
  const id = (res.data as { id?: string }).id;
  if (!id) return { ok: false, error: 'Airtable did not return id' };
  return { ok: true, data: { id } };
}

'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/components/i18n';
import type { FinanceTransactionRow } from '@/lib/airtable-finance';

type Summary = {
  incomeTotal: number;
  expenseTotal: number;
  net: number;
  count: number;
};

const copy = {
  en: {
    eyebrow: 'Advisor dashboard',
    title: 'Payments & cashflow',
    subtitle: 'Totals from Airtable (last ~90 days of loaded rows). Connect n8n to send invoices, receipts, and reminders.',
    income: 'Income',
    expenses: 'Expenses',
    net: 'Net',
    entries: 'Line items',
    recent: 'Recent transactions',
    type: 'Type',
    amount: 'Amount',
    category: 'Category',
    case: 'Case',
    date: 'Date',
    n8nTitle: 'Billing automations (n8n)',
    n8nBody: 'Creates webhooks your n8n instance should expose under your N8N_WEBHOOK_BASE_URL.',
    email: 'Client email',
    caseId: 'Case ID (optional)',
    amountNis: 'Amount (optional, ₪)',
    clientName: 'Client name (optional)',
    note: 'Note (optional)',
    sendInvoice: 'Send invoice',
    sendReceipt: 'Send receipt',
    sendReminder: 'Payment reminder',
    sending: 'Sending…',
    sent: 'Queued in n8n',
    fail: 'Request failed',
    refresh: 'Refresh numbers',
    refreshOk: 'Figures updated',
  },
  he: {
    eyebrow: 'דשבורד יועץ',
    title: 'תשלומים ותזרים',
    subtitle: 'סיכומים מ־Airtable (שורות שנטענו, בערך 90 יום אחורה). חברו ל־n8n לשליחת חשבוניות, קבלות ותזכורות.',
    income: 'הכנסות',
    expenses: 'הוצאות',
    net: 'מאזן',
    entries: 'שורות',
    recent: 'תנועות אחרונות',
    type: 'סוג',
    amount: 'סכום',
    category: 'קטגוריה',
    case: 'תיק',
    date: 'תאריך',
    n8nTitle: 'אוטומציות חיוב (n8n)',
    n8nBody: 'נשלח webhook לכתובת הבסיס של n8n — יש להגדיר שם את הזרימות.',
    email: 'אימייל לקוח',
    caseId: 'מזהה תיק (אופציונלי)',
    amountNis: 'סכום (אופציונלי, ₪)',
    clientName: 'שם לקוח (אופציונלי)',
    note: 'הערה (אופציונלי)',
    sendInvoice: 'שליחת חשבונית',
    sendReceipt: 'שליחת קבלה',
    sendReminder: 'תזכורת תשלום',
    sending: 'שולח…',
    sent: 'נשלח ל־n8n',
    fail: 'הבקשה נכשלה',
    refresh: 'רענון נתונים',
    refreshOk: 'הנתונים עודכנו',
  },
};

function formatMoney(n: number, lang: string) {
  const formatted = new Intl.NumberFormat(lang === 'he' ? 'he-IL' : 'en-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(n);
  return formatted;
}

function formatDate(ms: number, lang: string) {
  return new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-GB', { dateStyle: 'short' }).format(new Date(ms));
}

export function AdminDashboardClient({
  initialSummary,
  initialRows,
  sessionEmail,
}: {
  initialSummary: Summary;
  initialRows: FinanceTransactionRow[];
  sessionEmail: string;
}) {
  const { language, dir } = useI18n();
  const t = copy[language];
  const [summary, setSummary] = useState(initialSummary);
  const [rows, setRows] = useState(initialRows);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    targetEmail: '',
    caseId: '',
    amount: '',
    clientName: '',
    message: '',
  });
  const [busyKind, setBusyKind] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  const typeLabel = useMemo(
    () =>
      ({
        income: language === 'he' ? 'הכנסה' : 'Income',
        expense: language === 'he' ? 'הוצאה' : 'Expense',
        unknown: language === 'he' ? 'לא מסווג' : 'Other',
      }) as const,
    [language],
  );

  async function refresh() {
    setLoading(true);
    setToast('');
    const res = await fetch('/api/admin/summary');
    const json = await res.json().catch(() => ({ ok: false }));
    setLoading(false);
    if (json.ok && json.data) {
      setSummary(json.data.summary);
      setRows(json.data.transactions || []);
      setToast(t.refreshOk);
    } else {
      setToast(t.fail);
    }
  }

  async function sendBilling(kind: 'invoice' | 'receipt' | 'reminder') {
    setBusyKind(kind);
    setToast('');
    const amountNum = form.amount.trim() ? Number(form.amount.replace(/,/g, '')) : undefined;
    const res = await fetch('/api/admin/n8n/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind,
        targetEmail: form.targetEmail.trim(),
        caseId: form.caseId.trim() || undefined,
        amount: amountNum !== undefined && Number.isFinite(amountNum) ? amountNum : undefined,
        clientName: form.clientName.trim() || undefined,
        message: form.message.trim() || undefined,
      }),
    });
    const json = await res.json().catch(() => ({ ok: false }));
    setBusyKind(null);
    if (json.ok) setToast(t.sent);
    else setToast(json.error || t.fail);
  }

  return (
    <div className="grid" dir={dir}>
      <section className="hero product-hero hero-soft">
        <div>
          <p className="eyebrow">{t.eyebrow}</p>
          <h2>{t.title}</h2>
          <p className="muted">{t.subtitle}</p>
          <p className="muted" style={{ fontSize: 13 }}>
            {sessionEmail}
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={() => void refresh()} disabled={loading}>
          {loading ? '…' : t.refresh}
        </button>
      </section>

      <div className="grid cols-3">
        <section className="card stat-card">
          <p className="eyebrow">{t.income}</p>
          <h3>{formatMoney(summary.incomeTotal, language)}</h3>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">{t.expenses}</p>
          <h3>{formatMoney(summary.expenseTotal, language)}</h3>
        </section>
        <section className="card stat-card">
          <p className="eyebrow">{t.net}</p>
          <h3>{formatMoney(summary.net, language)}</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            {t.entries}: {summary.count}
          </p>
        </section>
      </div>

      <section className="card">
        <p className="eyebrow">{t.recent}</p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>{t.date}</th>
                <th>{t.type}</th>
                <th>{t.amount}</th>
                <th>{t.category}</th>
                <th>{t.case}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    —
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.dateMs, language)}</td>
                    <td>{typeLabel[r.type]}</td>
                    <td>{formatMoney(r.amount, language)}</td>
                    <td>{r.category || '—'}</td>
                    <td>{r.caseId || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">{t.n8nTitle}</p>
        <p className="muted">{t.n8nBody}</p>
        <div className="form-grid cols-2" style={{ marginTop: 16 }}>
          <label className="field field-span-2">
            <span>{t.email}</span>
            <input type="email" value={form.targetEmail} onChange={(e) => setForm((f) => ({ ...f, targetEmail: e.target.value }))} />
          </label>
          <label className="field">
            <span>{t.caseId}</span>
            <input value={form.caseId} onChange={(e) => setForm((f) => ({ ...f, caseId: e.target.value }))} />
          </label>
          <label className="field">
            <span>{t.amountNis}</span>
            <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
          </label>
          <label className="field">
            <span>{t.clientName}</span>
            <input value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
          </label>
          <label className="field field-span-2">
            <span>{t.note}</span>
            <input value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
          </label>
        </div>
        <div className="inline-actions" style={{ marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
          <button className="button" type="button" disabled={!!busyKind} onClick={() => void sendBilling('invoice')}>
            {busyKind === 'invoice' ? t.sending : t.sendInvoice}
          </button>
          <button className="button button-secondary" type="button" disabled={!!busyKind} onClick={() => void sendBilling('receipt')}>
            {busyKind === 'receipt' ? t.sending : t.sendReceipt}
          </button>
          <button className="button button-secondary" type="button" disabled={!!busyKind} onClick={() => void sendBilling('reminder')}>
            {busyKind === 'reminder' ? t.sending : t.sendReminder}
          </button>
        </div>
        {toast ? (
          <p className="muted" style={{ marginTop: 12 }}>
            {toast}
          </p>
        ) : null}
      </section>
    </div>
  );
}

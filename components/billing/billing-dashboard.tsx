'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { InvoiceRecord, InvoiceStatus } from '@/data/domain';
import type { ReminderQueueItem } from '@/lib/billing/service';
import { balanceDue, formatMoney, round2 } from '@/lib/billing/money';
import { CHASE_TONE_LABELS, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE } from '@/lib/billing/labels';

type Filter = 'open' | 'overdue' | 'paid' | 'all';

interface Props {
  initialInvoices: InvoiceRecord[];
  initialQueue: ReminderQueueItem[];
  storageReady: boolean;
  emailReady: boolean;
  aiReady: boolean;
  autoSend: boolean;
  cronReady: boolean;
}

const FILTERS: Array<{ id: Filter; label: string; statuses?: InvoiceStatus[] }> = [
  { id: 'open', label: 'פתוחות', statuses: ['sent', 'partial', 'overdue'] },
  { id: 'overdue', label: 'באיחור', statuses: ['overdue'] },
  { id: 'paid', label: 'שולמו', statuses: ['paid'] },
  { id: 'all', label: 'הכול' },
];

/** Sums per currency so mixed-currency totals are never added together. */
function sumByCurrency(items: Array<{ currency: string; amount: number }>) {
  const totals = new Map<string, number>();
  for (const { currency, amount } of items) totals.set(currency, round2((totals.get(currency) ?? 0) + amount));
  return [...totals.entries()].map(([currency, amount]) => formatMoney(amount, currency)).join(' + ') || formatMoney(0, 'ILS');
}

export function BillingDashboard({ initialInvoices, initialQueue, storageReady, emailReady, aiReady, autoSend, cronReady }: Props) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [queue, setQueue] = useState(initialQueue);
  const [filter, setFilter] = useState<Filter>('open');
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('');

  const kpis = useMemo(() => {
    const open = invoices.filter((i) => ['sent', 'partial', 'overdue'].includes(i.status));
    const overdue = invoices.filter((i) => i.status === 'overdue');
    const monthAgo = Date.now() - 30 * 86_400_000;
    const paid = invoices.filter((i) => i.paidAt && new Date(i.paidAt).getTime() >= monthAgo);
    return {
      outstanding: sumByCurrency(open.map((i) => ({ currency: i.currency, amount: balanceDue(i) }))),
      openCount: open.length,
      overdue: sumByCurrency(overdue.map((i) => ({ currency: i.currency, amount: balanceDue(i) }))),
      overdueCount: overdue.length,
      paid: sumByCurrency(paid.map((i) => ({ currency: i.currency, amount: i.total }))),
      paidCount: paid.length,
    };
  }, [invoices]);

  const statuses = FILTERS.find((f) => f.id === filter)?.statuses;
  const visible = statuses ? invoices.filter((i) => statuses.includes(i.status)) : invoices;

  async function refresh() {
    const [inv, q] = await Promise.all([fetch('/api/invoices').then((r) => r.json()), fetch('/api/chase').then((r) => r.json())]);
    if (inv.ok) setInvoices(inv.data);
    if (q.ok) setQueue(q.data);
  }

  async function runNow() {
    setRunning(true);
    setNote('');
    try {
      const res = await fetch('/api/chase/run', { method: 'POST' });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: { checked: number; drafted: number; sent: number; failed: number; markedOverdue: number } };
      if (!json.ok || !json.data) throw new Error(json.error || 'ההרצה נכשלה');
      const d = json.data;
      setNote(`נבדקו ${d.checked} דרישות באיחור · ${d.drafted} תזכורות ממתינות לאישור · ${d.sent} נשלחו${d.failed ? ` · ${d.failed} נכשלו` : ''}`);
      await refresh();
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'ההרצה נכשלה');
    } finally {
      setRunning(false);
    }
  }

  if (!storageReady) {
    return (
      <div className="grid" dir="rtl" style={{ maxWidth: 1100 }}>
        <p className="card muted">דרישות תשלום ותזכורות גבייה דורשות מסד נתונים (Postgres / Supabase).</p>
      </div>
    );
  }

  return (
    <div className="grid billing-dashboard" dir="rtl" style={{ maxWidth: 1100 }}>
      <div className="hero product-hero" style={{ marginBottom: 0 }}>
        <div>
          <p className="eyebrow">גבייה</p>
          <h2 style={{ margin: '8px 0 6px' }}>דרישות תשלום ותזכורות</h2>
          <p className="muted" style={{ fontSize: 14 }}>
            {autoSend && emailReady ? 'תזכורות נשלחות אוטומטית באימייל.' : 'כל תזכורת ממתינה לאישורכם לפני שליחה.'}
            {aiReady ? ' הנוסח מנוסח בעזרת AI.' : ''}
            {!cronReady ? ' ההרצה היומית האוטומטית לא הוגדרה — אפשר להריץ ידנית.' : ''}
          </p>
        </div>
        <button type="button" className="button button-compact" onClick={runNow} disabled={running}>
          {running ? 'בודק…' : 'בדיקת תזכורות עכשיו'}
        </button>
      </div>

      {note ? <p className="muted small-note">{note}</p> : null}

      <div className="pipeline-cards">
        <div className="pipeline-card pc-active">
          <p className="eyebrow">פתוח לגבייה</p>
          <div className="pc-count billing-kpi">{kpis.outstanding}</div>
          <div className="pc-label">{kpis.openCount} דרישות</div>
        </div>
        <div className="pipeline-card pc-stuck">
          <p className="eyebrow">באיחור</p>
          <div className="pc-count billing-kpi">{kpis.overdue}</div>
          <div className="pc-label">{kpis.overdueCount} דרישות</div>
        </div>
        <div className="pipeline-card pc-done">
          <p className="eyebrow">נגבה ב-30 יום</p>
          <div className="pc-count billing-kpi">{kpis.paid}</div>
          <div className="pc-label">{kpis.paidCount} תשלומים</div>
        </div>
        <div className="pipeline-card pc-new">
          <p className="eyebrow">ממתינות לאישור</p>
          <div className="pc-count">{queue.length}</div>
          <div className="pc-label">תזכורות</div>
        </div>
      </div>

      <section className="card">
        <p className="eyebrow" style={{ marginBottom: 10 }}>תזכורות ממתינות לאישור</p>
        {queue.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>אין כרגע תזכורות לאישור.</p>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {queue.map((item) => (
              <ReminderItem key={item.id} item={item} emailReady={emailReady} onDone={refresh} />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">דרישות תשלום</p>
          <div className="tab-bar billing-filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} className={`tab ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? (
          <p className="muted">אין דרישות להצגה.</p>
        ) : (
          <table className="table billing-table">
            <thead>
              <tr>
                <th>#</th>
                <th>לקוח</th>
                <th>סכום</th>
                <th>יתרה</th>
                <th>לתשלום עד</th>
                <th>סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <a className="mini-link" href={`/pay/${invoice.publicToken}`} target="_blank" rel="noopener noreferrer">
                      {invoice.number}
                    </a>
                  </td>
                  <td>
                    {invoice.caseId ? (
                      <Link className="mini-link" href={`/office/case/${invoice.caseId}` as never}>
                        {invoice.clientName}
                      </Link>
                    ) : (
                      invoice.clientName
                    )}
                  </td>
                  <td>{formatMoney(invoice.total, invoice.currency)}</td>
                  <td>{formatMoney(balanceDue(invoice), invoice.currency)}</td>
                  <td>{invoice.dueAt ? new Date(invoice.dueAt).toLocaleDateString('he-IL') : '—'}</td>
                  <td>
                    <span className={`badge ${INVOICE_STATUS_TONE[invoice.status]}`}>{INVOICE_STATUS_LABELS.he[invoice.status]}</span>
                    {invoice.chasePaused && invoice.status !== 'paid' && invoice.status !== 'void' ? <span className="muted"> · מושהה</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function ReminderItem({ item, emailReady, onDone }: { item: ReminderQueueItem; emailReady: boolean; onDone: () => Promise<void> }) {
  const [subject, setSubject] = useState(item.subject);
  const [body, setBody] = useState(item.body);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const edited = subject !== item.subject || body !== item.body;
  const whatsappUrl = item.whatsappUrl && edited ? item.whatsappUrl.replace(/text=.*$/, `text=${encodeURIComponent(body)}`) : item.whatsappUrl;

  async function act(payload: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/chase/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, ...(edited ? { subject, body } : {}) }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || 'הפעולה נכשלה');
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הפעולה נכשלה');
      setBusy(false);
    }
  }

  return (
    <article className={`reminder-item tone-${item.tone}`}>
      <header className="reminder-item-head">
        <div>
          <strong>{item.invoice.clientName}</strong>
          <span className="muted">
            {' '}
            · דרישה #{item.invoice.number} · יתרה {formatMoney(balanceDue(item.invoice), item.invoice.currency)}
          </span>
        </div>
        <span className={`reminder-tone tone-${item.tone}`}>תזכורת {CHASE_TONE_LABELS[item.tone]}</span>
      </header>
      {editing ? (
        <div className="grid" style={{ gap: 8 }}>
          <input className="reminder-subject" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="נושא" dir="auto" />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={Math.min(12, body.split('\n').length + 1)} dir="auto" aria-label="תוכן ההודעה" />
        </div>
      ) : (
        <div className="reminder-preview" dir="auto">
          <p className="reminder-preview-subject">{subject}</p>
          <p>{body}</p>
        </div>
      )}
      <div className="inline-actions">
        {whatsappUrl ? (
          <a className="button button-compact" href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => void act({ action: 'approve', channel: 'whatsapp' })}>
            שליחה בווטסאפ
          </a>
        ) : null}
        {emailReady && item.invoice.clientEmail ? (
          <button type="button" className="button button-compact" onClick={() => act({ action: 'approve', channel: 'email' })} disabled={busy}>
            שליחה באימייל
          </button>
        ) : null}
        <button
          type="button"
          className="button button-secondary button-compact"
          disabled={busy}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body);
            } catch {}
            await act({ action: 'approve', channel: 'manual' });
          }}
        >
          העתקה וסימון כנשלח
        </button>
        <button type="button" className="text-button" onClick={() => setEditing((v) => !v)}>
          {editing ? 'סיום עריכה' : 'עריכה'}
        </button>
        <button type="button" className="text-button danger" onClick={() => act({ action: 'skip' })} disabled={busy}>
          דילוג
        </button>
      </div>
      {error ? <p className="form-error">{error}</p> : null}
    </article>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChaseRun, InvoicePayment, InvoiceRecord } from '@/data/domain';
import { balanceDue, computeTotals, formatMoney } from '@/lib/billing/money';
import { CHASE_TONE_LABELS, INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE } from '@/lib/billing/labels';

type Meta = {
  storageReady: boolean;
  currency: string;
  cardPayment: boolean;
  email: boolean;
  defaultVatRate: number;
  defaultDueDays: number;
  accounting: Array<{ id: string; label: string; verified: boolean }>;
};

type LineDraft = { description: string; quantity: string; unitAmount: string };

const PAYMENT_METHODS = ['העברה בנקאית', 'ביט / פייבוקס', 'אשראי', 'מזומן', 'צ׳ק', 'אחר'];

function isoDate(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86_400_000).toISOString().slice(0, 10);
}

export function InvoicePanel({ caseId }: { caseId: string }) {
  const [invoices, setInvoices] = useState<InvoiceRecord[] | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/invoices?caseId=${encodeURIComponent(caseId)}`);
    const json = (await res.json()) as { ok: boolean; data?: InvoiceRecord[]; meta?: Meta };
    setInvoices(json.data ?? []);
    if (json.meta) setMeta(json.meta);
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!invoices || !meta) return <section className="card muted">טוען חיובים…</section>;

  if (!meta.storageReady) {
    return (
      <section className="card">
        <p className="eyebrow">חיוב וגבייה</p>
        <p className="muted">דרישות תשלום ותזכורות גבייה דורשות מסד נתונים (Postgres / Supabase).</p>
      </section>
    );
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="card billing-head">
        <div>
          <p className="eyebrow">חיוב וגבייה</p>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            דרישת תשלום עם סיכום השירות, קישור תשלום ללקוח ותזכורות אוטומטיות אם התשלום מתעכב.
          </p>
        </div>
        {!creating ? (
          <button type="button" className="button button-compact" onClick={() => setCreating(true)}>
            + דרישת תשלום חדשה
          </button>
        ) : null}
      </section>

      {creating ? (
        <InvoiceForm
          caseId={caseId}
          meta={meta}
          onCancel={() => setCreating(false)}
          onCreated={async (created, sendNow) => {
            setCreating(false);
            setNote(sendNow ? `דרישה #${created.number} נוצרה — שלחו אותה ללקוח מהכרטיס למטה.` : `טיוטה #${created.number} נשמרה.`);
            await load();
          }}
        />
      ) : null}

      {note ? <p className="muted small-note">{note}</p> : null}

      {invoices.length === 0 && !creating ? <p className="card muted">עדיין אין דרישות תשלום בתיק הזה.</p> : null}
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} meta={meta} onChanged={load} />
      ))}
    </div>
  );
}

function InvoiceForm({
  caseId,
  meta,
  onCancel,
  onCreated,
}: {
  caseId: string;
  meta: Meta;
  onCancel: () => void;
  onCreated: (invoice: InvoiceRecord, sendNow: boolean) => void;
}) {
  const [lines, setLines] = useState<LineDraft[]>([{ description: '', quantity: '1', unitAmount: '' }]);
  const [vatRate, setVatRate] = useState(String(meta.defaultVatRate));
  const [dueDate, setDueDate] = useState(isoDate(meta.defaultDueDays));
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const parsed = useMemo(
    () => lines.map((l) => ({ description: l.description, quantity: Number(l.quantity) || 0, unitAmount: Number(l.unitAmount) || 0 })),
    [lines],
  );
  const totals = computeTotals(parsed, Number(vatRate) || 0);
  const money = (n: number) => formatMoney(n, meta.currency);

  function setLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function save(issue: boolean) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, lineItems: parsed, vatRate: Number(vatRate), dueDate, summary, notes, issue }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; data?: InvoiceRecord };
      if (!json.ok || !json.data) throw new Error(json.error || 'השמירה נכשלה');
      onCreated(json.data, issue);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השמירה נכשלה');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card invoice-form">
      <h3 style={{ margin: 0 }}>דרישת תשלום חדשה</h3>

      <div className="invoice-lines">
        <div className="invoice-line invoice-line-head" aria-hidden="true">
          <span>תיאור</span>
          <span>כמות</span>
          <span>מחיר ליחידה (לפני מע״מ)</span>
          <span />
        </div>
        {lines.map((line, index) => (
          <div key={index} className="invoice-line">
            <input aria-label="תיאור" value={line.description} onChange={(e) => setLine(index, { description: e.target.value })} placeholder="לדוגמה: עיצוב לוגו" />
            <input aria-label="כמות" value={line.quantity} onChange={(e) => setLine(index, { quantity: e.target.value })} inputMode="decimal" dir="ltr" />
            <input aria-label="מחיר ליחידה" value={line.unitAmount} onChange={(e) => setLine(index, { unitAmount: e.target.value })} inputMode="decimal" dir="ltr" placeholder="0" />
            <button type="button" className="icon-button danger" aria-label="הסרת שורה" disabled={lines.length === 1} onClick={() => setLines((c) => c.filter((_, i) => i !== index))}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="text-button" onClick={() => setLines((c) => [...c, { description: '', quantity: '1', unitAmount: '' }])}>
          + הוספת שורה
        </button>
      </div>

      <div className="form-grid cols-2">
        <label className="field">
          <span>מע״מ (%)</span>
          <input value={vatRate} onChange={(e) => setVatRate(e.target.value)} inputMode="decimal" dir="ltr" />
        </label>
        <label className="field">
          <span>לתשלום עד</span>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </label>
        <label className="field field-span-2">
          <span>סיכום השירות (יופיע בהודעה ובעמוד התשלום)</span>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="מה בוצע, מה נמסר ללקוח, מה הלאה…" rows={3} />
        </label>
        <label className="field field-span-2">
          <span>הערות (לא חובה)</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="לדוגמה: פרטי העברה בנקאית" />
        </label>
      </div>

      <dl className="invoice-totals">
        <div>
          <dt>סכום ביניים</dt>
          <dd>{money(totals.subtotal)}</dd>
        </div>
        <div>
          <dt>מע״מ</dt>
          <dd>{money(totals.vatAmount)}</dd>
        </div>
        <div className="invoice-total">
          <dt>סה״כ לתשלום</dt>
          <dd>{money(totals.total)}</dd>
        </div>
      </dl>

      {error ? <p className="form-error">{error}</p> : null}
      <div className="intake-actions">
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={saving}>
          ביטול
        </button>
        <div className="inline-actions">
          <button type="button" className="button button-secondary" onClick={() => save(false)} disabled={saving}>
            שמירה כטיוטה
          </button>
          <button type="button" className="button" onClick={() => save(true)} disabled={saving}>
            {saving ? 'שומר…' : 'הפקה ושליחה'}
          </button>
        </div>
      </div>
      <p className="muted small-note">המסמך מופק כ&quot;דרישת תשלום&quot;. חשבונית מס רשמית מופקת דרך מערכת הנהלת חשבונות מחוברת.</p>
    </section>
  );
}

type Detail = { payments: InvoicePayment[]; reminders: ChaseRun[] };
type SendPrep = { subject: string; body: string; whatsappUrl: string | null; canEmail: boolean };

function InvoiceCard({ invoice, meta, onChanged }: { invoice: InvoiceRecord; meta: Meta; onChanged: () => Promise<void> }) {
  const [panel, setPanel] = useState<'' | 'send' | 'paid' | 'history'>('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [prep, setPrep] = useState<SendPrep | null>(null);
  const [language, setLanguage] = useState<'he' | 'en'>('he');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [amount, setAmount] = useState(String(balanceDue(invoice)));
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);

  const money = (n: number) => formatMoney(n, invoice.currency);
  const balance = balanceDue(invoice);
  const isOpen = ['sent', 'partial', 'overdue'].includes(invoice.status);
  const payPath = `/pay/${invoice.publicToken}`;

  async function patch(body: Record<string, unknown>, done: string) {
    setBusy(true);
    setStatus('');
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) throw new Error(json.error || 'הפעולה נכשלה');
      setStatus(done);
      setPanel('');
      await onChanged();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'הפעולה נכשלה');
    } finally {
      setBusy(false);
    }
  }

  async function openSend(lang = language) {
    setPanel('send');
    setPrep(null);
    const res = await fetch(`/api/invoices/${invoice.id}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language: lang }) });
    const json = (await res.json()) as { ok: boolean; data?: SendPrep };
    if (json.ok && json.data) setPrep(json.data);
  }

  async function markSentByHand() {
    if (invoice.status === 'draft') await patch({ action: 'issue' }, 'סומן כנשלח');
  }

  async function emailIt() {
    setBusy(true);
    setStatus('');
    const res = await fetch(`/api/invoices/${invoice.id}/message`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language, send: 'email' }) });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setBusy(false);
    setStatus(json.ok ? 'נשלח באימייל ✓' : json.error || 'השליחה נכשלה');
    if (json.ok) {
      setPanel('');
      await onChanged();
    }
  }

  async function openHistory() {
    setPanel('history');
    const res = await fetch(`/api/invoices/${invoice.id}`);
    const json = (await res.json()) as { ok: boolean; data?: Detail };
    if (json.ok && json.data) setDetail({ payments: json.data.payments, reminders: json.data.reminders });
  }

  async function issueTaxDoc(provider: string) {
    setBusy(true);
    setStatus('');
    const res = await fetch(`/api/invoices/${invoice.id}/tax-document`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
    const json = (await res.json()) as { ok: boolean; error?: string };
    setBusy(false);
    setStatus(json.ok ? 'חשבונית המס הופקה ✓' : json.error || 'ההפקה נכשלה');
    if (json.ok) await onChanged();
  }

  return (
    <article className={`card invoice-card status-${invoice.status}`}>
      <header className="invoice-card-head">
        <div>
          <strong>דרישת תשלום #{invoice.number}</strong>
          <p className="muted">
            {invoice.dueAt ? `לתשלום עד ${new Date(invoice.dueAt).toLocaleDateString('he-IL')}` : ''}
            {invoice.viewedAt ? ' · הלקוח צפה' : ''}
            {invoice.chasePaused && isOpen ? ' · תזכורות מושהות' : ''}
          </p>
        </div>
        <div className="invoice-card-amounts">
          <span className={`badge ${INVOICE_STATUS_TONE[invoice.status]}`}>{INVOICE_STATUS_LABELS.he[invoice.status]}</span>
          <strong>{money(invoice.total)}</strong>
          {invoice.amountPaid > 0 && balance > 0 ? <span className="muted">יתרה {money(balance)}</span> : null}
        </div>
      </header>

      {invoice.summary ? <p className="invoice-card-summary">{invoice.summary}</p> : null}

      <div className="inline-actions invoice-card-actions">
        {invoice.status !== 'void' && invoice.status !== 'paid' ? (
          <button type="button" className="button button-compact" onClick={() => openSend()} disabled={busy}>
            {invoice.status === 'draft' ? 'שליחה ללקוח' : 'שליחה שוב'}
          </button>
        ) : null}
        {invoice.status !== 'draft' ? (
          <a className="button button-secondary button-compact" href={payPath} target="_blank" rel="noopener noreferrer">
            עמוד התשלום
          </a>
        ) : null}
        {isOpen ? (
          <button type="button" className="button button-secondary button-compact" onClick={() => setPanel(panel === 'paid' ? '' : 'paid')} disabled={busy}>
            סימון תשלום
          </button>
        ) : null}
        {isOpen ? (
          <button type="button" className="text-button" onClick={() => patch({ action: invoice.chasePaused ? 'resume' : 'pause' }, invoice.chasePaused ? 'התזכורות חודשו' : 'התזכורות הושהו')} disabled={busy}>
            {invoice.chasePaused ? 'חידוש תזכורות' : 'השהיית תזכורות'}
          </button>
        ) : null}
        <button type="button" className="text-button" onClick={() => (panel === 'history' ? setPanel('') : openHistory())}>
          היסטוריה
        </button>
        {invoice.amountPaid === 0 && invoice.status !== 'void' && invoice.status !== 'paid' ? (
          <button type="button" className="text-button danger" onClick={() => confirm('לבטל את דרישת התשלום?') && patch({ action: 'void' }, 'הדרישה בוטלה')} disabled={busy}>
            ביטול
          </button>
        ) : null}
      </div>

      {invoice.externalDocUrl && /^https:\/\//.test(invoice.externalDocUrl) ? (
        <p className="small-note">
          ✓ חשבונית מס הופקה ·{' '}
          <a className="mini-link" href={invoice.externalDocUrl} target="_blank" rel="noopener noreferrer">
            צפייה
          </a>
        </p>
      ) : invoice.status !== 'draft' && invoice.status !== 'void' && meta.accounting.length ? (
        <div className="inline-actions small-note">
          {meta.accounting.map((provider) => (
            <button key={provider.id} type="button" className="text-button" onClick={() => issueTaxDoc(provider.id)} disabled={busy}>
              הפקת חשבונית מס ב-{provider.label}
              {!provider.verified ? ' (בטא)' : ''}
            </button>
          ))}
        </div>
      ) : null}

      {panel === 'send' ? (
        <div className="invoice-subpanel">
          <div className="reminder-head">
            <p className="eyebrow">הודעה ללקוח</p>
            <select
              aria-label="שפה"
              value={language}
              onChange={(e) => {
                const lang = e.target.value as 'he' | 'en';
                setLanguage(lang);
                void openSend(lang);
              }}
            >
              <option value="he">עברית</option>
              <option value="en">English</option>
            </select>
          </div>
          {!prep ? (
            <p className="muted">מכין הודעה…</p>
          ) : (
            <>
              <textarea readOnly value={prep.body} rows={Math.min(12, prep.body.split('\n').length + 1)} dir="auto" className="invoice-message" />
              <div className="inline-actions">
                {prep.whatsappUrl ? (
                  <a className="button button-compact" href={prep.whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => void markSentByHand()}>
                    שליחה בווטסאפ
                  </a>
                ) : null}
                <button
                  type="button"
                  className="button button-secondary button-compact"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(prep.body);
                      setStatus('ההודעה הועתקה');
                      await markSentByHand();
                    } catch {
                      setStatus('לא ניתן להעתיק — סמנו את הטקסט והעתיקו ידנית');
                    }
                  }}
                >
                  העתקה
                </button>
                {prep.canEmail ? (
                  <button type="button" className="button button-secondary button-compact" onClick={emailIt} disabled={busy}>
                    שליחה באימייל
                  </button>
                ) : null}
              </div>
              {!prep.canEmail ? <p className="muted small-note">{invoice.clientEmail ? 'שליחת אימייל אוטומטית אינה מוגדרת.' : 'ללקוח אין כתובת אימייל.'}</p> : null}
            </>
          )}
        </div>
      ) : null}

      {panel === 'paid' ? (
        <div className="invoice-subpanel form-grid cols-2">
          <label className="field">
            <span>סכום שהתקבל</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" dir="ltr" />
          </label>
          <label className="field">
            <span>אמצעי תשלום</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="inline-actions field-span-2">
            <button type="button" className="button button-compact" onClick={() => patch({ action: 'mark-paid', amount: Number(amount), method }, 'התשלום נרשם ✓')} disabled={busy}>
              רישום התשלום
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'history' ? (
        <div className="invoice-subpanel">
          {!detail ? (
            <p className="muted">טוען…</p>
          ) : (
            <ul className="invoice-history">
              {detail.payments.map((p) => (
                <li key={p.id}>
                  💳 תשלום {money(p.amount)} · {p.method} · {new Date(p.paidAt).toLocaleDateString('he-IL')}
                </li>
              ))}
              {detail.reminders.map((r) => (
                <li key={r.id}>
                  ✉️ תזכורת {CHASE_TONE_LABELS[r.tone]} · {r.status === 'draft' ? 'ממתינה לאישור' : r.status === 'sent' ? `נשלחה (${r.channel})` : r.status === 'skipped' ? 'דולגה' : 'נכשלה'} ·{' '}
                  {new Date(r.sentAt || r.createdAt).toLocaleDateString('he-IL')}
                </li>
              ))}
              {!detail.payments.length && !detail.reminders.length ? <li className="muted">אין עדיין תשלומים או תזכורות.</li> : null}
            </ul>
          )}
        </div>
      ) : null}

      {status ? <p className="muted small-note">{status}</p> : null}
    </article>
  );
}

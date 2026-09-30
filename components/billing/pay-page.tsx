'use client';

import { useState } from 'react';
import { useI18n } from '@/components/i18n';
import type { InvoiceRecord } from '@/data/domain';
import { balanceDue, formatMoney, round2 } from '@/lib/billing/money';
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_TONE } from '@/lib/billing/labels';

const copy = {
  en: {
    docTitle: 'Payment request',
    notTax: 'This is a payment request, not a tax invoice.',
    to: 'To',
    issued: 'Issued',
    due: 'Due',
    item: 'Description',
    qty: 'Qty',
    price: 'Unit price',
    amount: 'Amount',
    subtotal: 'Subtotal',
    vat: (rate: number) => `VAT ${rate}%`,
    total: 'Total',
    paid: 'Paid',
    balance: 'Balance due',
    payCard: 'Pay by card',
    payLink: 'Pay via link',
    starting: 'Opening secure payment…',
    failed: 'Could not open the payment page. Please try again.',
    other: 'Other ways to pay',
    thanks: 'Thank you! Your payment was received.',
    paidInFull: 'Paid in full. Thank you!',
    cancelled: 'This payment request was cancelled.',
    taxDoc: 'Tax invoice',
    print: 'Print',
    secure: 'Card payments are processed securely by Stripe.',
  },
  he: {
    docTitle: 'דרישת תשלום',
    notTax: 'מסמך זה הוא דרישת תשלום ואינו חשבונית מס.',
    to: 'לכבוד',
    issued: 'תאריך',
    due: 'לתשלום עד',
    item: 'תיאור',
    qty: 'כמות',
    price: 'מחיר ליחידה',
    amount: 'סכום',
    subtotal: 'סכום ביניים',
    vat: (rate: number) => `מע״מ ${rate}%`,
    total: 'סה״כ',
    paid: 'שולם',
    balance: 'יתרה לתשלום',
    payCard: 'תשלום בכרטיס אשראי',
    payLink: 'תשלום בקישור',
    starting: 'פותח עמוד תשלום מאובטח…',
    failed: 'לא ניתן לפתוח את עמוד התשלום. אפשר לנסות שוב.',
    other: 'דרכים נוספות לתשלום',
    thanks: 'תודה! התשלום התקבל.',
    paidInFull: 'שולם במלואו. תודה!',
    cancelled: 'דרישת התשלום בוטלה.',
    taxDoc: 'חשבונית מס',
    print: 'הדפסה',
    secure: 'תשלום בכרטיס מתבצע באופן מאובטח דרך Stripe.',
  },
};

interface Props {
  invoice: InvoiceRecord;
  token: string;
  businessName: string;
  businessNameHe: string;
  cardPayment: boolean;
  paymentLinkUrl: string;
  paymentInstructions: string;
  justPaid: boolean;
}

export function PayPageClient({ invoice, token, businessName, businessNameHe, cardPayment, paymentLinkUrl, paymentInstructions, justPaid }: Props) {
  const { language, dir } = useI18n();
  const t = copy[language];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const money = (n: number) => formatMoney(n, invoice.currency, language);
  const date = (v?: string) => (v ? new Date(v).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-GB') : '—');
  const balance = balanceDue(invoice);
  const open = invoice.status !== 'void' && balance > 0;
  const taxDocUrl = invoice.externalDocUrl && /^https:\/\//.test(invoice.externalDocUrl) ? invoice.externalDocUrl : '';

  async function payByCard() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/pay/${token}/checkout`, { method: 'POST' });
      const json = (await res.json()) as { ok: boolean; data?: { url: string } };
      if (!json.ok || !json.data?.url) throw new Error();
      window.location.href = json.data.url;
    } catch {
      setError(t.failed);
      setBusy(false);
    }
  }

  return (
    <div className="pay-page" dir={dir}>
      {justPaid ? <p className="card pay-banner good">✓ {t.thanks}</p> : null}

      <article className="card pay-doc">
        <header className="pay-doc-head">
          <div>
            <p className="eyebrow">{language === 'he' ? businessNameHe : businessName}</p>
            <h1>
              {t.docTitle} <span className="pay-doc-number">#{invoice.number}</span>
            </h1>
          </div>
          <span className={`badge ${INVOICE_STATUS_TONE[invoice.status]}`}>{INVOICE_STATUS_LABELS[language][invoice.status]}</span>
        </header>

        <dl className="pay-meta">
          <div>
            <dt>{t.to}</dt>
            <dd>{invoice.clientName}</dd>
          </div>
          <div>
            <dt>{t.issued}</dt>
            <dd>{date(invoice.issuedAt || invoice.createdAt)}</dd>
          </div>
          <div>
            <dt>{t.due}</dt>
            <dd>{date(invoice.dueAt)}</dd>
          </div>
        </dl>

        {invoice.summary ? <p className="pay-summary">{invoice.summary}</p> : null}

        <table className="pay-lines">
          <thead>
            <tr>
              <th>{t.item}</th>
              <th>{t.qty}</th>
              <th>{t.price}</th>
              <th>{t.amount}</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((item, i) => (
              <tr key={i}>
                <td>{item.description}</td>
                <td>{item.quantity}</td>
                <td>{money(item.unitAmount)}</td>
                <td>{money(round2(item.quantity * item.unitAmount))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="pay-totals">
          <div>
            <dt>{t.subtotal}</dt>
            <dd>{money(invoice.subtotal)}</dd>
          </div>
          {invoice.vatRate > 0 ? (
            <div>
              <dt>{t.vat(invoice.vatRate)}</dt>
              <dd>{money(invoice.vatAmount)}</dd>
            </div>
          ) : null}
          <div className="pay-total">
            <dt>{t.total}</dt>
            <dd>{money(invoice.total)}</dd>
          </div>
          {invoice.amountPaid > 0 ? (
            <>
              <div>
                <dt>{t.paid}</dt>
                <dd>− {money(invoice.amountPaid)}</dd>
              </div>
              <div className="pay-total">
                <dt>{t.balance}</dt>
                <dd>{money(balance)}</dd>
              </div>
            </>
          ) : null}
        </dl>

        {invoice.notes ? <p className="muted pay-notes">{invoice.notes}</p> : null}
        <p className="muted pay-legal">{invoice.externalDocUrl ? null : t.notTax}</p>
      </article>

      {invoice.status === 'void' ? (
        <p className="card muted">{t.cancelled}</p>
      ) : !open ? (
        <p className="card pay-banner good">✓ {t.paidInFull}</p>
      ) : (
        <section className="card pay-actions no-print">
          <div className="pay-amount-due">
            <span>{t.balance}</span>
            <strong>{money(balance)}</strong>
          </div>
          <div className="pay-buttons">
            {cardPayment ? (
              <button type="button" className="button pay-button" onClick={payByCard} disabled={busy}>
                {busy ? t.starting : t.payCard}
              </button>
            ) : null}
            {paymentLinkUrl ? (
              <a className={`button ${cardPayment ? 'button-secondary' : ''} pay-button`} href={paymentLinkUrl} target="_blank" rel="noopener noreferrer">
                {t.payLink}
              </a>
            ) : null}
          </div>
          {cardPayment ? <p className="muted small-note">{t.secure}</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {paymentInstructions ? (
            <div className="pay-instructions">
              <p className="eyebrow">{t.other}</p>
              <p>{paymentInstructions}</p>
            </div>
          ) : null}
        </section>
      )}

      <div className="pay-footer no-print">
        {taxDocUrl ? (
          <a className="button button-secondary button-compact" href={taxDocUrl} target="_blank" rel="noopener noreferrer">
            {t.taxDoc}
          </a>
        ) : null}
        <button type="button" className="button button-secondary button-compact" onClick={() => window.print()}>
          {t.print}
        </button>
      </div>
    </div>
  );
}

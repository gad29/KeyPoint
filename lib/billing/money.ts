import type { InvoiceLineItem } from '@/data/domain';

/**
 * Rounds half-up to 2 decimals (agorot / cents). Shifting via the exponent string avoids binary
 * float artefacts: 607.545 is stored as 607.54499…, which naive `Math.round(x * 100)` rounds down.
 */
export function round2(value: number) {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  // Tiny or huge numbers already print in exponent form; they have no agorot to round.
  if (String(abs).includes('e')) return (sign * Math.round(abs * 100)) / 100 || 0;
  return (sign * Number(`${Math.round(Number(`${abs}e2`))}e-2`)) || 0;
}

/** Totals are computed in whole minor units (agorot) so VAT rounding is exact. */
export function computeTotals(lineItems: InvoiceLineItem[], vatRate: number) {
  const subtotalMinor = lineItems.reduce((sum, item) => sum + Math.round(round2(item.quantity * item.unitAmount) * 100), 0);
  const vatMinor = Math.round((subtotalMinor * vatRate) / 100);
  return { subtotal: subtotalMinor / 100, vatAmount: vatMinor / 100, total: (subtotalMinor + vatMinor) / 100 };
}

export function toMinorUnits(amount: number) {
  return Math.round(round2(amount) * 100);
}

/** Israeli VAT is 18% (since January 2025); other currencies default to no VAT. */
export function defaultVatRateFor(currency: string) {
  return currency.toUpperCase() === 'ILS' ? 18 : 0;
}

export function formatMoney(amount: number, currency: string, language: 'he' | 'en' = 'he') {
  try {
    return new Intl.NumberFormat(language === 'he' ? 'he-IL' : 'en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function balanceDue(invoice: { total: number; amountPaid: number }) {
  return Math.max(0, round2(invoice.total - invoice.amountPaid));
}

export function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

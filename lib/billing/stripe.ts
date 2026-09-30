import crypto from 'node:crypto';
import type { InvoiceRecord } from '@/data/domain';
import { env, hasStripeConfig } from '@/lib/env';
import { balanceDue, toMinorUnits } from '@/lib/billing/money';
import type { ActionResult } from '@/lib/types';

/** Stripe REST API, called directly with fetch (no SDK). STRIPE_API_BASE exists only for local testing. */
function apiBase() {
  return (env.stripeApiBase || 'https://api.stripe.com').replace(/\/$/, '');
}

/** Stripe expects form encoding with bracket notation for nested fields. */
function formEncode(value: unknown, prefix = '', out = new URLSearchParams()) {
  if (value === undefined || value === null) return out;
  if (typeof value === 'object') {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      formEncode(inner, prefix ? `${prefix}[${key}]` : key, out);
    }
  } else {
    out.append(prefix, String(value));
  }
  return out;
}

async function stripeRequest<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<ActionResult<T>> {
  if (!hasStripeConfig()) return { ok: false, error: 'Stripe is not configured' };
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${env.stripeSecretKey}`,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: body ? formEncode(body).toString() : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const json = (await res.json()) as T & { error?: { message?: string } };
    if (!res.ok) return { ok: false, error: json.error?.message || `Stripe error ${res.status}` };
    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Stripe request failed' };
  }
}

export interface CheckoutSession {
  id: string;
  url: string | null;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number | null;
  currency: string | null;
  payment_intent: string | { id: string } | null;
  metadata: Record<string, string> | null;
}

/** One-time Checkout Session for the invoice's remaining balance. Sessions expire after 24h, so create on click. */
export async function createCheckoutSession(invoice: InvoiceRecord, opts: { payUrl: string; businessName: string }) {
  const amount = toMinorUnits(balanceDue(invoice));
  if (amount <= 0) return { ok: false as const, error: 'Nothing left to pay on this invoice' };
  return stripeRequest<CheckoutSession>('POST', '/v1/checkout/sessions', {
    mode: 'payment',
    client_reference_id: invoice.id,
    customer_email: invoice.clientEmail || undefined,
    success_url: `${opts.payUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: opts.payUrl,
    metadata: { invoice_id: invoice.id, invoice_number: invoice.number },
    payment_intent_data: { metadata: { invoice_id: invoice.id, invoice_number: invoice.number } },
    line_items: {
      0: {
        quantity: 1,
        price_data: {
          currency: invoice.currency.toLowerCase(),
          unit_amount: amount,
          product_data: { name: `${opts.businessName} · #${invoice.number}` },
        },
      },
    },
  });
}

export async function retrieveCheckoutSession(sessionId: string) {
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { ok: false as const, error: 'Invalid session id' };
  return stripeRequest<CheckoutSession>('GET', `/v1/checkout/sessions/${sessionId}`);
}

export function paymentIntentId(session: CheckoutSession) {
  const pi = session.payment_intent;
  return typeof pi === 'string' ? pi : pi?.id || session.id;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: CheckoutSession & Record<string, unknown> };
}

/**
 * Verifies the Stripe-Signature header (t=timestamp,v1=hmac) against the raw request body,
 * rejecting events older than the tolerance to limit replays.
 */
export function verifyStripeWebhook(rawBody: string, header: string | null, secret: string, toleranceSeconds = 300): ActionResult<StripeEvent> {
  if (!header) return { ok: false, error: 'Missing Stripe-Signature header' };
  const parts = header.split(',').map((p) => p.trim().split('='));
  const timestamp = parts.find(([k]) => k === 't')?.[1];
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || !signatures.length) return { ok: false, error: 'Malformed Stripe-Signature header' };

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return { ok: false, error: 'Stripe event timestamp outside tolerance' };

  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex'));
  const matched = signatures.some((sig) => {
    const given = Buffer.from(sig);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  if (!matched) return { ok: false, error: 'Stripe signature mismatch' };

  try {
    return { ok: true, data: JSON.parse(rawBody) as StripeEvent };
  } catch {
    return { ok: false, error: 'Invalid JSON payload' };
  }
}

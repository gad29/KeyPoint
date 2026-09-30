# Billing and payment reminders

Steps 4 and 5 of the client lifecycle: summarize the work, send a payment request, and follow up politely until it's paid.

Everything here needs the **Postgres** backend (or demo mode locally). On Airtable, the billing tab explains that a database is required.

## Payment requests

From a client's case → *Billing* tab → *New payment request*:

- Line items (description, quantity, price before VAT), VAT rate (default 18% for ILS), due date (default 14 days).
- **Service summary**: what was done and delivered. It appears in the message to the client and on the payment page.
- *Save as draft* or *Issue and send*.

Each request gets a private payment page, `/pay/<token>` (an unguessable 32-character link), showing line items, VAT, amount paid and balance, plus the ways to pay.

**Legal note (Israel):** a document the app issues is a **payment request (דרישת תשלום)**, not a tax invoice (חשבונית מס). The page says so. To issue a legal tax invoice, connect Green Invoice or iCount and use *Issue tax invoice* on the request; the provider's document link is then shown to the client.

Totals are computed in whole agorot, so VAT is exact (e.g. 18% of ₪3,375.25 = ₪607.55).

## Sending

*Send to client* prepares a message with the summary, amount, due date and payment link:

- **WhatsApp**: opens WhatsApp with the text ready (no setup needed).
- **Copy**: paste anywhere.
- **Email**: needs `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY` + `EMAIL_FROM_ADDRESS`, or `EMAIL_PROVIDER_WEBHOOK_URL` (e.g. n8n).

Sending moves the case to *Invoice sent*. When every open request is paid, the case moves to *Paid*.

## How clients pay

| Option | Setup | Marks paid automatically |
|---|---|---|
| Card (Stripe Checkout) | `STRIPE_SECRET_KEY` | Yes, via the webhook and when the client returns from Stripe |
| Your own link (Bit, PayBox, PayPal…) | Admin → *Billing settings* | No: mark paid by hand |
| Bank transfer details | Admin → *Billing settings* | No: mark paid by hand |
| Cash / check / anything else | — | *Mark payment* on the request (partial payments supported) |

### Stripe setup

1. Put your secret key in `STRIPE_SECRET_KEY` (a `sk_test_…` key while testing).
2. Stripe dashboard → Developers → Webhooks → add endpoint `https://<your-domain>/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Put the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Checkout charges the **remaining balance**, so a partly paid request can be finished by card.

Webhooks are verified (signature + 5-minute replay window). A payment is recorded only once, even if Stripe retries or the webhook and the return page arrive at the same moment.

## Payment reminders

Default cadence, in days after the due date: **3** (friendly) → **10** (reminder) → **21** (firm) → **30** (final). Change it in Admin → *Billing settings*.

A daily run drafts the next reminder for every overdue, unpaid, unpaused request:

- **Default: approval queue.** Office → *Payments* lists each draft. Send via WhatsApp or email, copy it, edit it first, or skip it.
- **Auto-send (opt in).** With email configured and *auto-send* on, reminders go out by email immediately.
- Reminders stop as soon as the request is paid; any draft still waiting is skipped. *Pause reminders* on a request stops them by hand.
- Wording is courteous at every step. It never threatens legal action or fees, and the firm and final steps offer a payment plan.

### AI drafting (optional)

With `ANTHROPIC_API_KEY` set and *AI drafting* on, Claude writes each reminder from the request's facts (client, amount, due date, days overdue, service summary, tone). Details:

- Model: `claude-opus-5-5` by default (override with `ANTHROPIC_MODEL`), at low effort, returning structured JSON.
- Server-side refusal fallback (`fallbacks: "default"`) is enabled, so a declined request is retried on a suitable model automatically.
- The payment link is always present; it's appended if missing.
- On any error, refusal or malformed reply, the built-in template is used instead, so a reminder is always drafted.

### Scheduling the daily run

Set `CRON_SECRET`, then either:

- **Vercel**: `vercel.json` already schedules `/api/chase/run` daily at 07:00 UTC; Vercel sends the secret automatically.
- **n8n / VPS**: import `n8n/workflows/12-invoice-chase.json` (daily 10:00 Israel time). It calls `/api/chase/run` with the `x-cron-secret` header.

Staff can also press *Check reminders now* on the Payments screen.

## Accounting providers

| Provider | Status |
|---|---|
| Green Invoice (Morning) | Issues tax invoices (type 305). **Beta**: built from the public API docs, not yet tested with a live account. Test against the sandbox with `GREEN_INVOICE_API_BASE`. |
| iCount | Issues tax invoices (`doc/create`). **Beta**, same caveat. |
| QuickBooks, Xero | Placeholders. They need an OAuth app and a per-business connect flow. |

## API

| Route | Access | Purpose |
|---|---|---|
| `GET/POST /api/invoices` | staff | List (filters: `caseId`, `status`) / create |
| `GET/PATCH /api/invoices/:id` | staff | Detail with payments and reminders / issue, void, pause, resume, mark-paid, update |
| `POST /api/invoices/:id/message` | staff | Prepare the client message, or `{ send: "email" }` |
| `POST /api/invoices/:id/tax-document` | staff | Issue a tax invoice via a connected provider |
| `GET /api/chase` | staff | Reminders awaiting approval |
| `POST /api/chase/:runId` | staff | Approve (email / WhatsApp / manual, optional edits) or skip |
| `GET/POST /api/chase/run` | `CRON_SECRET` or staff | Daily reminder pass |
| `POST /api/pay/:token/checkout` | public (token) | Start Stripe Checkout |
| `POST /api/webhooks/stripe` | Stripe signature | Record card payments |
| `GET/PUT /api/admin/billing` | admin | Billing settings + connection status |

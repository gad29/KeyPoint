# Agency OS — Pivot Roadmap

Turning KeyPoint (Israeli mortgage advisor MVP) into **Agency OS**: a client-onboarding portal + invoice-chase engine for small service agencies (marketing, creative, consulting) in both the US (English, Stripe/QuickBooks) and Israeli (Hebrew RTL, iCount / Green Invoice) markets.

## The two products, merged

1. **Client Onboarding Automation** — a branded, per-agency wizard that replaces email ping-pong. Client uploads brand assets, signs contracts, fills intake; everything syncs to the agency's workspace.
2. **Invoice Chaser** — connects to accounting software, sends polite → escalating AI-generated follow-ups on late invoices, each with a one-click pay link.

Threaded through one client record: onboarded → invoiced → paid.

---

## What we keep from KeyPoint

| KeyPoint piece | Reused as |
|---|---|
| `/intake` 5-step wizard (RTL/EN, resumable) | Generic onboarding wizard, driven by per-agency templates |
| `/portal` signed invite tokens + `POST /api/invites` | Branded client portal |
| `/office` staff dashboard + `/admin` | Agency workspace + admin |
| `POST /api/uploads` + n8n event forward | Contract / brand-asset uploads (storage backend swapped) |
| Staff auth (bcrypt, session cookies) via `lib/office-auth.ts` / `lib/staff-session.ts` | Agency user auth, extended for multi-tenant |
| `n8n/workflows/` scaffolding + `lib/n8n.ts` | Automation engine for onboarding drip + invoice chase cadence |
| Hebrew + English (RTL) via `components/i18n.tsx` | Locale core |
| Settings-file generator (`scripts/apply-settings.mjs`) + PM2/Vercel deploy | Ops path unchanged |

## What gets removed / rewritten

- `data/domain.ts` — mortgage-specific types (`CaseType`, `BorrowerProfile`, `documentLibrary`, `sampleOffers`) → replaced by generic `Client`, `OnboardingTemplate`, `Invoice`.
- `lib/intake.ts` — mortgage-specific `IntakePayload` → generic template-driven form schema.
- `lib/airtable.ts` (~1040 lines) — replaced by Supabase/Prisma data layer.
- `lib/repository.ts` (~484 lines) — thinned to a service layer over Prisma.
- n8n workflows `04-appraiser-dispatch`, `05-bank-followup-reminders`, `10-appraiser-followup`, `11-receipt-pdf-generator` — deleted.
- Bank-run / offer-comparison code paths and `/office/case` bank UI — deleted.

---

## Target architecture

```
Agency OS
├─ Multi-tenant core (Supabase / Postgres)
│  Agency → Users → Clients → (OnboardingSubmission | Invoice)
├─ Onboarding module
│  ├─ OnboardingTemplate (form fields, required uploads, contracts to e-sign, welcome copy)
│  ├─ Public wizard  /w/[agencySlug]/[templateSlug]
│  ├─ Client portal  /portal/[token]   (resumable, upload progress)
│  ├─ E-signature (canvas draw → PDF-baked with pdf-lib, audit trail)
│  └─ Sync destinations: Notion, Google Drive, Airtable, Slack notify
├─ Billing module
│  ├─ Invoice CRUD + statuses (draft / sent / viewed / paid / overdue / written-off)
│  ├─ Accounting adapters:
│  │  ├─ Stripe (checkout + one-click pay link)                  [global]
│  │  ├─ iCount              [IL VAT-compliant invoicing]
│  │  ├─ Green Invoice       [IL alt]
│  │  └─ QuickBooks / Xero   [read-only sync of existing invoices]
│  ├─ Payment link: Stripe Checkout is the always-on rail
│  └─ Chase engine
│     ├─ Cadence: T+3 friendly → T+10 reminder → T+21 firm → T+30 escalate-to-owner
│     ├─ AI-drafted body (Claude API) that honors tone + client history
│     ├─ One-click "Pay now" CTA in every email
│     └─ Auto-pause on client reply / partial payment
├─ Automations (n8n, kept)
│  ├─ onboarding.step-completed, onboarding.assets-received, onboarding.signed
│  ├─ invoice.overdue, invoice.chase-send, invoice.paid, invoice.client-replied
│  └─ Slack / WhatsApp / email pings to agency owner
└─ Admin
   ├─ Branding (logo, colors, custom domain)
   ├─ Team seats + roles (owner / admin / member)
   └─ Templates + chase-cadence editor
```

---

## Data model (Supabase / Prisma)

Every row scoped by `agency_id` (row-level security on Supabase).

```
Agency          id · slug · name · logoUrl · primaryColor · locale · currency · vatId · domain
User            id · agencyId · email · passwordHash · role · name
Client          id · agencyId · name · email · phone · locale · notes · timeline (jsonb)
OnboardingTemplate  id · agencyId · slug · name · steps (jsonb) · requiredAssets (jsonb) · contractTemplateId
Contract        id · agencyId · name · body (markdown/HTML) · variables (jsonb)
OnboardingSubmission  id · agencyId · clientId · templateId · status · answers (jsonb) · signedContractUrl · completedAt
Upload          id · agencyId · clientId · submissionId? · fileName · storagePath · mimeType · size · uploadedAt
Invoice         id · agencyId · clientId · number · lineItems (jsonb) · currency · subtotal · vat · total · issuedAt · dueAt · paidAt · status · sourceAdapter · externalId
InvoicePayment  id · invoiceId · amount · method · paidAt · stripeChargeId?
ChaseSchedule   id · agencyId · name · steps (jsonb: [{ dayOffset, tone, aiPrompt }])
ChaseRun        id · invoiceId · scheduleId · stepIndex · sentAt · openedAt · repliedAt · status
AutomationEvent id · agencyId · kind · payload (jsonb) · createdAt   -- generic audit
```

Timeline for a client = union of `OnboardingSubmission` events + `Invoice` events + `ChaseRun` events, ordered.

---

## Phases

### Phase 0 — This session
- Roadmap doc committed. (This file.)

### Phase 1 — Neutralize KeyPoint (1 session)
Goal: same app runs, but mortgage vocabulary is gone; new generic types are in place.

- Rename `CaseRecord` → `ClientRecord`, `CaseStage` → `OnboardingStage` (generic states: `invited`, `in-progress`, `submitted`, `active`, `archived`).
- Replace `data/domain.ts` mortgage enums with a minimal generic `ClientRecord` + placeholder `OnboardingTemplate` shape.
- Delete `sampleOffers`, `BankOffer`, bank-run code paths; delete `/office/case` bank UI section.
- Delete n8n workflows 04, 05, 10, 11; rename remaining to `onboarding.*` / `client.*`.
- `lib/intake.ts` becomes template-driven (steps as data, not hardcoded).
- Update README, delete or archive `docs/advisor-dashboard.md`, `docs/finish-and-deploy-plan.md`, `docs/keypoint-work-vps-checklist.md`.
- App still boots against existing Airtable base (Airtable adapter stays alive during migration).

**Ship criterion**: `npm run dev` works, `/intake` renders as a generic 3-step wizard, `/office` shows clients, TypeScript passes.

### Phase 2 — Data layer + Postgres ✅ (done 2026-09-30)

Shipped:
- `DataStore` interface (`lib/data/`) with three backends: `postgres` (Supabase or any Postgres), `airtable` (unchanged behaviour for existing tenants), `demo` (zero-config local JSON).
- Multi-tenant schema in `db/migrations/001_init.sql` (every row has `agency_id`; RLS enabled with no public policies), including Phase 3–4 tables (templates, invoices, payments, chase schedules/runs).
- `npm run db:up | db:migrate | db:bootstrap`; local Docker Postgres in `docker-compose.yml`.
- Repository, staff auth, admin finance and billing routes all go through the store.
- Finance categories are now per preset.
- Fixed: an unreachable n8n webhook made intake return 500 after the case was already saved.

Decided: kept the custom bcrypt + signed-cookie staff auth (works on every backend); one agency per deployment via `AGENCY_SLUG` for now.

Still open from the original Phase 2 plan:
- Airtable → Postgres data import script.
- Preset read from the agency row instead of `AGENCY_OS_PRESET`.
- Multi-agency routing and self-serve sign-up (needs billing for the subscription itself).

Original plan:
- Add Supabase project (or self-hosted Postgres). Add Prisma with schema above.
- Row-level security policies keyed on `agency_id` from JWT.
- Migrate `lib/airtable.ts` callers to Prisma; keep `lib/airtable.ts` as an *optional export adapter* (agency-side "mirror to my Airtable" feature) — not the source of truth anymore.
- Bootstrap script: create first agency + owner user for local dev.
- Deploy: Supabase for db+auth, Vercel or CloudPanel VPS for the Next app (same as today).

**Ship criterion**: sign up as an agency, log in, see empty client list.

### Phase 3 — Onboarding as a real product ✅ (done 2026-09-30)

Shipped (details in `docs/onboarding.md`):
- Template model + admin editor (`/admin/onboarding`): steps, typed fields, documents, optional bilingual agreement with placeholders and a sample text.
- Public links `/w/<template>`; `/intake` serves the default template. Drafts autosave.
- E-signature: canvas signing; server stores rendered text, SHA-256, signer, time, IP, browser; printable staff view.
- Client portal with document checklist and uploads (XHR progress), signed-agreement status.
- Uploads now require the client's signed link or staff session (previously anyone with a case number could upload). Storage adapter: local disk or Supabase Storage. Staff-only downloads.
- One-click missing-documents reminder (WhatsApp deep link / copy / n8n workflow 13).
- Branding (name, logo, color) with the theme's accents now fully variable-driven.
- Client link tokens no longer carry name/phone.
- Fixed: jsonb values double-encoded on Postgres (migration 003 repairs existing rows).

Not done / later:
- PDF export of signed agreements (Hebrew RTL needs font embedding); browser print covers it for now.
- Per-client pre-filled onboarding links; letting secretary roles copy template links from the office.
- Notion / Google Drive sync on submission.

Original plan:
- `OnboardingTemplate` editor in `/admin/templates` — steps, required assets, contract picker.
- Public wizard `/w/[agencySlug]/[templateSlug]` reads a template and renders it.
- Uploads: swap local disk for Supabase Storage; drag-and-drop with progress.
- E-signature: HTML5 canvas draw component + `pdf-lib` bake + SHA-256 hash + timestamp in audit log.
- Branded portal: agency logo + primary color pulled from `Agency` row.
- n8n: `onboarding.submitted` fires → email agency owner + create Notion/Drive folder (via connectors).

**Ship criterion**: create a template, share a link, walk it end-to-end, contract PDF lands in the client record.

### Phase 4 — Billing + payment reminders ✅ (done 2026-09-30)

Shipped (details in `docs/billing.md`):
- Payment requests (line items, VAT, due date, service summary) per case or standalone; labelled "payment request", not a tax invoice.
- Client payment page `/pay/<token>`: Stripe Checkout for the remaining balance, your own payment link, bank details; print view.
- Stripe: checkout session, signed webhook (idempotent under concurrency), confirmation on return; tested against a local Stripe mock.
- Reminder engine: configurable cadence (3/10/21/30 days), approval queue at `/office/billing` or opt-in auto-send by email, stops on payment, pause per request; daily run via Vercel Cron or n8n workflow 12.
- Optional Claude drafting (`claude-opus-5-5`, structured output, refusal fallback) with template fallback.
- Email via Resend or webhook; WhatsApp deep links everywhere as the zero-setup channel.
- Case stage sync: invoice-sent → overdue → paid.
- Green Invoice + iCount tax-invoice adapters (beta, unverified); QuickBooks / Xero placeholders.
- Fixed while testing: VAT rounding off by one agora on half-agora amounts.

Not done / later:
- Verify Green Invoice / iCount against live or sandbox accounts.
- Inbound email to auto-pause reminders when a client replies.
- QuickBooks / Xero OAuth sync; recurring (retainer) invoices.
- Reminder language from the client's saved preference (currently Hebrew for ILS businesses).

Original plan:
- Invoices UI: create, send, mark paid; internal invoices for agencies that don't have accounting software.
- **Stripe adapter first** (Checkout link = one-click pay); on `checkout.session.completed` webhook, mark `Invoice.status = paid`.
- iCount + Green Invoice adapters: scaffolded with API-key config in admin; each implements `createInvoice`, `getInvoice`, `listOverdue`, `markPaidExternally`.
- QuickBooks + Xero adapters: scaffolded read-only (list invoices, sync status).
- Chase engine as an n8n workflow: nightly cron → find overdue → for each, look up its `ChaseSchedule` step → generate email via Claude API (system prompt honors tone + prior chase history) → send via Resend/SendGrid → log `ChaseRun`.
- Auto-pause: inbound-email webhook (Postmark or Cloudflare Email) marks the chase paused when the client replies.

**Ship criterion**: overdue Stripe invoice triggers a real chase email with a working pay link; payment marks it paid and stops the chase.

### Phase 5 — Polish + growth (as needed)
- Unified client timeline (onboarding + invoices + chase runs).
- Team roles + audit log.
- Slack + WhatsApp (Twilio) notifications for the agency owner.
- White-label domains (Vercel/Cloudflare-for-SaaS style).

---

## Decisions locked (from planning conversation)

| Question | Answer |
|---|---|
| Target market | Dual-market from day one: US (English, Stripe/QuickBooks) + Israel (Hebrew RTL, iCount/Green Invoice) |
| Data layer | Postgres/Supabase is the recommended system of record; Airtable stays a supported backend; demo mode for zero-config trials. |
| Payment/accounting integrations in v1 | Scaffold **all** of Stripe, iCount, Green Invoice, QuickBooks, Xero. Wire Stripe end-to-end first; others get real credentials as agencies request them. |
| Execution style | Phased, roadmap-committed, review between phases |

## Open questions to answer before Phase 2

- **Auth**: Supabase Auth (magic link + email/password) vs. keep custom bcrypt sessions? Supabase Auth gives us RLS integration for free but changes the auth flow already in `lib/staff-session.ts`.
- **E-sign compliance**: is a canvas-signed + hashed + timestamped PDF enough for the markets we're targeting, or do we need to plan for DocuSign integration for regulated verticals?
- **Domain / branding**: is "Agency OS" the working name, or do you have one in mind? (Affects package.json, repo rename, docs.)
- **Existing KeyPoint data**: is there real production Airtable data to preserve, or can Phase 1 assume a clean slate?

---

## File-by-file impact preview (Phase 1)

| File | Action |
|---|---|
| `data/domain.ts` | Rewrite: remove mortgage enums; add `ClientRecord`, `OnboardingStage`, placeholder `OnboardingTemplate` |
| `lib/intake.ts` | Convert to template-driven form-schema helpers |
| `lib/types.ts` | Rename `CreateCaseInput` → `CreateClientInput`, drop `CreateBankOfferInput` |
| `lib/repository.ts` | Rename APIs (`createCase` → `createClient`, etc.); keep Airtable behind interface for now |
| `lib/airtable.ts` | Rename table constants (`Cases` → `Clients`); leave rest until Phase 2 replaces it |
| `lib/airtable-finance.ts` | Delete (bank-run specific) |
| `components/forms/intake-form.tsx` | Genericize wizard: read steps from a template prop rather than hardcoded mortgage steps |
| `components/office-dashboard.tsx` + `components/case-detail-page.tsx` | Rename "case" → "client"; drop bank-run panels |
| `app/api/cases/route.ts` → `app/api/clients/route.ts` | Rename route + payload validation |
| `app/office/*` | Rename URL structure to `/workspace/clients` (or keep `/office`, agency's call) |
| `n8n/workflows/04, 05, 10, 11.json` | Delete |
| `n8n/workflows/01, 02, 03, 06, 07, 08, 09.json` | Rename + genericize webhook paths (`keypoint/*` → `agency-os/*`) |
| `docs/advisor-dashboard.md`, `docs/finish-and-deploy-plan.md`, `docs/keypoint-work-vps-checklist.md` | Archive under `docs/archive/` |
| `README.md` | Rewrite for Agency OS |
| `package.json` | Rename `keypoint` → project name TBD |

---

## Risks & watch-outs

- **Airtable coupling is deep** (`lib/airtable.ts` is ~1000 lines and referenced by the intake API, repository, admin, n8n forwarders). Phase 1 keeps it alive to avoid a "big bang"; Phase 2 does the real cutover behind a repository interface.
- **The wizard is hardcoded** (`intake-form.tsx` is ~800 lines with mortgage steps). Genericizing it in Phase 3 is real work — we'll likely use a schema like `react-hook-form` + a JSON step definition, and drop the ad-hoc state machine.
- **E-sign legality varies by jurisdiction**. Canvas + hash is fine for most non-regulated B2B contracts; if any agency serves regulated verticals (healthcare, finance), plan DocuSign integration in Phase 5.
- **Multi-tenant + Airtable don't play well.** Each agency having its own Airtable base is impractical from our side; another reason Postgres is the right call in Phase 2.
- **Chase emails can damage relationships if wrong.** The AI drafts always need agency approval on the first cadence per client (or an opt-in "auto-send verified" flag).

---

## Next action

Await your review of this roadmap. When green-lit, execute Phase 1 in a fresh session with its own commit.

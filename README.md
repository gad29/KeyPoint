# Agency OS

Client onboarding + invoice chase for small service businesses. Preset-driven: works out of the box for any small business, adapts to verticals like mortgage advisors via a preset.

Originally built as **KeyPoint** for Israeli mortgage advisors; the mortgage flow is preserved as the `mortgage-advisor` preset.

## The 5-step client lifecycle

Agency OS replaces email ping-pong and manual chasing with five one-click actions:

| # | Step | What happens |
|---|---|---|
| 1 | **Send onboarding link** | Client walks a branded wizard: details, uploads, e-sign |
| 2 | **Remind for missing docs** | One button sends a polite reminder in the client's language |
| 3 | **Updates during the service** | Optional personal tracking link + one-click status updates |
| 4 | **Issue the invoice** | Via Stripe / iCount / Green Invoice / QuickBooks / Xero |
| 5 | **Auto-chase late payments** | Escalating AI-drafted emails with a one-click pay link |

## Presets

A preset shapes the vocabulary, wizard steps, dashboard columns, and which n8n workflows apply.

| Preset | For | Extras |
|---|---|---|
| `default` | Any small service business | Generic 3-step wizard (contact, service, consent), invoicing |
| `mortgage-advisor` | Israeli mortgage advisors (legacy KeyPoint flow) | 5-step mortgage wizard, borrower profiles, case types, bank-offer panel, appraiser workflows |

Select the active preset with `AGENCY_OS_PRESET=default|mortgage-advisor` (default: `default`).

Adding your own preset: drop a `lib/presets/<your-slug>.ts` that exports a `Preset` and register it in `lib/presets/index.ts`. See [`docs/presets.md`](docs/presets.md).

## Roadmap

Full plan: [`docs/agency-os-roadmap.md`](docs/agency-os-roadmap.md).

- **Phase 0** ✅ Roadmap committed
- **Phase 1** ✅ Preset system, generic wizard, invoice/chase scaffolding, mortgage flow preserved as preset
- **Phase 2** Supabase (Postgres) multi-tenant migration
- **Phase 3** Onboarding as a real product (templates, e-sign, branded portal)
- **Phase 4** Billing + chase engine (Stripe first, then iCount / Green Invoice / QuickBooks / Xero)
- **Phase 5** Polish (unified timeline, teams, WhatsApp/Slack)

## What works today

- Preset-driven public wizard at `/intake` — generic 3-step for `default`, full 5-step mortgage wizard for `mortgage-advisor`
- Signed client invite tokens + `/portal/[token]` progress link
- Office dashboard (`/office/active`, `/stuck`, `/completed`) + case detail with document tracking
- Airtable-backed data (Phase 2 will replace with Supabase; Airtable stays as an optional export)
- `POST /api/uploads` with n8n forwarding
- Staff auth (bcrypt sessions)
- Invoice + chase API stubs (`/api/invoices`, `/api/chase`) — Phase 4 wires the adapters end-to-end
- Adapter scaffolds for Stripe, iCount, Green Invoice, QuickBooks, Xero
- Hebrew + English, RTL support

## Settings file flow

Everything below is **optional**. Only fill in what you actually use.

1. Copy the example:
   ```bash
   cp keypoint.settings.example.json keypoint.settings.json
   ```
2. Fill in the values you have (Airtable, n8n, WhatsApp, email, payment providers). Leave the rest blank.
3. Generate env files:
   ```bash
   npm run apply-settings
   ```
4. Generated outputs:
   - `.env.local`, `.env.production.local`
   - `n8n/.env.generated`
   - `generated/vercel.env`
   - `generated/connections-summary.md`

Legacy filename `keypoint.settings.json` is kept for compatibility; Phase 2 will rename to `agency-os.settings.json`.

## Run locally

```bash
npm install
npm run apply-settings   # after keypoint.settings.json exists
npm run dev
```

Try the alternate preset:

```bash
AGENCY_OS_PRESET=mortgage-advisor npm run dev
```

## Core routes

- `/` — landing (preset-aware copy)
- `/intake` — public onboarding wizard (shape depends on active preset)
- `/progress/:token` — read-only client progress page
- `/office/active` · `/office/stuck` · `/office/completed` — pipeline buckets
- `/office/case/:caseId` — case detail (mortgage panels hidden unless mortgage preset)
- `/login` · `/admin`

## Core API routes

- `GET /api/cases` · `POST /api/cases` — list / create cases. Public path for `source: 'generic-intake'` and `source: 'native-intake'`; staff session required otherwise
- `GET /api/cases/:caseId` · `PATCH /api/cases/:caseId` — read / update a case
- `POST /api/cases/:caseId/offers` — mortgage-advisor preset only
- `POST /api/invites` — signed client portal link
- `POST /api/uploads` — file upload + n8n forward
- `GET /api/invoices` · `POST /api/invoices` — invoice CRUD *(scaffold; Phase 4)*
- `GET /api/chase` · `POST /api/chase` — invoice chase engine *(scaffold; forwards to n8n if configured)*
- `POST /api/webhooks/n8n` — generic n8n forwarder

## Deploy

### Vercel
- Copy values from `generated/vercel.env` into Vercel env vars.
- Copy `n8n/.env.generated` into your n8n environment.
- Import workflows from `n8n/workflows/` — see [`n8n/README.md`](n8n/README.md) for which apply per preset.
- Set `OFFICE_ACCESS_CODE` in production before exposing `/office` publicly.

### Self-hosted VPS / CloudPanel
- Copy `.env.production.example` to `.env.production.local`, or generate it via `npm run apply-settings`.
- Build with `npm run build`, start with `pm2 start ecosystem.config.cjs`.
- Full guide: [`docs/cloudpanel-vps-deploy.md`](docs/cloudpanel-vps-deploy.md).

## Key docs

- [`docs/agency-os-roadmap.md`](docs/agency-os-roadmap.md) — the pivot plan
- [`docs/presets.md`](docs/presets.md) — how to configure or add a preset
- [`docs/integration-checklist.md`](docs/integration-checklist.md)
- [`docs/automation-implementation.md`](docs/automation-implementation.md)
- [`docs/n8n-workflows.md`](docs/n8n-workflows.md)
- [`docs/advisor-dashboard.md`](docs/advisor-dashboard.md) — reference for the mortgage-advisor preset

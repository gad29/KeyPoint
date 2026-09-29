# Agency OS · n8n automation pack

Importable n8n workflow JSON drafts. Each workflow is tagged in `workflows/manifest.json` with the preset it belongs to.

## Preset scope

Agency OS ships as a preset-driven platform. A tenant's active preset (see `AGENCY_OS_PRESET` env or `keypoint.settings.json` → `preset`) decides which workflows apply.

| Workflow | Preset | Purpose |
|---|---|---|
| `01-native-intake-post-create.json` | default | New client submitted the wizard — alert the agency to review |
| `02-office-approval-portal-invite.json` | default | Agency approved — generate a signed client portal link |
| `03-document-upload-review-queue.json` | default | Client uploaded a file — route to the review queue + OCR |
| `04-appraiser-dispatch.json` | mortgage-advisor | Dispatch a mortgage appraisal request |
| `05-bank-followup-reminders.json` | mortgage-advisor | Daily reminder for open bank runs |
| `06-ai-review-handoff.json` | default | Send anonymized stage snapshot to the AI review pipeline |
| `07-client-status-notifications.json` | default | Notify the client on status changes via WhatsApp/email fallback |
| `08-secretary-daily-briefing.json` | default | Daily briefing of what needs attention |
| `09-missing-docs-client-reminder.json` | default | One-click reminder for missing documents |
| `10-appraiser-followup.json` | mortgage-advisor | Follow-up when an appraiser is late |
| `11-receipt-pdf-generator.json` | mortgage-advisor | Generate a mortgage-advisor receipt PDF |
| `12-invoice-chase.json` | default | *(Phase 4)* Escalating AI-drafted email cadence for overdue invoices |

Machine-readable list: [`workflows/manifest.json`](workflows/manifest.json).

## Setup

1. Populate `keypoint.settings.json` (rename to `agency-os.settings.json` planned in Phase 2).
2. Run `npm run apply-settings` — writes `n8n/.env.generated`.
3. Import only the workflows for your active preset (see table above).
4. Load `n8n/.env.generated` into your n8n environment.
5. Set up credentials: `Airtable KeyPoint` (or your Postgres/Supabase creds in Phase 2).

## Webhook paths

Workflows send outbound events to paths like `keypoint/document-upload`, `keypoint/stage-review`, etc. These paths will be renamed to `agency-os/*` during the Phase 2 backend rewrite; for now they are kept for compatibility with existing tenants.

## Environment values used by workflow drafts

`AIRTABLE_BASE_ID`, `KEYPOINT_APP_BASE_URL`, `OFFICE_ALERT_WEBHOOK_URL`, `WHATSAPP_PROVIDER_WEBHOOK_URL`, `SMS_PROVIDER_WEBHOOK_URL`, `EMAIL_PROVIDER_WEBHOOK_URL`, `DOCUMENT_OCR_WEBHOOK_URL`, `AI_REVIEW_WEBHOOK_URL`, `TWILIO_*`, `EMAIL_*`, `GOOGLE_*`.

Phase 4 will add: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ICOUNT_*`, `GREEN_INVOICE_*`, `QUICKBOOKS_*`, `XERO_*`.

## Assumptions

- Airtable is the operational system of record for the MVP (Phase 2 moves to Postgres).
- The app itself is the source of intake creation, portal invites, and (from Phase 4) invoice creation.
- OCR, AI review, and payment providers are externalized as webhook/API steps so workflows stay vendor-neutral.
- The exports are practical starting points, not zero-touch production snapshots.

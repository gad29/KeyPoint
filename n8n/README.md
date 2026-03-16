# KeyPoint n8n automation pack

This folder contains importable **draft n8n workflow JSON** files for the Israel mortgage advisor MVP.

## What is included
- `workflows/01-fillout-intake-airtable.json` — Fillout intake -> Airtable case/client creation + checklist seeding
- `workflows/02-office-approval-portal-invite.json` — office approval -> portal invite generation
- `workflows/03-document-upload-review-queue.json` — document upload review queue + OCR/resubmission path
- `workflows/04-appraiser-dispatch.json` — appraisal dispatch and timeout follow-up
- `workflows/05-bank-followup-reminders.json` — daily bank reminder automation
- `workflows/06-ai-review-handoff.json` — anonymized AI review handoff
- `workflows/07-client-status-notifications.json` — client-facing status notifications with WhatsApp/email fallback

## Import notes
1. Import each JSON file into n8n.
2. Set up these credential names or adjust the workflow exports after import:
   - `Airtable KeyPoint`
3. Set environment variables in n8n (or replace `$env.*` references with constants/credentials):
   - `AIRTABLE_BASE_ID`
   - `KEYPOINT_APP_BASE_URL`
   - `OFFICE_ALERT_WEBHOOK_URL`
   - `WHATSAPP_PROVIDER_WEBHOOK_URL`
   - `EMAIL_PROVIDER_WEBHOOK_URL`
   - `DOCUMENT_OCR_WEBHOOK_URL`
   - `AI_REVIEW_WEBHOOK_URL`
4. Confirm Airtable field names match `docs/airtable-schema.md`.
5. Review all trigger/filter logic before activating in production.

## Assumptions baked into the drafts
- Airtable is the operational system of record for the MVP.
- WhatsApp delivery is handled via an approved outbound provider webhook.
- Portal invite generation uses the existing KeyPoint local API: `POST /api/invites`.
- OCR and AI review are externalized as webhook/API steps so the workflows stay vendor-neutral.
- The exports are meant to be practical starting points, not zero-touch production snapshots.

## Recommended rollout order
1. Workflow 1
2. Workflow 2
3. Workflow 3
4. Workflow 7
5. Workflow 4
6. Workflow 5
7. Workflow 6

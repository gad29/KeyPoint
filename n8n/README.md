# KeyPoint n8n workflow pack

Draft/importable n8n workflows for the Israel mortgage advisor MVP.

## Files
- `workflows/01-fillout-intake-to-airtable.json`
- `workflows/02-office-approval-to-portal-invite.json`
- `workflows/03-document-upload-review-queue.json`
- `workflows/04-appraiser-dispatch.json`
- `workflows/05-bank-follow-up-reminders.json`
- `workflows/06-ai-review-handoff.json`
- `workflows/07-client-status-notifications.json`
- `.env.example`

## Import notes
1. Import each workflow JSON into n8n.
2. Add the environment variables from `n8n/.env.example` to the n8n runtime.
3. Point notification webhooks to your WhatsApp/email bridge.
4. Confirm Airtable table names match `docs/airtable-schema.md`.
5. Activate workflows only after replacing placeholder webhook endpoints.

## Current design choices
- Uses generic HTTP Request + Code nodes instead of vendor-specific n8n credentials, so the files stay portable.
- Uses webhook triggers for event-driven flows and a daily webhook trigger for bank reminder scans.
- Portal invite generation calls the existing KeyPoint app endpoint: `/api/invites`.
- Airtable writes are grouped in batched `records` payloads where practical.

## Known limitations
- Airtable links are currently written using MVP-friendly case identifiers and/or provided record IDs; final linked-record behavior may need adjustment to match the live base.
- OCR, AI review, and messaging are wired as outbound webhook handoffs; the actual providers still need to be selected.
- Workflow 5 assumes an external cron or a separate n8n scheduler will call `keypoint/bank-followup-daily` once per workday.

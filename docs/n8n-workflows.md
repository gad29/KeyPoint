# n8n workflow map

Concrete workflow artifacts now live under `n8n/workflows/`.

## Importable workflow files
1. `n8n/workflows/01-native-intake-post-create.json`
2. `n8n/workflows/02-office-approval-portal-invite.json`
3. `n8n/workflows/03-document-upload-review-queue.json`
4. `n8n/workflows/04-appraiser-dispatch.json`
5. `n8n/workflows/05-bank-followup-reminders.json`
6. `n8n/workflows/06-ai-review-handoff.json`
7. `n8n/workflows/07-client-status-notifications.json`

Additional implementation guidance lives in:
- `n8n/README.md`
- `docs/automation-implementation.md`

## Runtime assumptions
- Airtable is the MVP source of truth.
- Native intake case creation happens inside the KeyPoint app, not in n8n.
- Existing KeyPoint API `POST /api/invites` is used for portal invite generation.
- OCR, WhatsApp, email, and AI review remain provider-neutral HTTP steps for now.
- Field names should match `docs/airtable-schema.md` exactly unless you update the imported workflows.

## Workflow summary

### 1) Native intake post-create kickoff
- Trigger: webhook `keypoint/native-intake-created`
- Logs that the new intake is queued for office review
- Optionally forwards an office alert if `OFFICE_ALERT_WEBHOOK_URL` is configured in n8n
- Does not create duplicate case/client/checklist rows

### 2) Office approval -> portal invite generation
- Trigger: Airtable update on `Cases`
- Filters for `Current stage = approved` and pending portal access
- Calls KeyPoint app invite API
- Sends onboarding WhatsApp
- Marks portal as invited and logs activity

### 3) Document upload review queue
- Trigger: webhook `keypoint/document-upload`
- Marks document `under-review`
- Sends file to OCR/extraction endpoint
- Routes approved files to review queue
- Requests resubmission when rejected

### 4) Appraiser dispatch
- Trigger: Airtable update on `Cases`
- Filters for `Current stage = waiting-appraiser`
- Selects appraiser by region
- Sends outbound appraisal brief
- Creates appraisal job + timeout follow-up

### 5) Bank follow-up/reminders
- Trigger: daily n8n cron
- Scans active `Bank runs`
- Flags urgent/expired approvals in principle
- Alerts office and logs follow-up activity

### 6) AI review handoff
- Trigger: Airtable update on `Cases`
- Filters for `secretary-review` / `ready-for-bank`
- Builds anonymized case package from approved docs
- Calls AI review endpoint
- Saves findings to `AI reviews`

### 7) Client status notifications
- Trigger: Airtable update on `Cases`
- Sends stage-based client update
- Uses WhatsApp first, email fallback second
- Logs outbound activity

## MVP cautions
- Native intake is now app-owned, so avoid reintroducing a second system that also creates cases.
- Rebuild the automation layer around the minimal MVP set first; see `docs/n8n-rebuild-plan.md`.
- Review Airtable linked-record handling after the live base is created.
- Replace placeholder provider webhooks with signed, approved production integrations.
- Test all Hebrew templates with real phone/email delivery paths before activation.

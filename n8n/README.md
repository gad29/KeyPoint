# KeyPoint n8n automation pack

This folder contains importable **draft n8n workflow JSON** files for the Israel mortgage advisor MVP.

## What is included
- `workflows/02-office-approval-portal-invite.json` — office approval -> portal invite generation
- `workflows/03-document-upload-review-queue.json` — document upload review queue + OCR/resubmission path
- `workflows/04-appraiser-dispatch.json` — appraisal dispatch and timeout follow-up
- `workflows/05-bank-followup-reminders.json` — daily bank reminder automation
- `workflows/06-ai-review-handoff.json` — anonymized AI review handoff
- `workflows/07-client-status-notifications.json` — client-facing status notifications with WhatsApp/email fallback

## Recommended setup flow
1. Populate `keypoint.settings.json`
2. Run `npm run apply-settings`
3. Import each JSON file into n8n
4. Load values from `n8n/.env.generated`
5. Set up these credential names or adjust the workflow exports after import:
   - `Airtable KeyPoint`
6. Review trigger/filter logic before activating anything in production

## Environment values used by the workflow drafts
- `AIRTABLE_BASE_ID`
- `KEYPOINT_APP_BASE_URL`
- `OFFICE_ALERT_WEBHOOK_URL`
- `WHATSAPP_PROVIDER_WEBHOOK_URL`
- `SMS_PROVIDER_WEBHOOK_URL`
- `EMAIL_PROVIDER_WEBHOOK_URL`
- `DOCUMENT_OCR_WEBHOOK_URL`
- `AI_REVIEW_WEBHOOK_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`
- `TWILIO_SMS_FROM`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_REPLY_TO`
- `EMAIL_API_KEY`
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SHEETS_SPREADSHEET_ID`

## Assumptions baked into the drafts
- Airtable is the operational system of record for the MVP
- Native intake creation happens in the KeyPoint app itself
- Portal invite generation uses the existing KeyPoint app `POST /api/invites`
- OCR and AI review are externalized as webhook/API steps so the workflows stay vendor-neutral
- Upload events can be forwarded from the app to `keypoint/document-upload`
- The exports are meant to be practical starting points, not zero-touch production snapshots

## Recommended rollout order
1. Workflow 02
2. Workflow 03
3. Workflow 07
4. Workflow 04
5. Workflow 05
6. Workflow 06

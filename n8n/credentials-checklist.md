# KeyPoint n8n credentials checklist

Before enabling workflows in n8n, prepare these values.

## Required
- Airtable API token
- Airtable Base ID
- KeyPoint app base URL
- Office alert webhook URL
- WhatsApp provider webhook or API endpoint
- Email provider webhook or API endpoint
- OCR/extraction endpoint
- AI review endpoint

## n8n credential names used by the workflow drafts
- `Airtable KeyPoint`

## Environment variable references used in the workflow drafts
- `AIRTABLE_BASE_ID`
- `KEYPOINT_APP_BASE_URL`
- `OFFICE_ALERT_WEBHOOK_URL`
- `WHATSAPP_PROVIDER_WEBHOOK_URL`
- `EMAIL_PROVIDER_WEBHOOK_URL`
- `DOCUMENT_OCR_WEBHOOK_URL`
- `AI_REVIEW_WEBHOOK_URL`

## Before activation
- Test every outbound provider endpoint with sample payloads
- Confirm callback/auth requirements for each provider
- Add retry and failure notifications in n8n

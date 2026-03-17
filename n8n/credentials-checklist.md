# KeyPoint n8n credentials checklist

Before enabling workflows in n8n, prepare these values.

## Best path
- Fill in `keypoint.settings.json`
- Run `npm run apply-settings`
- Load values from `n8n/.env.generated`

## Required core values
- Airtable API token
- Airtable Base ID
- KeyPoint app base URL
- Office alert webhook URL
- WhatsApp provider webhook or API endpoint
- Email provider webhook or API endpoint
- OCR/extraction endpoint
- AI review endpoint

## Optional provider values now supported by the settings generator
- SMS provider webhook/API endpoint
- Twilio Account SID / Auth Token
- Twilio WhatsApp sender number
- Twilio SMS sender number
- Email sender address / reply-to / API key
- Google client email / private key / Drive folder / Sheets spreadsheet

## n8n credential names used by the workflow drafts
- `Airtable KeyPoint`

## Before activation
- Test every outbound provider endpoint with sample payloads
- Confirm callback/auth requirements for each provider
- Add retry and failure notifications in n8n
- If using Google or another OAuth-style provider, complete that provider's own consent/credential setup separately

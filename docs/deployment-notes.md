# KeyPoint deployment notes

## Current state
- Local build works
- Cases can load from Airtable through the repository layer
- Portal invite links are signed/stateless
- Uploads still default to local disk unless you connect a storage path
- Single settings file can generate app + n8n env files
- Important deployment blocker: the public domain `keypoint.work` currently resolves to `212.47.64.204`, while the active workspace/app work here is on `72.61.195.165`, so public deployment verification must happen on the actual target host

## Fastest deployment flow
1. Copy `keypoint.settings.example.json` to `keypoint.settings.json`
2. Fill in all real credentials, phone numbers, provider endpoints, and base URLs
3. Run:
   ```bash
   npm run apply-settings
   ```
4. Use:
   - `generated/vercel.env` for Vercel env vars
   - `n8n/.env.generated` for n8n env vars
5. Import the workflow JSON files in `n8n/workflows/`

## Suggested production env vars
These are now generated automatically from the settings file:
- `APP_BASE_URL`
- `KEYPOINT_APP_BASE_URL`
- `PORTAL_INVITE_SECRET`
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`
- `AIRTABLE_CASES_TABLE`
- `AIRTABLE_CLIENTS_TABLE`
- `AIRTABLE_DOCUMENT_LIBRARY_TABLE`
- `AIRTABLE_DOCUMENTS_TABLE`
- `AIRTABLE_BANK_RUNS_TABLE`
- `AIRTABLE_APPRAISERS_TABLE`
- `AIRTABLE_APPRAISAL_JOBS_TABLE`
- `AIRTABLE_ACTIVITY_LOG_TABLE`
- `AIRTABLE_AI_REVIEWS_TABLE`
- `N8N_WEBHOOK_BASE_URL`
- `UPLOAD_DIR`
- `UPLOAD_PUBLIC_BASE_URL`
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

## Domain wiring
In Vercel:
1. Add `keypoint.work`
2. Add `www.keypoint.work`
3. Apply the DNS records Vercel gives you
4. Set the production deployment as the one attached to the domain

## Health checks after deploy
- Home page loads
- `/office` loads
- `/portal` loads
- `/login` loads
- `/api/cases` returns JSON
- invite generation works from the office UI
- invite links open correctly
- upload events hit n8n successfully

## Remaining caveats
- Vercel local disk is not durable storage; use a proper storage path if uploads matter in production
- A VPS with local disk is better for the current upload model, but uploads are still only as durable as that server unless you add backups/object storage
- Some third-party services still require manual credential entry or OAuth consent on their own platform
- Real auth beyond invite-token access is still a future hardening item

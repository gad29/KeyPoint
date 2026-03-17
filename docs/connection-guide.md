# KeyPoint connection guide

This is the practical setup order for wiring KeyPoint end to end.

## 0. First important truth
The app can now generate most of its own env/config files from `keypoint.settings.json`, but it cannot magically create third-party accounts for you.

What Jade can automate:
- app env files
- n8n env files
- consistent endpoint wiring
- Airtable table-name mapping
- internal app behavior that depends on those values

What still requires manual provider-side setup:
- creating an Airtable token
- creating the Airtable base/tables
- creating/filling the Fillout form
- importing workflows into n8n
- verifying WhatsApp/SMS/email providers
- creating Google service-account credentials if you want Google integrations
- choosing a durable storage provider if you do not want local uploads

---

## 1. Airtable

### What it is used for
Airtable is the MVP system of record for operations.

### Tables to create
Create these tables in one base:
- Cases
- Clients
- Document library
- Case documents
- Bank runs
- Appraisers
- Appraisal jobs
- Activity log
- AI reviews

### How to create the token + base ID
1. Open Airtable.
2. Create a base for KeyPoint.
3. Add the tables above.
4. Open Airtable developer settings / personal access tokens.
5. Create a token with access to the KeyPoint base.
6. Copy:
   - the token
   - the base ID

### Where they go
Put them in:
- `airtable.apiKey`
- `airtable.baseId`

inside:
- `apps/keypoint/keypoint.settings.json`

### How table names work
Under `airtable.tables`, put the exact Airtable table names.
If you keep the default names, leave them as-is.

### Why this matters
If the names do not match exactly, the app and workflows will fail when they query/write records.

---

## 2. Fillout

### What it is used for
Fillout is the public intake form.
A new submission should trigger the n8n intake workflow.

### How to connect it
1. Create a Fillout form called something like `KeyPoint Mortgage Intake`.
2. Add the fields described in `docs/fillout-setup.md`.
3. In Fillout, enable webhook delivery.
4. Point the webhook at your n8n workflow-1 webhook URL.
5. Make sure Fillout includes its submission ID in the payload.

### What to map carefully
These matter most:
- full name
- spouse/co-borrower info
- phone
- email
- case type
- borrower profiles
- notes
- submission ID

### Why this matters
The submission ID is the dedupe key. Without it, the same submission can create duplicates.

---

## 3. n8n

### What it is used for
n8n is the automation layer between Fillout, Airtable, invites, uploads, WhatsApp, email, OCR, and AI review.

### How to connect it
1. Open your n8n instance.
2. Import all workflow JSON files from `apps/keypoint/n8n/workflows/`.
3. Create the credential named:
   - `Airtable KeyPoint`
4. After you fill `keypoint.settings.json`, run:
   ```bash
   npm run apply-settings
   ```
5. Copy values from:
   - `apps/keypoint/n8n/.env.generated`
6. Put those values into n8n environment/config.
7. Update any workflow nodes that still require explicit credentials or provider secrets.

### Why this matters
The app itself handles UI + API. n8n handles orchestration and external actions.

---

## 4. Vercel / app deployment

### What it is used for
This hosts the Next.js KeyPoint app.

### How to connect it
1. Create/import the KeyPoint project in Vercel.
2. Set your domain(s):
   - `keypoint.work`
   - `www.keypoint.work`
3. After filling `keypoint.settings.json`, run:
   ```bash
   npm run apply-settings
   ```
4. Open:
   - `apps/keypoint/generated/vercel.env`
5. Copy those values into the Vercel project env settings.
6. Deploy.

### What to test after deploy
- `/`
- `/office`
- `/portal`
- `/login`
- `/api/cases`
- `POST /api/invites`

---

## 5. WhatsApp connection

### What it is used for
For outbound workflow notifications to clients or staff.

### Current model in KeyPoint
KeyPoint currently expects a webhook/API endpoint that n8n can call for WhatsApp sending.
It does **not** directly ship with an official WhatsApp provider SDK wired in.

### How to connect it
You have two main options:

#### Option A: your own WhatsApp provider endpoint
1. Decide the provider/platform you want.
2. Get the provider's outbound webhook/API URL.
3. Put it into one of these:
   - `connections.whatsapp.webhookUrl`
   - or let n8n derive one from `n8n.webhookBaseUrl`
4. Set the sending number in:
   - `connections.whatsapp.fromNumber`

#### Option B: Twilio WhatsApp
1. Create a Twilio account.
2. Enable WhatsApp sending for your number/sender.
3. Copy:
   - Account SID
   - Auth Token
   - WhatsApp sender number
4. Put them in:
   - `connections.twilio.accountSid`
   - `connections.twilio.authToken`
   - `connections.twilio.whatsappFrom`

### Why this matters
The app stores configuration; n8n performs the actual outbound action.

---

## 6. SMS connection

### What it is used for
Fallback or direct SMS notifications.

### How to connect it
If using a webhook/API provider:
- set `connections.sms.webhookUrl`
- set `connections.sms.fromNumber`

If using Twilio:
- set `connections.twilio.accountSid`
- set `connections.twilio.authToken`
- set `connections.twilio.smsFrom`

### Why this matters
SMS is optional, but useful when WhatsApp is unavailable.

---

## 7. Email connection

### What it is used for
Fallback client notifications and office alerts.

### How to connect it
1. Choose your email provider/API.
2. Get:
   - sender email address
   - reply-to address
   - API key or webhook endpoint
3. Put them in:
   - `connections.email.fromAddress`
   - `connections.email.replyTo`
   - `connections.email.apiKey`
   - `connections.email.webhookUrl`

### Why this matters
Workflow 7 expects email fallback capability.

---

## 8. Google connection

### What it is used for
Optional Google Drive / Google Sheets integration.

### How to connect it
1. Create a Google Cloud project.
2. Enable the Google APIs you need.
3. Create a service account.
4. Generate the service-account credentials.
5. Copy:
   - client email
   - private key
6. Put them in:
   - `connections.google.clientEmail`
   - `connections.google.privateKey`
7. If using Drive/Sheets, also add:
   - `connections.google.driveFolderId`
   - `connections.google.sheetsSpreadsheetId`

### Important note
This usually still needs Google-side permissions/sharing as well.
For example, the target Drive folder or Sheet often needs to be shared with the service-account identity.

---

## 9. OCR connection

### What it is used for
Document extraction/review prep.

### How to connect it
1. Choose an OCR provider or internal OCR endpoint.
2. Get its webhook/API endpoint.
3. Put it in:
   - `connections.ocr.webhookUrl`

### Why this matters
The upload-review workflow expects an OCR step, but the OCR engine is intentionally left vendor-neutral.

---

## 10. AI review connection

### What it is used for
Anonymized review/handoff for case analysis.

### How to connect it
1. Decide which AI review service or endpoint will receive the payload.
2. Put its endpoint in:
   - `connections.aiReview.webhookUrl`

### Why this matters
The workflow is designed so the AI step can be swapped without rewriting the app.

---

## 11. Upload/storage connection

### What it is used for
Stores uploaded documents.

### Current default
Right now the app defaults to local storage:
- `storage.mode = local`
- `storage.uploadDir = ./data/uploads`

### Important production note
Local storage is okay for early MVP testing.
It is **not** ideal for production on serverless hosting like Vercel.

### Better production options
- S3-compatible storage
- Vercel Blob
- Supabase Storage
- Google Drive via automation

### Current way to wire it
If another system stores the real file and gives you a public/reference URL, put that path pattern into:
- `storage.uploadPublicBaseUrl`

---

## 12. After you fill the settings file
Run:
```bash
cd /srv/gad-share/apps/keypoint
npm run apply-settings
```

This generates:
- `.env.local`
- `.env.production.local`
- `n8n/.env.generated`
- `generated/vercel.env`
- `generated/connections-summary.md`

---

## 13. Recommended actual order
Do it in this order:
1. Airtable
2. n8n
3. Fillout
4. Vercel deploy
5. WhatsApp/SMS/email provider wiring
6. OCR / AI review
7. storage hardening
8. end-to-end testing

---

## 14. What I should correct in the project next
Best next repo-side improvement:
- add a built-in admin "connection status" screen that checks which envs are present and which are still missing

That would make setup less blind.
